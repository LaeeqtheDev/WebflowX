import { v } from "convex/values"
import { notify } from "./notifications"
import { mutation, query } from "./_generated/server"
import { auth } from "./auth"
import { can, assert2fa } from "./permissions"
import { MAX, text } from "./validate"
import { throttle } from "./rateLimit"

export const get = query({
    args: { taskId: v.id("tasks") },
    handler: async (ctx, args) => {
        const userId = await auth.getUserId(ctx)
        if (!userId) return []

        const task = await ctx.db.get(args.taskId)
        if (!task) return []
        const viewer = await ctx.db
            .query("members")
            .withIndex("byWorkspaceId_user_id", (q) =>
                q.eq("workspaceId", task.workspaceId).eq("userId", userId)
            ).unique()
        if (viewer) await assert2fa(ctx, viewer)
        if (!viewer) return []

        const comments = await ctx.db
            .query("taskComments")
            .withIndex("by_task_id", (q) => q.eq("taskId", args.taskId))
            .take(300)

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
        if (member) await assert2fa(ctx, member)

        if (!member || member.role === "guest") throw new Error("Unauthorized")

        const taskForCheck = await ctx.db.get(args.taskId)
        if (!taskForCheck || taskForCheck.workspaceId !== args.workspaceId)
            throw new Error("Task not found")

        await throttle(ctx, userId, "task-comment", 30, 60_000, "commenting")
        const body = text(args.body, MAX.taskComment, "Comment", { required: true })

        const commentId = await ctx.db.insert("taskComments", {
            taskId: args.taskId,
            workspaceId: args.workspaceId,
            memberId: member._id,
            body,
        })

        // 👇 Notify task assignee
        const task = await ctx.db.get(args.taskId)
        if (task && task.assigneeId && task.assigneeId !== member._id) {
            await notify(ctx, {
                workspaceId: args.workspaceId,
                recipientId: task.assigneeId,
                senderId: member._id,
                type: "task_comment",
                taskId: args.taskId,
                body,
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
        if (member) await assert2fa(ctx, member)

        if (!member || member.role === "guest") throw new Error("Unauthorized")
        if (comment.memberId !== member._id && !(await can(ctx, member, "manageContent")))
            throw new Error("Unauthorized")

        await ctx.db.delete(args.id)
        return args.id
    }
})