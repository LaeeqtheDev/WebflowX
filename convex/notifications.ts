import { v } from "convex/values"
import { mutation, query, internalMutation, MutationCtx } from "./_generated/server"
import { Doc, Id } from "./_generated/dataModel"
import { internal } from "./_generated/api"
import { auth } from "./auth"
import { canAccessChannel } from "./permissions"

// Types that are worth an email when the person hasn't looked at them yet.
const EMAILED = new Set<Doc<"notifications">["type"]>(["mention", "dm_received", "thread_reply", "task_assigned", "task_comment", "task_due"])
const PUSHED = EMAILED
// Wait a few minutes first: if they open the app and read it, no email is sent.
const EMAIL_DELAY_MS = 4 * 60 * 1000

// The one place notifications are created. Also schedules the "you have unread activity" email.
export async function notify(
    ctx: MutationCtx,
    doc: Omit<Doc<"notifications">, "_id" | "_creationTime">,
    opts: { email?: boolean } = {}
): Promise<Id<"notifications">> {
    const id = await ctx.db.insert("notifications", doc)
    // phone / desktop push right away (skipped when the person is looking at the app, or push isn't configured)
    if (PUSHED.has(doc.type) && process.env.VAPID_PRIVATE_KEY) {
        await ctx.scheduler.runAfter(0, internal.pushSend.send, { notificationId: id })
    }
    if (opts.email !== false && EMAILED.has(doc.type)) {
        await ctx.scheduler.runAfter(EMAIL_DELAY_MS, internal.emails.sendNotification, { notificationId: id })
    }
    return id
}

const typeValidator = v.union(
    v.literal("thread_reply"),
    v.literal("reaction"),
    v.literal("task_assigned"),
    v.literal("task_comment"),
    v.literal("note_added"),
    v.literal("dm_received"),
    v.literal("mention"),
    v.literal("task_due")
)

export const get = query({
    args: { workspaceId: v.id("workspaces") },
    handler: async (ctx, args) => {
        const userId = await auth.getUserId(ctx)
        if (!userId) return []

        const member = await ctx.db
            .query("members")
            .withIndex("byWorkspaceId_user_id", (q) =>
                q.eq("workspaceId", args.workspaceId).eq("userId", userId)
            ).unique()

        if (!member) return []

        const notifications = await ctx.db
            .query("notifications")
            .withIndex("by_workspace_recipient", (q) =>
                q.eq("workspaceId", args.workspaceId).eq("recipientId", member._id)
            )
            .order("desc")
            .take(50)

        const workspace = await ctx.db.get(args.workspaceId)
        const visible = []
        for (const n of notifications) {
            if (n.channelId && workspace) {
                const ch = await ctx.db.get(n.channelId)
                if (ch && !canAccessChannel(workspace, member, ch)) continue
            }
            visible.push(n)
        }

        return await Promise.all(visible.map(async (n) => {
            const sender = await ctx.db.get(n.senderId)
            const senderUser = sender ? await ctx.db.get(sender.userId) : null
            return {
                ...n,
                sender: sender ? { ...sender, user: senderUser } : null
            }
        }))
    }
})

export const getUnreadCount = query({
    args: { workspaceId: v.id("workspaces") },
    handler: async (ctx, args) => {
        const userId = await auth.getUserId(ctx)
        if (!userId) return 0

        const member = await ctx.db
            .query("members")
            .withIndex("byWorkspaceId_user_id", (q) =>
                q.eq("workspaceId", args.workspaceId).eq("userId", userId)
            ).unique()

        if (!member) return 0

        const unread = await ctx.db
            .query("notifications")
            .withIndex("by_recipient_read", (q) =>
                q.eq("recipientId", member._id).eq("read", false)
            )
            .take(100)

        return unread.length
    }
})

// Internal only: a public version let anyone send notifications as anybody.
export const create = internalMutation({
    args: {
        workspaceId: v.id("workspaces"),
        recipientId: v.id("members"),
        senderId: v.id("members"),
        type: typeValidator,
        messageId: v.optional(v.id("messages")),
        taskId: v.optional(v.id("tasks")),
        noteId: v.optional(v.id("notes")),
        channelId: v.optional(v.id("channels")),
        conversationId: v.optional(v.id("conversations")),
        body: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        // Never notify yourself
        if (args.recipientId === args.senderId) return null

        return await notify(ctx, { ...args, read: false })
    }
})

export const markRead = mutation({
    args: { id: v.id("notifications") },
    handler: async (ctx, args) => {
        const userId = await auth.getUserId(ctx)
        if (!userId) throw new Error("Unauthorized")

        const notification = await ctx.db.get(args.id)
        if (!notification) throw new Error("Notification not found")

        const member = await ctx.db
            .query("members")
            .withIndex("byWorkspaceId_user_id", (q) =>
                q.eq("workspaceId", notification.workspaceId).eq("userId", userId)
            ).unique()
        if (!member || member._id !== notification.recipientId) throw new Error("Unauthorized")

        await ctx.db.patch(args.id, { read: true })
        return args.id
    }
})

export const markAllRead = mutation({
    args: { workspaceId: v.id("workspaces") },
    handler: async (ctx, args) => {
        const userId = await auth.getUserId(ctx)
        if (!userId) throw new Error("Unauthorized")

        const member = await ctx.db
            .query("members")
            .withIndex("byWorkspaceId_user_id", (q) =>
                q.eq("workspaceId", args.workspaceId).eq("userId", userId)
            ).unique()

        if (!member) throw new Error("Unauthorized")

        const unread = await ctx.db
            .query("notifications")
            .withIndex("by_recipient_read", (q) =>
                q.eq("recipientId", member._id).eq("read", false)
            )
            .take(500)

        await Promise.all(unread.map(n => ctx.db.patch(n._id, { read: true })))
        return unread.length
    }
})

export const clearAll = mutation({
    args: { workspaceId: v.id("workspaces") },
    handler: async (ctx, args) => {
        const userId = await auth.getUserId(ctx)
        if (!userId) throw new Error("Unauthorized")

        const member = await ctx.db
            .query("members")
            .withIndex("byWorkspaceId_user_id", (q) =>
                q.eq("workspaceId", args.workspaceId).eq("userId", userId)
            ).unique()

        if (!member) throw new Error("Unauthorized")

        const all = await ctx.db
            .query("notifications")
            .withIndex("by_workspace_recipient", (q) =>
                q.eq("workspaceId", args.workspaceId).eq("recipientId", member._id)
            )
            .take(500)

        await Promise.all(all.map(n => ctx.db.delete(n._id)))
        return all.length
    }
})