import { v, ConvexError } from "convex/values"
import { internalMutation, mutation, MutationCtx, QueryCtx } from "./_generated/server"
import { Id } from "./_generated/dataModel"
import { auth } from "./auth"
import { requireActor, hasPermission } from "./permissions"
import { PLANS, getPlan } from "./limits"
import { consume } from "./rateLimit"
import { internal } from "./_generated/api"

const MB = 1024 * 1024

// Browsers render these inline, so only formats that cannot carry scripts are accepted as images.
export const IMAGE_TYPES = ["image/png", "image/jpeg", "image/gif", "image/webp", "image/avif"]

// Attachments. HTML, SVG, scripts and executables are deliberately missing.
export const FILE_TYPES = [
    ...IMAGE_TYPES,
    "application/pdf",
    "application/zip", "application/x-zip-compressed",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "application/vnd.ms-powerpoint",
    "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    "text/plain", "text/csv", "text/markdown", "application/json",
    "audio/mpeg", "audio/wav", "audio/mp4", "audio/ogg", "audio/webm",
    "video/mp4", "video/webm", "video/quicktime",
]

export const MAX_IMAGE_BYTES = 10 * MB
export const MAX_FILE_BYTES = 25 * MB
export const MAX_AVATAR_BYTES = 5 * MB

const baseType = (t: string) => t.split(";")[0].trim().toLowerCase()

export const storageCapBytes = (plan?: string) => {
    const mb = PLANS[getPlan(plan)].storageMb
    return mb === -1 ? Infinity : mb * MB
}

type Ctx = QueryCtx | MutationCtx

// Reads what Convex actually stored (not what the browser claimed).
const stored = async (ctx: Ctx, storageId: Id<"_storage">) => {
    const meta = await ctx.db.system.get("_storage", storageId)
    return meta ? { size: meta.size, contentType: baseType(meta.contentType ?? ""), createdAt: meta._creationTime } : null
}

// Only files uploaded moments ago can be registered. Storage ids show up in file URLs, so without this
// someone could "register" (and later delete) a file that was uploaded long ago by somebody else.
const FRESH_MS = 30 * 60 * 1000

const discard = async (ctx: MutationCtx, storageId: Id<"_storage">) => {
    try { await ctx.storage.delete(storageId) } catch { /* already gone */ }
}

// Profile / workspace photos: must be a small real image that THIS user uploaded as an avatar.
// Throws otherwise (register already rejected bad files; this is the second line of defence).
export const assertPhoto = async (ctx: MutationCtx, storageId: Id<"_storage">, userId: Id<"users">) => {
    const row = await ctx.db.query("files").withIndex("by_storage_id", (q) => q.eq("storageId", storageId)).unique()
    if (!row || row.kind !== "avatar" || row.uploadedBy !== userId) {
        throw new ConvexError("That photo isn't valid. Please upload it again.")
    }
    const meta = await stored(ctx, storageId)
    if (!meta) throw new ConvexError("We couldn't read that upload. Please try again.")
    if (!IMAGE_TYPES.includes(meta.contentType)) throw new ConvexError("Photos must be PNG, JPG, GIF, WebP or AVIF")
    if (meta.size > MAX_AVATAR_BYTES) throw new ConvexError("Photos must be under 5 MB")
}

// Step 1: before the browser uploads, check the member may upload and the workspace has room.
export const generateUploadUrl = mutation({
    args: { workspaceId: v.optional(v.id("workspaces")) },
    handler: async (ctx, args) => {
        const userId = await auth.getUserId(ctx)
        if (!userId) throw new ConvexError("Please sign in")
        if (!(await consume(ctx, `upload:${userId}`, 40, 60_000))) {
            throw new ConvexError("You're uploading too quickly. Wait a moment and try again.")
        }
        if (args.workspaceId) {
            const { workspace, member } = await requireActor(ctx, args.workspaceId)
            if (!hasPermission(workspace, member, "uploadFiles")) {
                throw new ConvexError("You don't have permission to upload files here")
            }
            if ((workspace.storageBytes ?? 0) >= storageCapBytes(workspace.plan)) {
                throw new ConvexError("This workspace is out of storage. An admin can free space or upgrade the plan.")
            }
        }
        return await ctx.storage.generateUploadUrl()
    },
})

