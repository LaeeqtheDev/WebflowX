import { v, ConvexError } from "convex/values"
import { mutation, query, MutationCtx, QueryCtx } from "./_generated/server"
import { Doc, Id } from "./_generated/dataModel"
import { auth } from "./auth"
import { assert2fa, canViewChannel } from "./permissions"
import { throttle } from "./rateLimit"
import { notify } from "./notifications"

// Comments, version history and @mentions for docs, plus the "last read" marker for channels.
// Docs are open to every non-guest member of the workspace, so the access check is the same everywhere.

const MAX_COMMENT = 4000
const MAX_QUOTE = 500
const MAX_HTML = 600_000 // ~600 KB of HTML per saved version (well under Convex's 1 MB document limit)
const KEEP_VERSIONS = 50
const AUTO_EVERY_MS = 10 * 60_000

const openDoc = async (ctx: QueryCtx | MutationCtx, docId: Id<"docs">) => {
    const userId = await auth.getUserId(ctx)
    if (!userId) return null
    const doc = await ctx.db.get(docId)
    if (!doc || doc.deletedAt) return null
    const member = await ctx.db.query("members")
        .withIndex("byWorkspaceId_user_id", (q) => q.eq("workspaceId", doc.workspaceId).eq("userId", userId)).unique()
    if (!member || member.role === "guest") return null
    await assert2fa(ctx, member)
    return { userId, doc, member }
}
const mustOpen = async (ctx: MutationCtx, docId: Id<"docs">) => {
    const r = await openDoc(ctx, docId)
    if (!r) throw new ConvexError("Doc not found")
    return r
}
const nameOf = async (ctx: QueryCtx, m: Doc<"members"> | null) => (m ? (await ctx.db.get(m.userId))?.name ?? "Member" : "Member")
const clean = (raw: string, max: number, what: string) => {
    const t = raw.trim()
    if (!t) throw new ConvexError(`${what} can't be empty`)
    if (t.length > max) throw new ConvexError(`${what} is too long`)
    return t
}

// ---------- comments ----------

export const comments = query({
    args: { docId: v.id("docs") },
    handler: async (ctx, args) => {
        const r = await openDoc(ctx, args.docId)
        if (!r) return []
        const rows = await ctx.db.query("docComments").withIndex("by_doc", (q) => q.eq("docId", args.docId)).take(500)
        return await Promise.all(rows.map(async (c) => {
            const m = await ctx.db.get(c.memberId)
            const u = m ? await ctx.db.get(m.userId) : null
            return { ...c, author: u?.name ?? "Member", image: u?.image, mine: c.memberId === r.member._id }
        }))
    },
})

export const addComment = mutation({
    args: { docId: v.id("docs"), body: v.string(), quote: v.optional(v.string()), parentId: v.optional(v.id("docComments")) },
    handler: async (ctx, args) => {
        const { userId, doc, member } = await mustOpen(ctx, args.docId)
        await throttle(ctx, userId, "doc-comment", 30, 60_000, "commenting")
        const body = clean(args.body, MAX_COMMENT, "Comment")
        const parent = args.parentId ? await ctx.db.get(args.parentId) : null
        if (args.parentId && (!parent || parent.docId !== args.docId)) throw new ConvexError("Comment not found")
        const quote = parent ? undefined : args.quote?.trim().slice(0, MAX_QUOTE) || undefined
        const id = await ctx.db.insert("docComments", {
            docId: args.docId, workspaceId: doc.workspaceId, memberId: member._id, body, quote, parentId: parent?._id,
        })
        // tell the page's creator and, for a reply, whoever started the thread
        const recipients = new Set<Id<"members">>([doc.createdBy])
        if (parent) recipients.add(parent.memberId)
        recipients.delete(member._id)
        for (const r of recipients) {
            await notify(ctx, { workspaceId: doc.workspaceId, recipientId: r, senderId: member._id, type: "doc_comment", read: false, docId: doc._id, body: `${doc.title}: ${body.slice(0, 120)}` }, { email: false })
        }
        return id
    },
})

export const resolveComment = mutation({
    args: { id: v.id("docComments"), resolved: v.boolean() },
    handler: async (ctx, args) => {
        const c = await ctx.db.get(args.id)
        if (!c) throw new ConvexError("Comment not found")
        await mustOpen(ctx, c.docId)
        await ctx.db.patch(c._id, { resolved: args.resolved })
        return null
    },
})

export const deleteComment = mutation({
    args: { id: v.id("docComments") },
    handler: async (ctx, args) => {
        const c = await ctx.db.get(args.id)
        if (!c) throw new ConvexError("Comment not found")
        const { member } = await mustOpen(ctx, c.docId)
        if (c.memberId !== member._id && member.role !== "admin") throw new ConvexError("You can only delete your own comments")
        for (const reply of await ctx.db.query("docComments").withIndex("by_doc", (q) => q.eq("docId", c.docId)).take(500)) {
            if (reply.parentId === c._id) await ctx.db.delete(reply._id)
        }
        await ctx.db.delete(c._id)
        return null
    },
})

