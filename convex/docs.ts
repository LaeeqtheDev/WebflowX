import { v, ConvexError } from "convex/values"
import { internalMutation, mutation, query } from "./_generated/server"
import { auth } from "./auth"
import { can, assert2fa } from "./permissions"
import { checkLimitLazy } from "./limits"
import { throttle } from "./rateLimit"
import { internal } from "./_generated/api"
import { Doc, Id } from "./_generated/dataModel"
import { MutationCtx, QueryCtx } from "./_generated/server"

const cleanIcon = (raw?: string) => {
    const t = (raw ?? "").trim()
    if (/^i:[a-z0-9-]{1,30}$/.test(t)) return t
    return t && t.length <= 8 ? t : undefined
}

const MAX_DEPTH = 8
const MAX_TREE = 1000
export const TRASH_DAYS = 30

// Live pages in a workspace, up to `cap` (trashed ones don't count against the plan).
export const countLiveDocs = async (ctx: QueryCtx, workspaceId: Id<"workspaces">, cap: number) => {
    const rows = await ctx.db.query("docs").withIndex("by_workspace_id", (q) => q.eq("workspaceId", workspaceId)).take(cap + 300)
    return rows.filter((d) => !d.deletedAt).length
}

// The signed-in, non-guest member of a workspace (and their 2FA status checked), or an error.
const docMember = async (ctx: QueryCtx | MutationCtx, workspaceId: Id<"workspaces">) => {
    const userId = await auth.getUserId(ctx)
    if (!userId) throw new ConvexError("Please sign in")
    const member = await ctx.db
        .query("members")
        .withIndex("byWorkspaceId_user_id", (q) => q.eq("workspaceId", workspaceId).eq("userId", userId))
        .unique()
    if (!member || member.role === "guest") throw new ConvexError("You don't have access to pages in this workspace")
    await assert2fa(ctx, member)
    return { userId, member }
}

const effPos = (d: Pick<Doc<"docs">, "position" | "_creationTime">) => d.position ?? d._creationTime

// How many levels deep a page sits (a page at the top is 1).
const depthOf = async (ctx: QueryCtx, id: Id<"docs"> | undefined): Promise<number> => {
    let depth = 0
    let cur = id
    while (cur && depth <= MAX_DEPTH + 1) {
        const d: Doc<"docs"> | null = await ctx.db.get(cur)
        if (!d) break
        depth++
        cur = d.parentId
    }
    return depth
}

