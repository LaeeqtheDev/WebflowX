import { v, ConvexError } from "convex/values"
import { mutation, query } from "./_generated/server"
import { auth } from "./auth"
import { can, assert2fa } from "./permissions"
import { checkLimitLazy } from "./limits"
import { throttle } from "./rateLimit"
import { internal } from "./_generated/api"

const cleanTitle = (raw: string) => {
    const t = raw.trim().replace(/\s+/g, " ")
    if (!t) throw new ConvexError("Title is required")
    if (t.length > 120) throw new ConvexError("Title is too long (max 120 characters)")
    return t
}

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
        if (member) await assert2fa(ctx, member)

        if (!member || member.role === "guest") return []

        const docs = await ctx.db
            .query("docs")
            .withIndex("by_workspace_id", (q) => q.eq("workspaceId", args.workspaceId))
            .order("desc")
            .take(500)

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
        if (member) await assert2fa(ctx, member)

        if (!member || member.role === "guest") throw new Error("Unauthorized")
        if (!(await can(ctx, member, "createDocs"))) throw new ConvexError("You don't have permission to create documents")

        await throttle(ctx, userId, "doc-create", 20, 60 * 60_000, "creating documents")
        const { allowed, limit, plan } = await checkLimitLazy(ctx, args.workspaceId, "docs", async (cap) =>
            (await ctx.db.query("docs").withIndex("by_workspace_id", (q) => q.eq("workspaceId", args.workspaceId)).take(cap)).length
        )

        if (!allowed) {
            throw new ConvexError(`LIMIT_REACHED:docs:${limit}:${plan}`)
        }

        const title = cleanTitle(args.title)
        const liveblocksRoomId = `${args.workspaceId}-doc-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`

        return await ctx.db.insert("docs", {
            title,
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

        const member = await ctx.db
            .query("members")
            .withIndex("byWorkspaceId_user_id", (q) =>
                q.eq("workspaceId", doc.workspaceId).eq("userId", userId)
            ).unique()
        if (member) await assert2fa(ctx, member)
        if (!member || member.role === "guest") throw new Error("Unauthorized")

        await ctx.db.patch(args.id, {
            title: cleanTitle(args.title),
            updatedAt: Date.now(),
        })

        return args.id
    }
})

// Called (debounced) by the editor so "last edited" reflects real content changes.
export const touch = mutation({
    args: { id: v.id("docs") },
    handler: async (ctx, args) => {
        const userId = await auth.getUserId(ctx)
        if (!userId) return null
        const doc = await ctx.db.get(args.id)
        if (!doc) return null
        const member = await ctx.db
            .query("members")
            .withIndex("byWorkspaceId_user_id", (q) =>
                q.eq("workspaceId", doc.workspaceId).eq("userId", userId)
            ).unique()
        if (member) await assert2fa(ctx, member)
        if (!member || member.role === "guest") return null
        // skip if touched in the last few seconds to avoid write churn
        if (doc.updatedAt && Date.now() - doc.updatedAt < 5000) return null
        await ctx.db.patch(args.id, { updatedAt: Date.now(), updatedBy: member._id })
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
        if (member) await assert2fa(ctx, member)

        if (!member || member.role === "guest") throw new Error("Unauthorized")

        const isCreator = doc.createdBy === member._id
        const isAdmin = await can(ctx, member, "manageContent")

        if (!isCreator && !isAdmin) throw new Error("Unauthorized")

        await ctx.db.delete(args.id)
        await ctx.scheduler.runAfter(0, internal.liveblocks.deleteRoom, { roomId: doc.liveblocksRoomId })
        return args.id
    }
})

// Used by the /api/liveblocks-auth route: only members of the doc's workspace may enter its room.
export const authorizeRoom = query({
    args: { roomId: v.string() },
    handler: async (ctx, args) => {
        const userId = await auth.getUserId(ctx)
        if (!userId) return null
        const doc = await ctx.db
            .query("docs")
            .withIndex("by_room_id", (q) => q.eq("liveblocksRoomId", args.roomId))
            .first()
        if (!doc) return null
        const member = await ctx.db
            .query("members")
            .withIndex("byWorkspaceId_user_id", (q) =>
                q.eq("workspaceId", doc.workspaceId).eq("userId", userId)
            ).unique()
        if (member) await assert2fa(ctx, member)
        if (!member || member.role === "guest") return null
        const user = await ctx.db.get(userId)
        return {
            userId: userId as string,
            name: user?.name ?? user?.email ?? "Member",
            avatar: user?.image ?? "",
        }
    },
})
