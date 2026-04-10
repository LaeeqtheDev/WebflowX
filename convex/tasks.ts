import { v } from "convex/values"
import { mutation, query } from "./_generated/server"
import { auth } from "./auth"

const statusValidator = v.union(
    v.literal("backlog"),
    v.literal("todo"),
    v.literal("in_progress"),
    v.literal("in_review"),
    v.literal("done")
)

const priorityValidator = v.union(
    v.literal("urgent"),
    v.literal("high"),
    v.literal("medium"),
    v.literal("low")
)

export const get = query({
    args: {
        workspaceId: v.id("workspaces"),
        status: v.optional(statusValidator),
        assigneeId: v.optional(v.id("members")),
    },
    handler: async (ctx, args) => {
        const userId = await auth.getUserId(ctx)
        if (!userId) return []

        const member = await ctx.db
            .query("members")
            .withIndex("byWorkspaceId_user_id", (q) =>
                q.eq("workspaceId", args.workspaceId).eq("userId", userId)
            ).unique()

        if (!member) return []

        let tasks = await ctx.db
            .query("tasks")
            .withIndex("by_workspace_id", (q) =>
                q.eq("workspaceId", args.workspaceId)
            )
            .collect()

        if (args.status) tasks = tasks.filter(t => t.status === args.status)
        if (args.assigneeId) tasks = tasks.filter(t => t.assigneeId === args.assigneeId)

        return await Promise.all(tasks.map(async (task) => {
            const assignee = task.assigneeId ? await ctx.db.get(task.assigneeId) : null
            const assigneeUser = assignee ? await ctx.db.get(assignee.userId) : null
            const creator = await ctx.db.get(task.createdBy)
            const creatorUser = creator ? await ctx.db.get(creator.userId) : null
            return {
                ...task,
                assignee: assignee ? { ...assignee, user: assigneeUser } : null,
                creator: creator ? { ...creator, user: creatorUser } : null,
            }
        }))
    }
})

export const create = mutation({
    args: {
        workspaceId: v.id("workspaces"),
        title: v.string(),
        description: v.optional(v.string()),
        status: statusValidator,
        priority: priorityValidator,
        assigneeId: v.optional(v.id("members")),
        dueDate: v.optional(v.number()),
        labels: v.optional(v.array(v.string())),
        storyPoints: v.optional(v.number()),
        sprintId: v.optional(v.id("sprints")),
    },
    handler: async (ctx, args) => {
        const userId = await auth.getUserId(ctx)
        if (!userId) throw new Error("Unauthorized")

        const member = await ctx.db
            .query("members")
            .withIndex("byWorkspaceId_user_id", (q) =>
                q.eq("workspaceId", args.workspaceId).eq("userId", userId)
            ).unique()

        if (!member || member.role !== "admin") throw new Error("Only admins can create tasks")

        const taskId = await ctx.db.insert("tasks", {
            ...args,
            createdBy: member._id,
            updatedAt: Date.now(),
        })

        // 👇 Notify assignee
        if (args.assigneeId && args.assigneeId !== member._id) {
            await ctx.db.insert("notifications", {
                workspaceId: args.workspaceId,
                recipientId: args.assigneeId,
                senderId: member._id,
                type: "task_assigned",
                taskId,
                body: args.title,
                read: false,
            })
        }

        return taskId
    }
})

export const update = mutation({
    args: {
        id: v.id("tasks"),
        title: v.optional(v.string()),
        description: v.optional(v.string()),
        status: v.optional(statusValidator),
        priority: v.optional(priorityValidator),
        assigneeId: v.optional(v.id("members")),
        dueDate: v.optional(v.number()),
        labels: v.optional(v.array(v.string())),
        storyPoints: v.optional(v.number()),
        sprintId: v.optional(v.id("sprints")),
    },
    handler: async (ctx, args) => {
        const userId = await auth.getUserId(ctx)
        if (!userId) throw new Error("Unauthorized")

        const task = await ctx.db.get(args.id)
        if (!task) throw new Error("Task not found")

        const member = await ctx.db
            .query("members")
            .withIndex("byWorkspaceId_user_id", (q) =>
                q.eq("workspaceId", task.workspaceId).eq("userId", userId)
            ).unique()

        if (!member) throw new Error("Unauthorized")

        const isAdmin = member.role === "admin"
        const { id, ...updates } = args

        if (!isAdmin) {
            const allowedKeys = ["status"]
            const hasDisallowedKeys = Object.keys(updates).some(
                k => updates[k as keyof typeof updates] !== undefined && !allowedKeys.includes(k)
            )
            if (hasDisallowedKeys) throw new Error("Members can only update task status")
        }

        // 👇 Notify new assignee if changed
        if (args.assigneeId && args.assigneeId !== task.assigneeId && args.assigneeId !== member._id) {
            await ctx.db.insert("notifications", {
                workspaceId: task.workspaceId,
                recipientId: args.assigneeId,
                senderId: member._id,
                type: "task_assigned",
                taskId: args.id,
                body: task.title,
                read: false,
            })
        }

        await ctx.db.patch(args.id, { ...updates, updatedAt: Date.now() })
        return args.id
    }
})

export const remove = mutation({
    args: { id: v.id("tasks") },
    handler: async (ctx, args) => {
        const userId = await auth.getUserId(ctx)
        if (!userId) throw new Error("Unauthorized")

        const task = await ctx.db.get(args.id)
        if (!task) throw new Error("Task not found")

        const member = await ctx.db
            .query("members")
            .withIndex("byWorkspaceId_user_id", (q) =>
                q.eq("workspaceId", task.workspaceId).eq("userId", userId)
            ).unique()

        if (!member || member.role !== "admin") throw new Error("Only admins can delete tasks")

        await ctx.db.delete(args.id)
        return args.id
    }
})

export const assignToMe = mutation({
    args: { id: v.id("tasks") },
    handler: async (ctx, args) => {
        const userId = await auth.getUserId(ctx)
        if (!userId) throw new Error("Unauthorized")

        const task = await ctx.db.get(args.id)
        if (!task) throw new Error("Task not found")

        const member = await ctx.db
            .query("members")
            .withIndex("byWorkspaceId_user_id", (q) =>
                q.eq("workspaceId", task.workspaceId).eq("userId", userId)
            ).unique()

        if (!member) throw new Error("Unauthorized")

        await ctx.db.patch(args.id, { assigneeId: member._id, updatedAt: Date.now() })
        return args.id
    }
})