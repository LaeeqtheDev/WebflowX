import { v, ConvexError } from "convex/values"
import { internalMutation, mutation, MutationCtx, QueryCtx } from "./_generated/server"
import { Id } from "./_generated/dataModel"
import { auth } from "./auth"
import { requireActor, hasPermission } from "./permissions"
import { PLANS, getPlan } from "./limits"
import { consume } from "./rateLimit"

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
    return meta ? { size: meta.size, contentType: baseType(meta.contentType ?? "") } : null
}

const discard = async (ctx: MutationCtx, storageId: Id<"_storage">) => {
    try { await ctx.storage.delete(storageId) } catch { /* already gone */ }
}

// Profile / workspace photos: must be a small real image. Throws (and deletes the upload) otherwise.
export const assertPhoto = async (ctx: MutationCtx, storageId: Id<"_storage">) => {
    const meta = await stored(ctx, storageId)
    if (!meta) throw new ConvexError("We couldn't read that upload. Please try again.")
    if (!IMAGE_TYPES.includes(meta.contentType)) {
        await discard(ctx, storageId)
        throw new ConvexError("Photos must be PNG, JPG, GIF, WebP or AVIF")
    }
    if (meta.size > MAX_AVATAR_BYTES) {
        await discard(ctx, storageId)
        throw new ConvexError("Photos must be under 5 MB")
    }
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

// Step 2: after uploading, register the file. This is where size, type and the storage cap are enforced.
export const register = mutation({
    args: {
        storageId: v.id("_storage"),
        workspaceId: v.optional(v.id("workspaces")),
        kind: v.union(v.literal("image"), v.literal("file"), v.literal("doc"), v.literal("avatar")),
    },
    handler: async (ctx, args) => {
        const userId = await auth.getUserId(ctx)
        if (!userId) {
            await discard(ctx, args.storageId)
            throw new ConvexError("Please sign in")
        }
        const meta = await stored(ctx, args.storageId)
        if (!meta) throw new ConvexError("We couldn't read that upload. Please try again.")

        const wantsImage = args.kind !== "file"
        const allowed = wantsImage ? IMAGE_TYPES : FILE_TYPES
        const max = args.kind === "avatar" ? MAX_AVATAR_BYTES : wantsImage ? MAX_IMAGE_BYTES : MAX_FILE_BYTES
        if (!allowed.includes(meta.contentType)) {
            await discard(ctx, args.storageId)
            throw new ConvexError(wantsImage ? "Images must be PNG, JPG, GIF, WebP or AVIF" : "That file type isn't allowed")
        }
        if (meta.size > max) {
            await discard(ctx, args.storageId)
            throw new ConvexError(`That file is too large (max ${Math.round(max / MB)} MB)`)
        }

        if (args.workspaceId) {
            const { workspace } = await requireActor(ctx, args.workspaceId).catch(async (e) => {
                await discard(ctx, args.storageId)
                throw e
            })
            const used = workspace.storageBytes ?? 0
            if (used + meta.size > storageCapBytes(workspace.plan)) {
                await discard(ctx, args.storageId)
                throw new ConvexError("This workspace is out of storage. An admin can free space or upgrade the plan.")
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
        return { storageId: args.storageId, size: meta.size, contentType: meta.contentType }
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