// Step 2: after uploading, register the file. This is where size, type, ownership and the storage cap are enforced.
// A mutation that throws is rolled back (including a storage delete), so refusals are RETURNED after the
// bad upload is deleted; the browser turns `{ ok: false }` into an error message.
export const register = mutation({
    args: {
        storageId: v.id("_storage"),
        workspaceId: v.optional(v.id("workspaces")),
        kind: v.union(v.literal("image"), v.literal("file"), v.literal("doc"), v.literal("avatar")),
    },
    handler: async (ctx, args) => {
        const userId = await auth.getUserId(ctx)
        if (!userId) throw new ConvexError("Please sign in")

        const reject = async (error: string) => {
            await discard(ctx, args.storageId)
            return { ok: false as const, error }
        }

        // Registering twice must never count the bytes twice, and nobody can take over someone else's file.
        const existing = await ctx.db.query("files").withIndex("by_storage_id", (q) => q.eq("storageId", args.storageId)).unique()
        if (existing) {
            if (existing.uploadedBy !== userId) throw new ConvexError("That upload isn't yours")
            return { ok: true as const, storageId: existing.storageId, size: existing.size, contentType: existing.contentType }
        }

        const meta = await stored(ctx, args.storageId)
        if (!meta) throw new ConvexError("We couldn't read that upload. Please try again.")
        // too old to be a fresh upload: could be somebody else's file, so it is NOT deleted
        if (Date.now() - meta.createdAt > FRESH_MS) throw new ConvexError("That upload is too old to attach. Please upload it again.")

        // every non-photo file is stored against a workspace so it counts toward that workspace's plan cap
        if (args.kind === "avatar" ? !!args.workspaceId : !args.workspaceId) return await reject("That upload isn't valid. Please try again.")
        if (args.kind === "avatar" && !(await consume(ctx, `avatar:${userId}`, 10, 60 * 60_000))) {
            return await reject("You've changed photos a lot just now. Please try again later.")
        }

        const wantsImage = args.kind !== "file"
        const allowed = wantsImage ? IMAGE_TYPES : FILE_TYPES
        const max = args.kind === "avatar" ? MAX_AVATAR_BYTES : wantsImage ? MAX_IMAGE_BYTES : MAX_FILE_BYTES
        if (!allowed.includes(meta.contentType)) {
            return await reject(wantsImage ? "Images must be PNG, JPG, GIF, WebP or AVIF" : "That file type isn't allowed")
        }
        if (meta.size > max) return await reject(`That file is too large (max ${Math.round(max / MB)} MB)`)

        if (args.workspaceId) {
            const actor = await requireActor(ctx, args.workspaceId).catch(() => null)
            if (!actor) return await reject("You are not a member of this workspace")
            const { workspace, member } = actor
            if (!hasPermission(workspace, member, "uploadFiles")) return await reject("You don't have permission to upload files here")
            const used = workspace.storageBytes ?? 0
            if (used + meta.size > storageCapBytes(workspace.plan)) {
                return await reject("This workspace is out of storage. An admin can free space or upgrade the plan.")
            }
            await ctx.db.patch(args.workspaceId, { storageBytes: used + meta.size })
        }

        await ctx.db.insert("files", {
            workspaceId: args.workspaceId,
            storageId: args.storageId,
            uploadedBy: userId,
            kind: args.kind,
            size: meta.size,
            contentType: meta.contentType,
            attached: args.kind === "doc" || args.kind === "avatar" ? true : undefined,
        })
        return { ok: true as const, storageId: args.storageId, size: meta.size, contentType: meta.contentType }
    },
})

// Used by messages: the file must have been registered for this workspace by the sender, and not used yet.
export const claim = async (ctx: MutationCtx, storageId: Id<"_storage">, workspaceId: Id<"workspaces">, userId: Id<"users">) => {
    const row = await ctx.db.query("files").withIndex("by_storage_id", (q) => q.eq("storageId", storageId)).unique()
    if (!row || row.workspaceId !== workspaceId || row.uploadedBy !== userId || row.attached) {
        throw new ConvexError("That attachment isn't valid. Please upload it again.")
    }
    await ctx.db.patch(row._id, { attached: true })
    return row
}

// Delete a stored file and give the space back to the workspace.
export const release = async (ctx: MutationCtx, storageId: Id<"_storage">) => {
    const row = await ctx.db.query("files").withIndex("by_storage_id", (q) => q.eq("storageId", storageId)).unique()
    if (row) {
        if (row.workspaceId) {
            const ws = await ctx.db.get(row.workspaceId)
            if (ws) await ctx.db.patch(ws._id, { storageBytes: Math.max(0, (ws.storageBytes ?? 0) - row.size) })
        }
        await ctx.db.delete(row._id)
    }
    await discard(ctx, storageId)
}

// Uploads that were never attached to anything (abandoned drafts) are removed after a day.
export const cleanupUnattached = internalMutation({
    args: {},
    handler: async (ctx) => {
        const cutoff = Date.now() - 24 * 60 * 60 * 1000
        const rows = await ctx.db.query("files").withIndex("by_attached_creation", (q) => q.eq("attached", undefined)).take(100)
        for (const row of rows) {
            if (row._creationTime < cutoff) await release(ctx, row.storageId)
        }
    },
})


// Uploads that were never registered at all (someone POSTed to an upload URL and walked away) are deleted
// after an hour. Only uploads made after the registered-upload pipeline existed are touched, so older
// attachments that predate the `files` table are never swept.
const SWEEP_AFTER = Date.UTC(2026, 9, 8)

export const sweepOrphans = internalMutation({
    args: { before: v.optional(v.number()) },
    handler: async (ctx, args) => {
        const cutoff = Date.now() - 60 * 60 * 1000
        const upper = Math.min(cutoff, args.before ?? cutoff)
        const BATCH = 200
        const batch = await ctx.db.system
            .query("_storage")
            .order("desc")
            .filter((q) => q.and(q.lt(q.field("_creationTime"), upper), q.gte(q.field("_creationTime"), SWEEP_AFTER)))
            .take(BATCH)
        let removed = 0
        for (const f of batch) {
            const row = await ctx.db.query("files").withIndex("by_storage_id", (q) => q.eq("storageId", f._id)).unique()
            if (!row) {
                await discard(ctx, f._id)
                removed++
            }
        }
        // a flood of junk uploads can't outrun the cleanup: keep going down the list until it is exhausted
        if (batch.length === BATCH) {
            await ctx.scheduler.runAfter(0, internal.files.sweepOrphans, { before: batch[batch.length - 1]._creationTime })
        }
        return removed
    },
})
