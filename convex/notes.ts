import { v, ConvexError } from "convex/values"
import { notify } from "./notifications"
import { mutation, query } from "./_generated/server"
import { auth } from "./auth"
import { can, assert2fa } from "./permissions"
import { checkLimitLazy } from "./limits"
import { MAX, text } from "./validate"
import { throttle } from "./rateLimit"

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
        if (member) await assert2fa(ctx, member)

        if (!member || member.role === "guest") return []

        if (args.type === "personal") {
            return await ctx.db
                .query("notes")
                .withIndex("by_workspace_id_type", (q) =>
                    q.eq("workspaceId", args.workspaceId).eq("type", "personal")
                )
                .filter((q) => q.eq(q.field("authorId"), member._id))
                .take(500)
        }

        return await ctx.db
            .query("notes")
            .withIndex("by_workspace_id_type", (q) =>
                q.eq("workspaceId", args.workspaceId).eq("type", "workspace")
            )
            .take(500)
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
        if (member) await assert2fa(ctx, member)

        if (!member || member.role === "guest") throw new Error("Member not found")

        await throttle(ctx, userId, "note-write", 30, 60_000, "saving notes")
        const title = text(args.title, MAX.noteTitle, "Title", { required: true, collapse: true })
        if (args.body.length > MAX.noteBody) throw new ConvexError(`That note is too long (max ${MAX.noteBody.toLocaleString()} characters)`)

        // Check limit (reads at most as many notes as the plan allows)
        const feature = args.type === "personal" ? "personalNotes" : "workspaceNotes"
        const { allowed, limit, plan } = await checkLimitLazy(ctx, args.workspaceId, feature, async (cap) => {
            const rows = args.type === "personal"
                ? await ctx.db.query("notes").withIndex("by_author_id_type", (q) => q.eq("authorId", member._id).eq("type", "personal")).take(cap)
                : await ctx.db.query("notes").withIndex("by_workspace_id_type", (q) => q.eq("workspaceId", args.workspaceId).eq("type", "workspace")).take(cap)
            return rows.length
        })

        if (!allowed) {
            throw new ConvexError(`LIMIT_REACHED:${feature}:${limit}:${plan}`)
        }

        const noteId = await ctx.db.insert("notes", {
            title,
            body: args.body,
            workspaceId: args.workspaceId,
            authorId: member._id,
            type: args.type,
            isPinned: false,
            updatedAt: Date.now()
        })

        // Notify workspace members
        if (args.type === "workspace") {
            const allMembers = await ctx.db
                .query("members")
                .withIndex("byWorkspaceId", (q) => q.eq("workspaceId", args.workspaceId))
                .take(200)

            await Promise.all(
                allMembers
                    .filter(m => m._id !== member._id)
                    .map(m => notify(ctx, {
                        workspaceId: args.workspaceId,
                        recipientId: m._id,
                        senderId: member._id,
                        type: "note_added",
                        noteId,
                        body: title,
                        read: false,
                    }))
            )
        }

        return noteId
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
        if (member) await assert2fa(ctx, member)

        if (!member || member.role === "guest") throw new Error("Unauthorized")

        const isAuthor = note.authorId === member._id
        const isAdmin = await can(ctx, member, "manageContent")

        if (!isAuthor && !isAdmin) throw new Error("Unauthorized")

        await throttle(ctx, userId, "note-write", 30, 60_000, "saving notes")
        const title = text(args.title, MAX.noteTitle, "Title", { required: true, collapse: true })
        if (args.body.length > MAX.noteBody) throw new ConvexError(`That note is too long (max ${MAX.noteBody.toLocaleString()} characters)`)
        await ctx.db.patch(args.id, {
            title,
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
        if (member) await assert2fa(ctx, member)

        if (!member || member.role === "guest") throw new Error("Unauthorized")

        const isAuthor = note.authorId === member._id
        const isAdmin = await can(ctx, member, "manageContent")

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
        if (member) await assert2fa(ctx, member)

        if (!member || !(await can(ctx, member, "manageContent"))) throw new Error("You don't have permission to pin notes")

        await ctx.db.patch(args.id, { isPinned: !note.isPinned })
        return args.id
    }
})