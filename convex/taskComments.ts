import { v } from "convex/values"
import { mutation, query } from "./_generated/server"
import { auth } from "./auth"

export const get = query({
    args: { taskId: v.id("tasks") },
    handler: async (ctx, args) => {
        const userId = await auth.getUserId(ctx)
        if (!userId) return []

        const comments = await ctx.db
            .query("taskComments")
            .withIndex("by_task_id", (q) => q.eq("taskId", args.taskId))
            .collect()

        return await Promise.all(comments.map(async (comment) => {
            const member = await ctx.db.get(comment.memberId)
            const user = member ? await ctx.db.get(member.userId) : null
            return { ...comment, member: member ? { ...member, user } : null }
        }))
    }
})

export const create = mutation({
    args: {
        taskId: v.id("tasks"),
        workspaceId: v.id("workspaces"),
        body: v.string(),
    },
    handler: async (ctx, args) => {
        const userId = await auth.getUserId(ctx)
        if (!userId) throw new Error("Unauthorized")

        const member = await ctx.db
            .query("members")
            .withIndex("byWorkspaceId_user_id", (q) =>
                q.eq("workspaceId", args.workspaceId).eq("userId", userId)
            ).unique()

        if (!member) throw new Error("Unauthorized")

        const commentId = await ctx.db.insert("taskComments", {
            taskId: args.taskId,
            workspaceId: args.workspaceId,
            memberId: member._id,
            body: args.body,
        })

        // 👇 Notify task assignee
        const task = await ctx.db.get(args.taskId)
        if (task && task.assigneeId && task.assigneeId !== member._id) {
            await ctx.db.insert("notifications", {
                workspaceId: args.workspaceId,
                recipientId: task.assigneeId,
                senderId: member._id,
                type: "task_comment",
                taskId: args.taskId,
                body: args.body,
                read: false,
            })
        }

        return commentId
    }
})

export const remove = mutation({
    args: { id: v.id("taskComments") },
    handler: async (ctx, args) => {
        const userId = await auth.getUserId(ctx)
        if (!userId) throw new Error("Unauthorized")

        const comment = await ctx.db.get(args.id)
        if (!comment) throw new Error("Comment not found")

        const member = await ctx.db
            .query("members")
            .withIndex("byWorkspaceId_user_id", (q) =>
                q.eq("workspaceId", comment.workspaceId).eq("userId", userId)
            ).unique()

        if (!member) throw new Error("Unauthorized")
        if (comment.memberId !== member._id && member.role !== "admin")
            throw new Error("Unauthorized")

        await ctx.db.delete(args.id)
        return args.id
    }
})