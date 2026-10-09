import { v } from "convex/values"
import { internalAction, internalMutation, internalQuery, mutation } from "./_generated/server"
import { internal } from "./_generated/api"
import { consume } from "./rateLimit"
import { esc, para, sendResend, shell, siteUrl } from "./emailLayout"

const EMAIL_RE = /^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)+$/
const PENDING_TTL_MS = 7 * 24 * 60 * 60 * 1000

const makeToken = () => {
    const bytes = new Uint8Array(24)
    crypto.getRandomValues(bytes)
    return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("") // 48 hex chars
}

const validToken = (t: string) => /^[a-f0-9]{32,128}$/.test(t)

// Public sign-up. Always answers the same way for a valid address, so it never reveals who is already subscribed.
export const subscribe = mutation({
    args: { email: v.string(), source: v.optional(v.string()) },
    handler: async (ctx, args): Promise<{ ok: true } | { ok: false; error: string }> => {
        const email = args.email.trim().toLowerCase()
        if (email.length > 254 || !EMAIL_RE.test(email) || email.split("@")[0].length > 64) {
            return { ok: false, error: "Please enter a valid email address." }
        }
        const source = args.source?.trim().slice(0, 40) || undefined

        const tooBusy = { ok: false, error: "Too many requests. Please try again in a few minutes." } as const
        // Rate-limit on the mailbox, not the spelling: "v+1@gmail.com" and "v.1@gmail.com" reach the same inbox.
        const [local, domain] = email.split("@")
        const canonLocal = ((domain === "gmail.com" || domain === "googlemail.com") ? local.replace(/\./g, "") : local).split("+")[0]
        if (!(await consume(ctx, "newsletter:global", 300, 10 * 60_000))) return tooBusy
        if (!(await consume(ctx, `newsletter:domain:${domain}`, 40, 10 * 60_000))) return tooBusy
        if (!(await consume(ctx, `newsletter:${canonLocal}@${domain === "googlemail.com" ? "gmail.com" : domain}`, 3, 60 * 60_000))) return tooBusy

        const existing = await ctx.db
            .query("newsletterSubscribers")
            .withIndex("by_email", (q) => q.eq("email", email))
            .unique()

        if (existing?.status === "subscribed") return { ok: true }

        // Replace the row (fresh creation time) so the 7-day pending window restarts and any older link stops working.
        if (existing) await ctx.db.delete(existing._id)
        const id = await ctx.db.insert("newsletterSubscribers", {
            email,
            status: "pending",
            token: makeToken(),
            source: source ?? existing?.source,
        })
        await ctx.scheduler.runAfter(0, internal.newsletter.sendConfirm, { id })
        return { ok: true }
    },
})

export const confirm = mutation({
    args: { token: v.string() },
    handler: async (ctx, args): Promise<{ ok: boolean; error?: string }> => {
        if (!validToken(args.token)) return { ok: false, error: "This link is not valid." }
        const row = await ctx.db
            .query("newsletterSubscribers")
            .withIndex("by_token", (q) => q.eq("token", args.token))
            .unique()
        if (!row) return { ok: false, error: "This link is not valid or has expired." }
        if (row.status === "subscribed") return { ok: true }
        if (row.status === "unsubscribed") return { ok: false, error: "This address was unsubscribed. Please sign up again." }
        if (Date.now() - row._creationTime > PENDING_TTL_MS) return { ok: false, error: "This link has expired. Please sign up again." }
        await ctx.db.patch(row._id, { status: "subscribed", subscribedAt: Date.now() })
        return { ok: true }
    },
})

export const unsubscribe = mutation({
    args: { token: v.string() },
    handler: async (ctx, args): Promise<{ ok: boolean; error?: string }> => {
        if (!validToken(args.token)) return { ok: false, error: "This link is not valid." }
        const row = await ctx.db
            .query("newsletterSubscribers")
            .withIndex("by_token", (q) => q.eq("token", args.token))
            .unique()
        if (!row) return { ok: false, error: "This link is not valid or has expired." }
        if (row.status !== "unsubscribed") await ctx.db.patch(row._id, { status: "unsubscribed", unsubscribedAt: Date.now() })
        return { ok: true }
    },
})

export const getForConfirm = internalQuery({
    args: { id: v.id("newsletterSubscribers") },
    handler: async (ctx, args) => {
        const row = await ctx.db.get(args.id)
        if (!row || row.status !== "pending") return null
        return { email: row.email, token: row.token }
    },
})

export const sendConfirm = internalAction({
    args: { id: v.id("newsletterSubscribers") },
    handler: async (ctx, args): Promise<void> => {
        if (!process.env.AUTH_RESEND_KEY || !process.env.AUTH_EMAIL_FROM) {
            console.error("Newsletter confirmation not sent: AUTH_RESEND_KEY / AUTH_EMAIL_FROM missing")
            return
        }
        const row = await ctx.runQuery(internal.newsletter.getForConfirm, { id: args.id })
        if (!row) return
        const url = `${siteUrl()}/newsletter/confirm?token=${encodeURIComponent(row.token)}`
        try {
            await sendResend({
                to: row.email,
                subject: "Confirm your WebflowX subscription",
                html: shell({
                    title: "Confirm your WebflowX subscription",
                    preheader: "One click to confirm and start getting product updates and tips.",
                    heading: "Confirm your subscription",
                    body: para(esc("Thanks for signing up for WebflowX product updates and tips. Please confirm your email address to start receiving them. We only email you after you confirm.")),
                    cta: { label: "Confirm subscription", url },
                    note: `If you didn't sign up, you can ignore this email and nothing will happen. The link expires in 7 days. Already confirmed and want out? Unsubscribe: ${siteUrl()}/newsletter/unsubscribe?token=${encodeURIComponent(row.token)}`,
                }),
                text: `Thanks for signing up for WebflowX product updates and tips.\n\nConfirm your subscription: ${url}\n\nIf you didn't sign up, ignore this email and nothing will happen. The link expires in 7 days.\nUnsubscribe: ${siteUrl()}/newsletter/unsubscribe?token=${encodeURIComponent(row.token)}\nHelp: support@northfoundry.co`,
                tag: "newsletter-confirm",
            })
        } catch (e) {
            console.error("Newsletter confirmation failed:", e)
        }
    },
})

// Unconfirmed sign-ups older than 7 days are removed.
export const prunePending = internalMutation({
    args: {},
    handler: async (ctx) => {
        const cutoff = Date.now() - PENDING_TTL_MS
        const rows = await ctx.db
            .query("newsletterSubscribers")
            .withIndex("by_status", (q) => q.eq("status", "pending").lt("_creationTime", cutoff))
            .take(500)
        for (const row of rows) await ctx.db.delete(row._id)
        return rows.length
    },
})