const siblingsOf = async (ctx: QueryCtx, workspaceId: Id<"workspaces">, parentId: Id<"docs"> | undefined) => {
    const rows = parentId
        ? await ctx.db.query("docs").withIndex("by_parent_id", (q) => q.eq("parentId", parentId)).take(500)
        : await ctx.db.query("docs").withIndex("by_workspace_id", (q) => q.eq("workspaceId", workspaceId)).filter((q) => q.eq(q.field("parentId"), undefined)).take(MAX_TREE)
    return rows.filter((d) => !d.deletedAt).sort((a, b) => effPos(a) - effPos(b))
}

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

        return await Promise.all(docs.filter((d) => !d.deletedAt).map(async (doc) => {
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
        parentId: v.optional(v.id("docs")),
        icon: v.optional(v.string()),
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
        const { allowed, limit, plan } = await checkLimitLazy(ctx, args.workspaceId, "docs", (cap) => countLiveDocs(ctx, args.workspaceId, cap))

        if (!allowed) {
            throw new ConvexError(`LIMIT_REACHED:docs:${limit}:${plan}`)
        }

        const title = cleanTitle(args.title)
        const liveblocksRoomId = `${args.workspaceId}-doc-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`

        if (args.parentId) {
            const parent = await ctx.db.get(args.parentId)
            if (!parent || parent.deletedAt || parent.workspaceId !== args.workspaceId) throw new ConvexError("Parent page not found")
            if ((await depthOf(ctx, args.parentId)) >= MAX_DEPTH) throw new ConvexError(`Pages can be nested up to ${MAX_DEPTH} levels deep`)
        }

        return await ctx.db.insert("docs", {
            title,
            workspaceId: args.workspaceId,
            createdBy: member._id,
            type: args.type,
            liveblocksRoomId,
            updatedAt: Date.now(),
            parentId: args.parentId,
            position: Date.now(),
            icon: cleanIcon(args.icon),
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

// Everything below a page, the page itself first.
const subtreeOf = async (ctx: QueryCtx, root: Doc<"docs">, keep: (d: Doc<"docs">) => boolean = () => true) => {
    const all: Doc<"docs">[] = [root]
    for (let i = 0; i < all.length && all.length < MAX_TREE; i++) {
        const kids = await ctx.db.query("docs").withIndex("by_parent_id", (q) => q.eq("parentId", all[i]._id)).take(500)
        all.push(...kids.filter(keep))
    }
    return all
}

// Hard-deletes pages (and what hangs off them): used by "delete forever" and the 30-day clean-up.
const eraseAll = async (ctx: MutationCtx, all: Doc<"docs">[]) => {
    for (const d of all) {
        const favs = await ctx.db.query("docFavorites").withIndex("by_doc_id", (q) => q.eq("docId", d._id)).take(200)
        for (const f of favs) await ctx.db.delete(f._id)
        if (d.type === "database") await ctx.scheduler.runAfter(0, internal.databases.purgeDatabase, { docId: d._id })
        await ctx.db.delete(d._id)
        await ctx.scheduler.runAfter(0, internal.liveblocks.deleteRoom, { roomId: d.liveblocksRoomId })
    }
}

// Moves a page and everything inside it to the trash. It can be restored for 30 days.
export const remove = mutation({
    args: { id: v.id("docs") },
    handler: async (ctx, args) => {
        const doc = await ctx.db.get(args.id)
        if (!doc || doc.deletedAt) throw new Error("Doc not found")
        const { member } = await docMember(ctx, doc.workspaceId)

        const isAdmin = await can(ctx, member, "manageContent")
        const all = await subtreeOf(ctx, doc, (d) => !d.deletedAt)
        // pages made by other people go only with an admin's say-so
        if (!isAdmin && all.some((d) => d.createdBy !== member._id)) throw new Error("Unauthorized")

        const at = Date.now()
        for (const d of all) await ctx.db.patch(d._id, { deletedAt: at })
        return args.id
    }
})

// The top of each deleted group, newest first. Admins see everything; others see their own.
export const trash = query({
    args: { workspaceId: v.id("workspaces") },
    handler: async (ctx, args) => {
        let member
        try { ({ member } = await docMember(ctx, args.workspaceId)) } catch { return [] }
        const isAdmin = await can(ctx, member, "manageContent")
        const gone = await ctx.db.query("docs").withIndex("by_deleted_at", (q) => q.gt("deletedAt", 0)).order("desc").take(600)
        const mine = gone.filter((d) => d.workspaceId === args.workspaceId)
        const roots = mine.filter((d) => {
            const parent = d.parentId ? mine.find((p) => p._id === d.parentId) : undefined
            return !(parent && parent.deletedAt === d.deletedAt)
        })
        return roots
            .filter((d) => isAdmin || d.createdBy === member._id)
            .slice(0, 200)
            .map((d) => ({
                _id: d._id, title: d.title, icon: d.icon ?? null, type: d.type, deletedAt: d.deletedAt as number,
                inside: mine.filter((x) => x._id !== d._id && x.deletedAt === d.deletedAt).length,
                daysLeft: Math.max(0, Math.ceil(((d.deletedAt as number) + TRASH_DAYS * 86_400_000 - Date.now()) / 86_400_000)),
            }))
    },
})

const trashedGroup = async (ctx: MutationCtx, id: Id<"docs">) => {
    const doc = await ctx.db.get(id)
    if (!doc || !doc.deletedAt) throw new ConvexError("That page isn't in the trash")
    const { member } = await docMember(ctx, doc.workspaceId)
    const all = await subtreeOf(ctx, doc, (d) => d.deletedAt === doc.deletedAt)
    if (!(await can(ctx, member, "manageContent")) && all.some((d) => d.createdBy !== member._id)) throw new ConvexError("Only the creator or an admin can do that")
    return { doc, all }
}

export const restore = mutation({
    args: { id: v.id("docs") },
    handler: async (ctx, args) => {
        const { doc, all } = await trashedGroup(ctx, args.id)
        // if the page it lived in is gone or still in the trash, it comes back at the top level
        const parent = doc.parentId ? await ctx.db.get(doc.parentId) : null
        if (doc.parentId && (!parent || parent.deletedAt)) await ctx.db.patch(doc._id, { parentId: undefined })
        for (const d of all) await ctx.db.patch(d._id, { deletedAt: undefined })
        return args.id
    },
})

export const deleteForever = mutation({
    args: { id: v.id("docs") },
    handler: async (ctx, args) => {
        const { all } = await trashedGroup(ctx, args.id)
        await eraseAll(ctx, all)
        return args.id
    },
})

// Daily: pages that have sat in the trash for 30 days are removed for good.
export const purgeExpired = internalMutation({
    args: {},
    handler: async (ctx) => {
        const cutoff = Date.now() - TRASH_DAYS * 86_400_000
        const old = await ctx.db.query("docs").withIndex("by_deleted_at", (q) => q.gt("deletedAt", 0).lt("deletedAt", cutoff)).take(40)
        if (!old.length) return
        await eraseAll(ctx, old)
        if (old.length === 40) await ctx.scheduler.runAfter(0, internal.docs.purgeExpired, {})
    },
})

// ---- page tree ----

// Everything the sidebar tree needs, and nothing more.
export const tree = query({
    args: { workspaceId: v.id("workspaces") },
    handler: async (ctx, args) => {
        const userId = await auth.getUserId(ctx)
        if (!userId) return []
        const member = await ctx.db
            .query("members")
            .withIndex("byWorkspaceId_user_id", (q) => q.eq("workspaceId", args.workspaceId).eq("userId", userId))
            .unique()
        if (!member || member.role === "guest") return []
        await assert2fa(ctx, member)
        const docs = await ctx.db.query("docs").withIndex("by_workspace_id", (q) => q.eq("workspaceId", args.workspaceId)).take(MAX_TREE)
        return docs.filter((d) => !d.deletedAt).map((d) => ({
            _id: d._id, title: d.title, icon: d.icon ?? null, type: d.type,
            parentId: d.parentId ?? null, position: effPos(d), updatedAt: d.updatedAt ?? d._creationTime,
        }))
    },
})

// Move a page under another page (or to the top with parentId null), placing it after `afterId` if given.
export const move = mutation({
    args: { id: v.id("docs"), parentId: v.union(v.id("docs"), v.null()), afterId: v.optional(v.union(v.id("docs"), v.null())) },
    handler: async (ctx, args) => {
        const doc = await ctx.db.get(args.id)
        if (!doc || doc.deletedAt) throw new ConvexError("Page not found")
        await docMember(ctx, doc.workspaceId)

        const parentId = args.parentId ?? undefined
        if (parentId) {
            const parent = await ctx.db.get(parentId)
            if (!parent || parent.deletedAt || parent.workspaceId !== doc.workspaceId) throw new ConvexError("Parent page not found")
            // a page can't go inside itself or anything below it
            let cur: Id<"docs"> | undefined = parentId
            for (let i = 0; cur && i < 20; i++) {
                if (cur === args.id) throw new ConvexError("A page can't be moved into itself")
                const d: Doc<"docs"> | null = await ctx.db.get(cur)
                cur = d?.parentId
            }
            if ((await depthOf(ctx, parentId)) >= MAX_DEPTH) throw new ConvexError(`Pages can be nested up to ${MAX_DEPTH} levels deep`)
        }

        const sibs = (await siblingsOf(ctx, doc.workspaceId, parentId)).filter((d) => d._id !== args.id)
        let position: number
        if (args.afterId === undefined) {
            position = sibs.length ? effPos(sibs[sibs.length - 1]) + 1000 : Date.now()
        } else if (args.afterId === null) {
            position = sibs.length ? effPos(sibs[0]) - 1000 : Date.now()
        } else {
            const i = sibs.findIndex((d) => d._id === args.afterId)
            if (i === -1) position = sibs.length ? effPos(sibs[sibs.length - 1]) + 1000 : Date.now()
            else position = sibs[i + 1] ? (effPos(sibs[i]) + effPos(sibs[i + 1])) / 2 : effPos(sibs[i]) + 1000
        }
        await ctx.db.patch(args.id, { parentId, position })
        return args.id
    },
})

export const setIcon = mutation({
    args: { id: v.id("docs"), icon: v.union(v.string(), v.null()) },
    handler: async (ctx, args) => {
        const doc = await ctx.db.get(args.id)
        if (!doc) throw new ConvexError("Page not found")
        await docMember(ctx, doc.workspaceId)
        await ctx.db.patch(args.id, { icon: args.icon ? cleanIcon(args.icon) : undefined })
        return args.id
    },
})

// ---- favorites ----

export const favoriteIds = query({
    args: { workspaceId: v.id("workspaces") },
    handler: async (ctx, args) => {
        const userId = await auth.getUserId(ctx)
        if (!userId) return []
        const member = await ctx.db
            .query("members")
            .withIndex("byWorkspaceId_user_id", (q) => q.eq("workspaceId", args.workspaceId).eq("userId", userId))
            .unique()
        if (!member || member.role === "guest") return []
        const rows = await ctx.db.query("docFavorites").withIndex("by_member_id", (q) => q.eq("memberId", member._id)).take(200)
        return rows.map((r) => r.docId)
    },
})

export const toggleFavorite = mutation({
    args: { id: v.id("docs") },
    handler: async (ctx, args) => {
        const doc = await ctx.db.get(args.id)
        if (!doc) throw new ConvexError("Page not found")
        const { member } = await docMember(ctx, doc.workspaceId)
        const rows = await ctx.db.query("docFavorites").withIndex("by_doc_id", (q) => q.eq("docId", args.id)).take(500)
        const mine = rows.find((r) => r.memberId === member._id)
        if (mine) { await ctx.db.delete(mine._id); return false }
        const count = (await ctx.db.query("docFavorites").withIndex("by_member_id", (q) => q.eq("memberId", member._id)).take(51)).length
        if (count >= 50) throw new ConvexError("You can star up to 50 pages")
        await ctx.db.insert("docFavorites", { workspaceId: doc.workspaceId, memberId: member._id, docId: args.id })
        return true
    },
})

// ---- saved page templates ----

export const templates = query({
    args: { workspaceId: v.id("workspaces") },
    handler: async (ctx, args) => {
        const userId = await auth.getUserId(ctx)
        if (!userId) return []
        const member = await ctx.db
            .query("members")
            .withIndex("byWorkspaceId_user_id", (q) => q.eq("workspaceId", args.workspaceId).eq("userId", userId))
            .unique()
        if (!member || member.role === "guest") return []
        const rows = await ctx.db.query("docTemplates").withIndex("by_workspace_id", (q) => q.eq("workspaceId", args.workspaceId)).take(50)
        // the content itself is fetched only when a template is used
        return rows.map((r) => ({ _id: r._id, name: r.name, icon: r.icon ?? null, createdBy: r.createdBy }))
    },
})

export const templateHtml = query({
    args: { id: v.id("docTemplates") },
    handler: async (ctx, args) => {
        const t = await ctx.db.get(args.id)
        if (!t) return null
        const userId = await auth.getUserId(ctx)
        if (!userId) return null
        const member = await ctx.db
            .query("members")
            .withIndex("byWorkspaceId_user_id", (q) => q.eq("workspaceId", t.workspaceId).eq("userId", userId))
            .unique()
        if (!member || member.role === "guest") return null
        return t.html
    },
})

export const saveTemplate = mutation({
    args: { workspaceId: v.id("workspaces"), name: v.string(), icon: v.optional(v.string()), html: v.string() },
    handler: async (ctx, args) => {
        const { member } = await docMember(ctx, args.workspaceId)
        if (!(await can(ctx, member, "createDocs"))) throw new ConvexError("You don't have permission to save templates")
        const name = cleanTitle(args.name)
        if (args.html.length > 200_000) throw new ConvexError("This page is too large to save as a template")
        const existing = await ctx.db.query("docTemplates").withIndex("by_workspace_id", (q) => q.eq("workspaceId", args.workspaceId)).take(51)
        if (existing.length >= 50) throw new ConvexError("A workspace can keep up to 50 templates")
        return await ctx.db.insert("docTemplates", { workspaceId: args.workspaceId, createdBy: member._id, name, icon: cleanIcon(args.icon), html: args.html })
    },
})

export const removeTemplate = mutation({
    args: { id: v.id("docTemplates") },
    handler: async (ctx, args) => {
        const t = await ctx.db.get(args.id)
        if (!t) return args.id
        const { member } = await docMember(ctx, t.workspaceId)
        if (t.createdBy !== member._id && !(await can(ctx, member, "manageContent"))) throw new ConvexError("Only the creator or an admin can delete this template")
        await ctx.db.delete(args.id)
        return args.id
    },
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
        const row = doc ? null : await ctx.db.query("dbRows").withIndex("by_room_id", (q) => q.eq("roomId", args.roomId)).first()
        const workspaceId = doc?.workspaceId ?? row?.workspaceId
        if (!workspaceId) return null
        const member = await ctx.db
            .query("members")
            .withIndex("byWorkspaceId_user_id", (q) =>
                q.eq("workspaceId", workspaceId).eq("userId", userId)
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
