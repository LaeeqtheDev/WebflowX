import { v } from "convex/values"
import { mutation, query } from "./_generated/server"
import { auth } from "./auth"
import { checkLimit } from "./limits"

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

        const docs = await ctx.db
            .query("docs")
            .withIndex("by_workspace_id", (q) => q.eq("workspaceId", args.workspaceId))
            .order("desc")
            .collect()

        return await Promise.all(docs.map(async (doc) => {
            const creator = await ctx.db.get(doc.createdBy)
            const creatorUser = creator ? await ctx.db.get(creator.userId) : null
            return { ...doc, creator: creator ? { ...creator, user: creatorUser } : null }
        }))
    }
})

export const create = mutation({
    args: {
        workspaceId: v.id("workspaces"),
        title: v.string(),
        type: v.union(v.literal("document"), v.literal("spreadsheet")),
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

        const existingDocs = await ctx.db
            .query("docs")
            .withIndex("by_workspace_id", (q) => q.eq("workspaceId", args.workspaceId))
            .collect()

        const { allowed, limit, plan } = await checkLimit(
            ctx, args.workspaceId, "docs", existingDocs.length
        )

        if (!allowed) {
            throw new Error(`LIMIT_REACHED:docs:${limit}:${plan}`)
        }

        const liveblocksRoomId = `${args.workspaceId}-doc-${Date.now()}`

        return await ctx.db.insert("docs", {
            title: args.title,
            workspaceId: args.workspaceId,
            createdBy: member._id,
            type: args.type,
            liveblocksRoomId,
            updatedAt: Date.now(),
        })
    }
})

export const rename = mutation({
    args: {
        id: v.id("docs"),
        title: v.string(),
    },
    handler: async (ctx, args) => {
        const userId = await auth.getUserId(ctx)
        if (!userId) throw new Error("Unauthorized")

        const doc = await ctx.db.get(args.id)
        if (!doc) throw new Error("Doc not found")

        await ctx.db.patch(args.id, {
            title: args.title,
            updatedAt: Date.now(),
        })

        return args.id
    }
})

export const remove = mutation({
    args: { id: v.id("docs") },
    handler: async (ctx, args) => {
        const userId = await auth.getUserId(ctx)
        if (!userId) throw new Error("Unauthorized")

        const doc = await ctx.db.get(args.id)
        if (!doc) throw new Error("Doc not found")

        const member = await ctx.db
            .query("members")
            .withIndex("byWorkspaceId_user_id", (q) =>
                q.eq("workspaceId", doc.workspaceId).eq("userId", userId)
            ).unique()

        if (!member) throw new Error("Unauthorized")

        const isCreator = doc.createdBy === member._id
        const isAdmin = member.role === "admin"

        if (!isCreator && !isAdmin) throw new Error("Unauthorized")

        await ctx.db.delete(args.id)
        return args.id
    }
})