import { v } from "convex/values"
import { notify } from "./notifications"
import { mutation, query, QueryCtx } from "./_generated/server"
import { Id } from "./_generated/dataModel"
import { auth } from "./auth"
import { can, assert2fa } from "./permissions"
import { ConvexError } from "convex/values"
import { MAX, text, cleanLabels } from "./validate"
import { throttle } from "./rateLimit"
import { emit } from "./integrations"

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

// Assignee / sprint must belong to the same workspace as the task
const assertSameWorkspace = async (
    ctx: QueryCtx,
    workspaceId: Id<"workspaces">,
    assigneeId?: Id<"members">,
    sprintId?: Id<"sprints">
) => {
    if (assigneeId) {
        const assignee = await ctx.db.get(assigneeId)
        if (!assignee || assignee.workspaceId !== workspaceId) throw new Error("Assignee is not in this workspace")
    }
    if (sprintId) {
        const sprint = await ctx.db.get(sprintId)
        if (!sprint || sprint.workspaceId !== workspaceId) throw new Error("Sprint is not in this workspace")
    }
}

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
        if (member) await assert2fa(ctx, member)

        if (!member || member.role === "guest") return []

        // newest 1,000 tasks (a board that big should be archived or split by sprint anyway)
        let tasks = await ctx.db
            .query("tasks")
            .withIndex("by_workspace_id", (q) =>
                q.eq("workspaceId", args.workspaceId)
            )
            .order("desc")
            .take(1000)

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
        if (member) await assert2fa(ctx, member)

        if (!member || member.role === "guest") throw new ConvexError("Unauthorized")

        await throttle(ctx, userId, "task-create", 60, 60_000, "creating tasks")
        const title = text(args.title, MAX.taskTitle, "Task title", { required: true, collapse: true })
        const description = args.description === undefined ? undefined : text(args.description, MAX.taskDescription, "Description")
        const labels = cleanLabels(args.labels)

        // Any member can create tasks; non-admins can only leave them unassigned or assign them to themselves
        if (args.assigneeId && args.assigneeId !== member._id && !(await can(ctx, member, "manageContent"))) {
            throw new ConvexError("Only admins can assign tasks to other people")
        }

        await assertSameWorkspace(ctx, args.workspaceId, args.assigneeId, args.sprintId)

        const taskId = await ctx.db.insert("tasks", {
            ...args,
            title,
            description,
            labels,
            createdBy: member._id,
            updatedAt: Date.now(),
        })

        // 👇 Notify assignee
        if (args.assigneeId && args.assigneeId !== member._id) {
            await notify(ctx, {
                workspaceId: args.workspaceId,
                recipientId: args.assigneeId,
                senderId: member._id,
                type: "task_assigned",
                taskId,
                body: title,
                read: false,
            })
        }

        await emit(ctx, args.workspaceId, "task.created", {
            id: taskId, title, status: args.status, priority: args.priority,
            assigneeId: args.assigneeId ?? null,
            dueDate: args.dueDate === undefined ? null : new Date(args.dueDate).toISOString().slice(0, 10),
        })

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
        // explicit flag, because an undefined assigneeId never reaches the server
        unassign: v.optional(v.boolean()),
        // fields to empty out (an undefined value never reaches the server either)
        clear: v.optional(v.array(v.union(v.literal("sprintId"), v.literal("dueDate"), v.literal("storyPoints"), v.literal("description")))),
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
        if (member) await assert2fa(ctx, member)

        if (!member || member.role === "guest") throw new Error("Unauthorized")

        const isAdmin = await can(ctx, member, "manageContent")
        const { id, unassign, clear, ...updates } = args
        if (clear?.length && !isAdmin) throw new ConvexError("Members can only update task status")

        if (!isAdmin && task.assigneeId !== member._id && task.createdBy !== member._id) {
            throw new ConvexError("Members can only update tasks assigned to or created by them")
        }

        if (!isAdmin) {
            const allowedKeys = ["status"]
            const hasDisallowedKeys = Object.keys(updates).some(
                k => updates[k as keyof typeof updates] !== undefined && !allowedKeys.includes(k)
            )
            if (hasDisallowedKeys) throw new ConvexError("Members can only update task status")
        }

        await assertSameWorkspace(ctx, task.workspaceId, args.assigneeId, args.sprintId)

        await throttle(ctx, userId, "task-update", 120, 60_000, "updating tasks")
        if (updates.title !== undefined) updates.title = text(updates.title, MAX.taskTitle, "Task title", { required: true, collapse: true })
        if (updates.description !== undefined) updates.description = text(updates.description, MAX.taskDescription, "Description")
        if (updates.labels !== undefined) updates.labels = cleanLabels(updates.labels)

        // 👇 Notify new assignee if changed
        if (args.assigneeId && args.assigneeId !== task.assigneeId && args.assigneeId !== member._id) {
            await notify(ctx, {
                workspaceId: task.workspaceId,
                recipientId: args.assigneeId,
                senderId: member._id,
                type: "task_assigned",
                taskId: args.id,
                body: task.title,
                read: false,
            })
        }

        if (updates.status === "done" && task.status !== "done") {
            await emit(ctx, task.workspaceId, "task.completed", { id: task._id, title: updates.title ?? task.title, priority: task.priority })
        }

        const emptied: Partial<Record<"sprintId" | "dueDate" | "storyPoints" | "description", undefined>> = {}
        for (const k of clear ?? []) emptied[k] = undefined
        if (unassign && isAdmin) {
            await ctx.db.patch(args.id, { ...updates, ...emptied, assigneeId: undefined, updatedAt: Date.now() })
        } else {
            await ctx.db.patch(args.id, { ...updates, ...emptied, updatedAt: Date.now() })
        }
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
        if (member) await assert2fa(ctx, member)

        if (!member || member.role === "guest") throw new ConvexError("Unauthorized")
        if (task.createdBy !== member._id && !(await can(ctx, member, "manageContent"))) {
            throw new ConvexError("Only admins or the task creator can delete tasks")
        }

        const comments = await ctx.db
            .query("taskComments")
            .withIndex("by_task_id", (q) => q.eq("taskId", args.id))
            .take(1000)
        for (const c of comments) await ctx.db.delete(c._id)

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
        if (member) await assert2fa(ctx, member)

        if (!member || member.role === "guest") throw new Error("Unauthorized")

        if (task.assigneeId && task.assigneeId !== member._id && !(await can(ctx, member, "manageContent"))) {
            throw new ConvexError("This task is already assigned to someone else")
        }

        await ctx.db.patch(args.id, { assigneeId: member._id, updatedAt: Date.now() })
        return args.id
    }
})