import { v } from "convex/values"
import { query, internalMutation } from "./_generated/server"
import { Doc, Id } from "./_generated/dataModel"
import { internal } from "./_generated/api"
import { auth } from "./auth"
import { canAccessChannel, assert2fa } from "./permissions"

const LIMIT = 100

// Files and images shared in this workspace, newest first, only from places the caller can open.
export const list = query({
    args: { workspaceId: v.id("workspaces"), search: v.optional(v.string()) },
    handler: async (ctx, args) => {
        const userId = await auth.getUserId(ctx)
        if (!userId) return null
        const me = await ctx.db
            .query("members")
            .withIndex("byWorkspaceId_user_id", (q) => q.eq("workspaceId", args.workspaceId).eq("userId", userId))
            .unique()
        if (me) await assert2fa(ctx, me)
        const workspace = await ctx.db.get(args.workspaceId)
        if (!me || !workspace) return null

        const term = args.search?.trim().slice(0, 80)
        const rows: Doc<"attachments">[] = term
            ? await ctx.db.query("attachments").withSearchIndex("search_name", (q) => q.search("name", term).eq("workspaceId", args.workspaceId)).take(200)
            : await ctx.db.query("attachments").withIndex("by_workspace_id", (q) => q.eq("workspaceId", args.workspaceId)).order("desc").take(300)

        const channelOk = new Map<string, Doc<"channels"> | null>()
        const convOk = new Map<string, Doc<"conversations"> | null>()
        const out = []
        for (const a of rows) {
            if (out.length >= LIMIT) break
            let where = ""
            let otherMemberId: Id<"members"> | undefined
            if (a.channelId) {
                if (!channelOk.has(a.channelId)) {
                    const ch = await ctx.db.get(a.channelId)
                    channelOk.set(a.channelId, ch && canAccessChannel(workspace, me, ch) ? ch : null)
                }
                const ch = channelOk.get(a.channelId)
                if (!ch) continue
                where = `#${ch.name}`
            } else if (a.conversationId) {
                if (!convOk.has(a.conversationId)) {
                    const c = await ctx.db.get(a.conversationId)
                    convOk.set(a.conversationId, c && me.role !== "guest" && (c.memberOneId === me._id || c.memberTwoId === me._id) ? c : null)
                }
                const c = convOk.get(a.conversationId)
                if (!c) continue
                otherMemberId = c.memberOneId === me._id ? c.memberTwoId : c.memberOneId
                where = "Direct message"
            } else continue

            const message = await ctx.db.get(a.messageId)
            if (!message) continue
            const url = await ctx.storage.getUrl(a.storageId)
            if (!url) continue
            const uploader = await ctx.db.get(a.memberId)
            const uploaderUser = uploader ? await ctx.db.get(uploader.userId) : null
            out.push({
                _id: a._id,
                messageId: a.messageId,
                parentMessageId: message.parentMessagesId,
                kind: a.kind,
                name: a.name,
                contentType: a.contentType,
                size: a.size,
                url,
                createdAt: a._creationTime,
                uploaderName: uploaderUser?.name ?? "Member",
                where,
                channelId: a.channelId,
                otherMemberId,
            })
        }
        return out
    },
})

// One-time: add Files-page rows for attachments that were sent before the Files page existed.
// Run with: npx convex run attachments:backfill   (add --prod for production). Safe to run twice.
export const backfill = internalMutation({
    args: { cursor: v.optional(v.string()) },
    handler: async (ctx, args) => {
        const page = await ctx.db.query("messages").paginate({ numItems: 100, cursor: args.cursor ?? null })
        for (const m of page.page) {
            if (!m.image && !m.file) continue
            const existing = await ctx.db.query("attachments").withIndex("by_message_id", (q) => q.eq("messageId", m._id)).first()
            if (existing) continue
            for (const [kind, storageId] of [["image", m.image], ["file", m.file]] as const) {
                if (!storageId) continue
                const row = await ctx.db.query("files").withIndex("by_storage_id", (q) => q.eq("storageId", storageId)).unique()
                await ctx.db.insert("attachments", {
                    workspaceId: m.workspaceId,
                    messageId: m._id,
                    memberId: m.memberId,
                    channelId: m.channelId,
                    conversationId: m.conversationId,
                    kind,
                    name: kind === "file" ? (m.fileName ?? "file") : (m.imageName ?? "Image"),
                    contentType: kind === "file" ? (m.fileType ?? row?.contentType ?? "application/octet-stream") : (row?.contentType ?? "image/png"),
                    size: kind === "file" ? (m.fileSize ?? row?.size ?? 0) : (row?.size ?? 0),
                    storageId,
                })
            }
        }
        if (!page.isDone) await ctx.scheduler.runAfter(0, internal.attachments.backfill, { cursor: page.continueCursor })
        return { scanned: page.page.length, done: page.isDone }
    },
})
