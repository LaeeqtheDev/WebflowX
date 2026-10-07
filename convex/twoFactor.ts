import { v } from "convex/values"
import { mutation, query, internalMutation, MutationCtx, QueryCtx } from "./_generated/server"
import { Doc, Id } from "./_generated/dataModel"
import { rawAuth } from "./auth"
import { getAuthSessionId } from "@convex-dev/auth/server"
import { consume } from "./rateLimit"

// ---- TOTP (RFC 6238): 6 digits, 30 second steps, SHA-1, as used by every authenticator app ----

const B32 = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567"
const STEP_MS = 30_000

function b32encode(bytes: Uint8Array): string {
    let bits = 0, value = 0, out = ""
    for (const b of bytes) {
        value = (value << 8) | b
        bits += 8
        while (bits >= 5) {
            out += B32[(value >>> (bits - 5)) & 31]
            bits -= 5
        }
    }
    if (bits > 0) out += B32[(value << (5 - bits)) & 31]
    return out
}

function b32decode(s: string): Uint8Array {
    let bits = 0, value = 0
    const out: number[] = []
    for (const ch of s.replace(/=+$/, "").toUpperCase()) {
        const idx = B32.indexOf(ch)
        if (idx < 0) continue
        value = (value << 5) | idx
        bits += 5
        if (bits >= 8) {
            out.push((value >>> (bits - 8)) & 255)
            bits -= 8
        }
    }
    return new Uint8Array(out)
}

async function hotp(secret: Uint8Array, counter: number): Promise<string> {
    const msg = new Uint8Array(8)
    let c = counter
    for (let i = 7; i >= 0; i--) {
        msg[i] = c & 255
        c = Math.floor(c / 256)
    }
    const key = await crypto.subtle.importKey("raw", secret as BufferSource, { name: "HMAC", hash: "SHA-1" }, false, ["sign"])
    const mac = new Uint8Array(await crypto.subtle.sign("HMAC", key, msg as BufferSource))
    const offset = mac[mac.length - 1] & 15
    const bin =
        ((mac[offset] & 127) << 24) | (mac[offset + 1] << 16) | (mac[offset + 2] << 8) | mac[offset + 3]
    return String(bin % 1_000_000).padStart(6, "0")
}

// Returns the 30-second step the code belongs to (within one step either side of now), or null.
async function matchTotp(secretB32: string, code: string): Promise<number | null> {
    if (!/^\d{6}$/.test(code)) return null
    const secret = b32decode(secretB32)
    const now = Math.floor(Date.now() / STEP_MS)
    let found: number | null = null
    // check all three so timing doesn't reveal which step matched
    for (const step of [now - 1, now, now + 1]) {
        if ((await hotp(secret, step)) === code && found === null) found = step
    }
    return found
}

// ---- secret at rest ----
// With TWO_FACTOR_KEY set (any long random string) secrets are stored AES-GCM encrypted ("enc1:" prefix).
// Without it they stay readable as before, so nothing breaks before the key is added. Old plain secrets are
// encrypted the next time their owner signs in with a code.
const ENC = "enc1:"
const toB64 = (b: Uint8Array) => btoa(String.fromCharCode(...b))
const fromB64 = (s: string) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0))

async function aesKey(): Promise<CryptoKey | null> {
    const raw = process.env.TWO_FACTOR_KEY
    if (!raw) return null
    const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(raw))
    return crypto.subtle.importKey("raw", digest, { name: "AES-GCM" }, false, ["encrypt", "decrypt"])
}

async function sealSecret(plain: string): Promise<string> {
    const key = await aesKey()
    if (!key) return plain
    const iv = crypto.getRandomValues(new Uint8Array(12))
    const ct = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, new TextEncoder().encode(plain)))
    const out = new Uint8Array(iv.length + ct.length)
    out.set(iv); out.set(ct, iv.length)
    return ENC + toB64(out)
}

async function openSecret(stored: string): Promise<string> {
    if (!stored.startsWith(ENC)) return stored
    const key = await aesKey()
    if (!key) throw new Error("TWO_FACTOR_KEY is missing")
    const data = fromB64(stored.slice(ENC.length))
    const pt = await crypto.subtle.decrypt({ name: "AES-GCM", iv: data.slice(0, 12) }, key, data.slice(12))
    return new TextDecoder().decode(pt)
}

