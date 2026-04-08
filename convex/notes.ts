import { v } from "convex/values"
import { mutation, query } from "./_generated/server"
import { auth } from "./auth"

export const get = query({
    args: {
        workspaceId: v.id("workspaces"),
        type: v.union(v.literal("personal"), v.literal("workspace"))
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

        if (args.type === "personal") {
            return await ctx.db
                .query("notes")
                .withIndex("by_workspace_id_type", (q) =>
                    q.eq("workspaceId", args.workspaceId).eq("type", "personal")
                )
                .filter((q) => q.eq(q.field("authorId"), member._id))
                .collect()
        }

        return await ctx.db
            .query("notes")
            .withIndex("by_workspace_id_type", (q) =>
                q.eq("workspaceId", args.workspaceId).eq("type", "workspace")
            )
            .collect()
    }
})

export const create = mutation({
    args: {
        workspaceId: v.id("workspaces"),
        title: v.string(),
        body: v.string(),
        type: v.union(v.literal("personal"), v.literal("workspace"))
    },
    handler: async (ctx, args) => {
        const userId = await auth.getUserId(ctx)
        if (!userId) throw new Error("Unauthorized")

        const member = await ctx.db
            .query("members")
            .withIndex("byWorkspaceId_user_id", (q) =>
                q.eq("workspaceId", args.workspaceId).eq("userId", userId)
            ).unique()

        if (!member) throw new Error("Member not found")

        return await ctx.db.insert("notes", {
            title: args.title,
            body: args.body,
            workspaceId: args.workspaceId,
            authorId: member._id,
            type: args.type,
            isPinned: false,
            updatedAt: Date.now()
        })
    }
})

export const update = mutation({
    args: {
        id: v.id("notes"),
        title: v.string(),
        body: v.string(),
    },
    handler: async (ctx, args) => {
        const userId = await auth.getUserId(ctx)
        if (!userId) throw new Error("Unauthorized")

        const note = await ctx.db.get(args.id)
        if (!note) throw new Error("Note not found")

        const member = await ctx.db
            .query("members")
            .withIndex("byWorkspaceId_user_id", (q) =>
                q.eq("workspaceId", note.workspaceId).eq("userId", userId)
            ).unique()

        if (!member) throw new Error("Unauthorized")

        const isAuthor = note.authorId === member._id
        const isAdmin = member.role === "admin"

        if (!isAuthor && !isAdmin) throw new Error("Unauthorized")

        await ctx.db.patch(args.id, {
            title: args.title,
            body: args.body,
            updatedAt: Date.now()
        })

        return args.id
    }
})

export const remove = mutation({
    args: { id: v.id("notes") },
    handler: async (ctx, args) => {
        const userId = await auth.getUserId(ctx)
        if (!userId) throw new Error("Unauthorized")

        const note = await ctx.db.get(args.id)
        if (!note) throw new Error("Note not found")

        const member = await ctx.db
            .query("members")
            .withIndex("byWorkspaceId_user_id", (q) =>
                q.eq("workspaceId", note.workspaceId).eq("userId", userId)
            ).unique()

        if (!member) throw new Error("Unauthorized")

        const isAuthor = note.authorId === member._id
        const isAdmin = member.role === "admin"

        // workspace notes: only admin can delete
        // personal notes: only author can delete
        if (note.type === "workspace" && !isAdmin) throw new Error("Only admins can delete workspace notes")
        if (note.type === "personal" && !isAuthor) throw new Error("Unauthorized")

        await ctx.db.delete(args.id)
        return args.id
    }
})

export const togglePin = mutation({
    args: { id: v.id("notes") },
    handler: async (ctx, args) => {
        const userId = await auth.getUserId(ctx)
        if (!userId) throw new Error("Unauthorized")

        const note = await ctx.db.get(args.id)
        if (!note) throw new Error("Note not found")

        const member = await ctx.db
            .query("members")
            .withIndex("byWorkspaceId_user_id", (q) =>
                q.eq("workspaceId", note.workspaceId).eq("userId", userId)
            ).unique()

        if (!member || member.role !== "admin") throw new Error("Only admins can pin notes")

        await ctx.db.patch(args.id, { isPinned: !note.isPinned })
        return args.id
    }
})