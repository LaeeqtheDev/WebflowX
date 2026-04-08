import { v } from "convex/values"
import { mutation, query } from "./_generated/server"
import { auth } from "./auth"

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

        return await ctx.db
            .query("sprints")
            .withIndex("by_workspace_id", (q) =>
                q.eq("workspaceId", args.workspaceId)
            )
            .collect()
    }
})

export const create = mutation({
    args: {
        workspaceId: v.id("workspaces"),
        name: v.string(),
        startDate: v.optional(v.number()),
        endDate: v.optional(v.number()),
    },
    handler: async (ctx, args) => {
        const userId = await auth.getUserId(ctx)
        if (!userId) throw new Error("Unauthorized")

        const member = await ctx.db
            .query("members")
            .withIndex("byWorkspaceId_user_id", (q) =>
                q.eq("workspaceId", args.workspaceId).eq("userId", userId)
            ).unique()

        if (!member || member.role !== "admin") throw new Error("Only admins can create sprints")

        return await ctx.db.insert("sprints", {
            ...args,
            status: "planned",
        })
    }
})

export const updateStatus = mutation({
    args: {
        id: v.id("sprints"),
        status: v.union(v.literal("planned"), v.literal("active"), v.literal("completed")),
    },
    handler: async (ctx, args) => {
        const userId = await auth.getUserId(ctx)
        if (!userId) throw new Error("Unauthorized")

        const sprint = await ctx.db.get(args.id)
        if (!sprint) throw new Error("Sprint not found")

        const member = await ctx.db
            .query("members")
            .withIndex("byWorkspaceId_user_id", (q) =>
                q.eq("workspaceId", sprint.workspaceId).eq("userId", userId)
            ).unique()

        if (!member || member.role !== "admin") throw new Error("Only admins can update sprints")

        await ctx.db.patch(args.id, { status: args.status })
        return args.id
    }
})

export const remove = mutation({
    args: { id: v.id("sprints") },
    handler: async (ctx, args) => {
        const userId = await auth.getUserId(ctx)
        if (!userId) throw new Error("Unauthorized")

        const sprint = await ctx.db.get(args.id)
        if (!sprint) throw new Error("Sprint not found")

        const member = await ctx.db
            .query("members")
            .withIndex("byWorkspaceId_user_id", (q) =>
                q.eq("workspaceId", sprint.workspaceId).eq("userId", userId)
            ).unique()

        if (!member || member.role !== "admin") throw new Error("Only admins can delete sprints")

        await ctx.db.delete(args.id)
        return args.id
    }
})