async function sha256(text: string): Promise<string> {
    const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text))
    return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("")
}

const BACKUP_ALPHABET = "abcdefghjkmnpqrstuvwxyz23456789" // no look-alikes

function newBackupCode(): string {
    const bytes = new Uint8Array(10)
    crypto.getRandomValues(bytes)
    const chars = Array.from(bytes).map((b) => BACKUP_ALPHABET[b % BACKUP_ALPHABET.length])
    return chars.slice(0, 5).join("") + "-" + chars.slice(5).join("")
}

const normaliseBackup = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "")

async function makeBackupCodes() {
    const plain = Array.from({ length: 10 }, newBackupCode)
    const hashes = await Promise.all(plain.map((c) => sha256(normaliseBackup(c))))
    return { plain, hashes }
}

// ---- helpers ----

async function getRow(ctx: QueryCtx | MutationCtx, userId: Id<"users">) {
    return await ctx.db.query("twoFactor").withIndex("by_user_id", (q) => q.eq("userId", userId)).unique()
}

async function markSessionVerified(ctx: MutationCtx, userId: Id<"users">) {
    const sessionId = await getAuthSessionId(ctx)
    if (!sessionId) return
    const existing = await ctx.db.query("twoFactorSessions").withIndex("by_session_id", (q) => q.eq("sessionId", sessionId)).first()
    if (!existing) await ctx.db.insert("twoFactorSessions", { userId, sessionId, verifiedAt: Date.now() })
}

// Accepts an authenticator code or an unused backup code. Spends it on success.
async function checkCode(ctx: MutationCtx, row: Doc<"twoFactor">, raw: string): Promise<boolean> {
    const code = raw.trim()
    const plainSecret = await openSecret(row.secret)
    const step = await matchTotp(plainSecret, code.replace(/\s/g, ""))
    if (step !== null) {
        if (row.lastStep !== undefined && step <= row.lastStep) return false // already used
        // upgrade an old plain-text secret to the encrypted form while we have it
        const upgrade = row.secret.startsWith(ENC) ? {} : { secret: await sealSecret(plainSecret) }
        await ctx.db.patch(row._id, { lastStep: step, ...upgrade })
        return true
    }
    const norm = normaliseBackup(code)
    if (norm.length === 10) {
        const hash = await sha256(norm)
        if (row.backupCodes.includes(hash)) {
            await ctx.db.patch(row._id, { backupCodes: row.backupCodes.filter((h) => h !== hash) })
            return true
        }
    }
    return false
}

const TOO_MANY = "Too many attempts. Wait a few minutes and try again."

// ---- public functions ----

// What the app needs to decide whether to show the code screen.
export const status = query({
    args: {},
    handler: async (ctx) => {
        const userId = await rawAuth.getUserId(ctx)
        if (!userId) return null
        const row = await getRow(ctx, userId)
        const enabled = !!row?.enabled
        let verified = true
        if (enabled) {
            const sessionId = await getAuthSessionId(ctx)
            const passed = sessionId
                ? await ctx.db.query("twoFactorSessions").withIndex("by_session_id", (q) => q.eq("sessionId", sessionId)).first()
                : null
            verified = !!passed
        }
        return { enabled, verified, backupCodesLeft: enabled ? row!.backupCodes.length : 0 }
    },
})

// Starts setup: makes a fresh secret and returns it with the otpauth link for the QR code.
export const beginSetup = mutation({
    args: {},
    handler: async (ctx) => {
        const userId = await rawAuth.getUserId(ctx)
        if (!userId) return { error: "Please sign in again" as const }
        const row = await getRow(ctx, userId)
        if (row?.enabled) return { error: "Two-step verification is already on" as const }

        const bytes = new Uint8Array(20)
        crypto.getRandomValues(bytes)
        const secret = b32encode(bytes)
        const stored = await sealSecret(secret)
        if (row) await ctx.db.patch(row._id, { secret: stored, backupCodes: [], lastStep: undefined })
        else await ctx.db.insert("twoFactor", { userId, secret: stored, enabled: false, backupCodes: [] })

        const user = await ctx.db.get(userId)
        const label = encodeURIComponent(`WebflowX:${user?.email ?? user?.name ?? "account"}`)
        const uri = `otpauth://totp/${label}?secret=${secret}&issuer=WebflowX&algorithm=SHA1&digits=6&period=30`
        return { secret, uri }
    },
})