// ---------- version history ----------

export const versions = query({
    args: { docId: v.id("docs") },
    handler: async (ctx, args) => {
        const r = await openDoc(ctx, args.docId)
        if (!r) return []
        const rows = await ctx.db.query("docVersions").withIndex("by_doc", (q) => q.eq("docId", args.docId)).order("desc").take(KEEP_VERSIONS)
        return await Promise.all(rows.map(async (x) => ({
            _id: x._id, _creationTime: x._creationTime, title: x.title, label: x.label, size: x.html.length,
            author: await nameOf(ctx, await ctx.db.get(x.memberId)),
        })))
    },
})

export const version = query({
    args: { id: v.id("docVersions") },
    handler: async (ctx, args) => {
        const x = await ctx.db.get(args.id)
        if (!x || !(await openDoc(ctx, x.docId))) return null
        return { html: x.html, title: x.title, _creationTime: x._creationTime }
    },
})

// `auto`: sent by the editor while someone works; skipped if the content hasn't changed or the last copy is recent.
export const saveVersion = mutation({
    args: { docId: v.id("docs"), html: v.string(), auto: v.optional(v.boolean()), label: v.optional(v.string()) },
    handler: async (ctx, args) => {
        const { userId, doc, member } = await mustOpen(ctx, args.docId)
        await throttle(ctx, userId, "doc-version", 20, 60 * 60_000, "saving versions")
        if (args.html.length > MAX_HTML) throw new ConvexError("This page is too large to save a copy of")
        const latest = await ctx.db.query("docVersions").withIndex("by_doc", (q) => q.eq("docId", args.docId)).order("desc").first()
        if (latest && latest.html === args.html) return null
        if (args.auto && latest && Date.now() - latest._creationTime < AUTO_EVERY_MS) return null
        const id = await ctx.db.insert("docVersions", {
            docId: doc._id, workspaceId: doc.workspaceId, memberId: member._id, title: doc.title, html: args.html,
            label: args.label?.trim().slice(0, 80) || undefined,
        })
        // keep the newest copies only
        const all = await ctx.db.query("docVersions").withIndex("by_doc", (q) => q.eq("docId", args.docId)).order("desc").take(KEEP_VERSIONS + 20)
        for (const old of all.slice(KEEP_VERSIONS)) await ctx.db.delete(old._id)
        return id
    },
})

// ---------- @mentions in docs ----------

export const mention = mutation({
    args: { docId: v.id("docs"), memberId: v.id("members") },
    handler: async (ctx, args) => {
        const { userId, doc, member } = await mustOpen(ctx, args.docId)
        await throttle(ctx, userId, "doc-mention", 30, 60_000, "mentioning people")
        const target = await ctx.db.get(args.memberId)
        if (!target || target.workspaceId !== doc.workspaceId || target.role === "guest") throw new ConvexError("That person can't open this doc")
        if (target._id === member._id) return null
        await notify(ctx, { workspaceId: doc.workspaceId, recipientId: target._id, senderId: member._id, type: "doc_mention", read: false, docId: doc._id, body: doc.title }, { email: false })
        return null
    },
})

// ---------- "New messages" line in channels ----------

// The reader's previous "last read" time for a channel (so the line stays put while they read), then moves it to now.
export const lastRead = query({
    args: { channelId: v.id("channels") },
    handler: async (ctx, args) => {
        const userId = await auth.getUserId(ctx)
        const channel = await ctx.db.get(args.channelId)
        if (!userId || !channel || !(await canViewChannel(ctx, channel._id, userId))) return null
        const member = await ctx.db.query("members")
            .withIndex("byWorkspaceId_user_id", (q) => q.eq("workspaceId", channel.workspaceId).eq("userId", userId)).unique()
        if (!member) return null
        const row = await ctx.db.query("channelReads").withIndex("by_member_channel", (q) => q.eq("memberId", member._id).eq("channelId", channel._id)).unique()
        return row?.lastReadAt ?? null
    },
})

export const markRead = mutation({
    args: { channelId: v.id("channels") },
    handler: async (ctx, args) => {
        const userId = await auth.getUserId(ctx)
        const channel = await ctx.db.get(args.channelId)
        if (!userId || !channel || !(await canViewChannel(ctx, channel._id, userId))) return null
        const member = await ctx.db.query("members")
            .withIndex("byWorkspaceId_user_id", (q) => q.eq("workspaceId", channel.workspaceId).eq("userId", userId)).unique()
        if (!member) return null
        const row = await ctx.db.query("channelReads").withIndex("by_member_channel", (q) => q.eq("memberId", member._id).eq("channelId", channel._id)).unique()
        const now = Date.now()
        if (row) { if (now - row.lastReadAt > 5_000) await ctx.db.patch(row._id, { lastReadAt: now }) }
        else await ctx.db.insert("channelReads", { memberId: member._id, channelId: channel._id, lastReadAt: now })
        return null
    },
})
