import { v } from "convex/values"
import { mutation, query } from "./_generated/server"
import { auth } from "./auth"

const typeValidator = v.union(
    v.literal("thread_reply"),
    v.literal("reaction"),
    v.literal("task_assigned"),
    v.literal("task_comment"),
    v.literal("note_added"),
    v.literal("dm_received")
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

        return await Promise.all(notifications.map(async (n) => {
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
            .collect()

        return unread.length
    }
})

export const create = mutation({
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

        return await ctx.db.insert("notifications", {
            ...args,
            read: false,
        })
    }
})

export const markRead = mutation({
    args: { id: v.id("notifications") },
    handler: async (ctx, args) => {
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
            .collect()

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
            .collect()

        await Promise.all(all.map(n => ctx.db.delete(n._id)))
        return all.length
    }
})