// Checks the first code from the app, switches 2FA on and hands out the backup codes (shown once).
export const confirmSetup = mutation({
    args: { code: v.string() },
    handler: async (ctx, args) => {
        const userId = await rawAuth.getUserId(ctx)
        if (!userId) return { error: "Please sign in again" }
        if (!(await consume(ctx, `2fa:${userId}`, 8, 10 * 60_000))) return { error: TOO_MANY }
        const row = await getRow(ctx, userId)
        if (!row) return { error: "Start the setup again" }
        if (row.enabled) return { error: "Two-step verification is already on" }

        const step = await matchTotp(await openSecret(row.secret), args.code.replace(/\s/g, ""))
        if (step === null) return { error: "That code didn't match. Check the code in your app and try again." }

        const { plain, hashes } = await makeBackupCodes()
        await ctx.db.patch(row._id, { enabled: true, backupCodes: hashes, lastStep: step })
        await markSessionVerified(ctx, userId)
        return { backupCodes: plain }
    },
})

// The code screen after signing in.
export const verify = mutation({
    args: { code: v.string() },
    handler: async (ctx, args) => {
        const userId = await rawAuth.getUserId(ctx)
        if (!userId) return { ok: false, error: "Please sign in again" }
        if (!(await consume(ctx, `2fa:${userId}`, 8, 10 * 60_000))) return { ok: false, error: TOO_MANY }
        const row = await getRow(ctx, userId)
        if (!row?.enabled) return { ok: true }
        if (!(await checkCode(ctx, row, args.code))) {
            return { ok: false, error: "That code didn't work. Try the latest code, or use a backup code." }
        }
        await markSessionVerified(ctx, userId)
        return { ok: true }
    },
})

export const disable = mutation({
    args: { code: v.string() },
    handler: async (ctx, args) => {
        const userId = await rawAuth.getUserId(ctx)
        if (!userId) return { ok: false, error: "Please sign in again" }
        if (!(await consume(ctx, `2fa:${userId}`, 8, 10 * 60_000))) return { ok: false, error: TOO_MANY }
        const row = await getRow(ctx, userId)
        if (!row?.enabled) return { ok: true }
        // someone in a workspace that requires two-step verification can't switch it off
        const memberships = await ctx.db.query("members").withIndex("byUserId", (q) => q.eq("userId", userId)).take(200)
        for (const m of memberships) {
            const ws = await ctx.db.get(m.workspaceId)
            if (ws?.require2fa) return { ok: false, error: `"${ws.name}" requires two-step verification, so it can't be turned off while you're a member.` }
        }
        if (!(await checkCode(ctx, row, args.code))) return { ok: false, error: "That code didn't work." }
        const sessions = await ctx.db.query("twoFactorSessions").withIndex("by_user_id", (q) => q.eq("userId", userId)).take(200)
        for (const s of sessions) await ctx.db.delete(s._id)
        await ctx.db.delete(row._id)
        return { ok: true }
    },
})

export const regenerateBackupCodes = mutation({
    args: { code: v.string() },
    handler: async (ctx, args) => {
        const userId = await rawAuth.getUserId(ctx)
        if (!userId) return { error: "Please sign in again" }
        if (!(await consume(ctx, `2fa:${userId}`, 8, 10 * 60_000))) return { error: TOO_MANY }
        const row = await getRow(ctx, userId)
        if (!row?.enabled) return { error: "Two-step verification is off" }
        if (!(await checkCode(ctx, row, args.code))) return { error: "That code didn't work." }
        const { plain, hashes } = await makeBackupCodes()
        await ctx.db.patch(row._id, { backupCodes: hashes })
        return { backupCodes: plain }
    },
})

// Pass marks are only useful while the sign-in session exists; clear out old ones daily.
export const pruneSessions = internalMutation({
    args: {},
    handler: async (ctx) => {
        const cutoff = Date.now() - 45 * 24 * 60 * 60 * 1000
        const rows = await ctx.db.query("twoFactorSessions").take(500)
        for (const r of rows) {
            if (r.verifiedAt < cutoff) await ctx.db.delete(r._id)
        }
    },
})
