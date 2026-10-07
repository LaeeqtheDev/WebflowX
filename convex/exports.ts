import { v, ConvexError } from "convex/values"
import { query, QueryCtx } from "./_generated/server"
import { Doc, Id } from "./_generated/dataModel"
import { auth } from "./auth"
import { canAccessChannel, isAdminLike, requireActor } from "./permissions"

const PAGE = 200

const plainText = (body: string) => {
    try {
        const parsed = JSON.parse(body)
        const ops: unknown[] = Array.isArray(parsed) ? parsed : (parsed?.ops ?? [])
        return ops.map((o) => (typeof (o as { insert?: unknown })?.insert === "string" ? (o as { insert: string }).insert : "")).join("").trim()
    } catch {
        return body
    }
}

const TABLES = ["members", "channels", "messages", "tasks", "notes", "sprints", "meetings", "docs", "audit"] as const

// One page of one table of a workspace. The client calls this in a loop and builds the download,
// so a big workspace never has to fit in a single query. Owner and admins only.
// Left out on purpose: direct messages, locked channels the exporter can't open, and other people's personal notes.
export const workspacePage = query({
    args: {
        workspaceId: v.id("workspaces"),
        table: v.union(...TABLES.map((t) => v.literal(t))),
        cursor: v.union(v.string(), v.null()),
    },
    handler: async (ctx, args) => {
        const { member, workspace } = await requireActor(ctx, args.workspaceId)
        if (member.role === "guest") throw new ConvexError("Guests can't export workspace data")
        if (!isAdminLike(workspace, member)) throw new ConvexError("Only the owner or an admin can export the workspace")
        const opts = { numItems: PAGE, cursor: args.cursor }
        const wid = args.workspaceId

        switch (args.table) {
            case "members": {
                const page = await ctx.db.query("members").withIndex("byWorkspaceId", (q) => q.eq("workspaceId", wid)).paginate(opts)
                const rows = await Promise.all(page.page.map(async (m) => {
                    const u = await ctx.db.get(m.userId)
                    return { id: m._id, name: u?.name ?? null, email: u?.email ?? null, title: u?.title ?? null, role: m.role, customRoleId: m.customRoleId ?? null, joinedAt: m._creationTime }
                }))
                return { rows, isDone: page.isDone, cursor: page.continueCursor }
            }
            case "channels": {
                const page = await ctx.db.query("channels").withIndex("byWorkspaceId", (q) => q.eq("workspaceId", wid)).paginate(opts)
                const rows = page.page
                    .filter((c) => canAccessChannel(workspace, member, c))
                    .map((c) => ({ id: c._id, name: c.name, description: c.description ?? null, locked: !!c.isPrivate, readOnly: !!c.readOnly, createdAt: c._creationTime }))
                return { rows, isDone: page.isDone, cursor: page.continueCursor }
            }
            case "messages": {
                const page = await ctx.db.query("messages").withIndex("byWorkspaceId", (q) => q.eq("workspaceId", wid)).paginate(opts)
                const cache = new Map<string, boolean>()
                const rows = []
                for (const m of page.page) {
                    if (m.conversationId || !m.channelId) continue // direct messages stay private
                    let ok = cache.get(m.channelId)
                    if (ok === undefined) {
                        const ch = await ctx.db.get(m.channelId)
                        ok = !!ch && canAccessChannel(workspace, member, ch)
                        cache.set(m.channelId, ok)
                    }
                    if (!ok) continue
                    rows.push({ id: m._id, channelId: m.channelId, authorMemberId: m.memberId, parentMessageId: m.parentMessagesId ?? null, text: plainText(m.body), body: m.body, fileName: m.fileName ?? null, hasImage: !!m.image, createdAt: m._creationTime, editedAt: m.updatedAt ?? null })
                }
                return { rows, isDone: page.isDone, cursor: page.continueCursor }
            }
            case "tasks": {
                const page = await ctx.db.query("tasks").withIndex("by_workspace_id", (q) => q.eq("workspaceId", wid)).paginate(opts)
                return { rows: page.page.map(({ _id, _creationTime, ...rest }) => ({ id: _id, createdAt: _creationTime, ...rest })), isDone: page.isDone, cursor: page.continueCursor }
            }
            case "notes": {
                const page = await ctx.db.query("notes").withIndex("by_workspace_id", (q) => q.eq("workspaceId", wid)).paginate(opts)
                const rows = page.page.filter((n) => n.type !== "personal").map(({ _id, _creationTime, ...rest }) => ({ id: _id, createdAt: _creationTime, ...rest }))
                return { rows, isDone: page.isDone, cursor: page.continueCursor }
            }
            case "sprints": {
                const page = await ctx.db.query("sprints").withIndex("by_workspace_id", (q) => q.eq("workspaceId", wid)).paginate(opts)
                return { rows: page.page.map(({ _id, _creationTime, ...rest }) => ({ id: _id, createdAt: _creationTime, ...rest })), isDone: page.isDone, cursor: page.continueCursor }
            }
            case "meetings": {
                const page = await ctx.db.query("meetings").withIndex("by_workspace_id", (q) => q.eq("workspaceId", wid)).paginate(opts)
                const rows = []
                for (const m of page.page) {
                    const parts = await ctx.db.query("meetingTranscripts").withIndex("by_meeting_id", (q) => q.eq("meetingId", m._id)).take(200)
                    const { _id, _creationTime, ...rest } = m
                    rows.push({ id: _id, createdAt: _creationTime, ...rest, transcript: parts.map(({ _id: _i, _creationTime: _c, meetingId: _m, ...p }) => p) })
                }
                return { rows, isDone: page.isDone, cursor: page.continueCursor }
            }
            case "docs": {
                const page = await ctx.db.query("docs").withIndex("by_workspace_id", (q) => q.eq("workspaceId", wid)).paginate(opts)
                const rows = page.page.map((d) => ({ id: d._id, title: d.title, createdAt: d._creationTime, updatedAt: d.updatedAt ?? null }))
                return { rows, isDone: page.isDone, cursor: page.continueCursor }
            }
            case "audit": {
                const page = await ctx.db.query("auditLog").withIndex("by_workspace_id", (q) => q.eq("workspaceId", wid)).paginate(opts)
                return { rows: page.page.map((a) => ({ id: a._id, actorMemberId: a.actorId, action: a.action, detail: a.detail ?? null, at: a._creationTime })), isDone: page.isDone, cursor: page.continueCursor }
            }
        }
    },
})

const myMember = async (ctx: QueryCtx, workspaceId: Id<"workspaces">) => {
    const userId = await auth.getUserId(ctx)
    if (!userId) throw new ConvexError("Please sign in")
    const member = await ctx.db.query("members").withIndex("byWorkspaceId_user_id", (q) => q.eq("workspaceId", workspaceId).eq("userId", userId)).unique()
    if (!member) throw new ConvexError("You are not a member of this workspace")
    return member
}

// Everything about the signed-in user: profile and the list of workspaces they belong to.
export const me = query({
    args: {},
    handler: async (ctx) => {
        const userId = await auth.getUserId(ctx)
        if (!userId) return null
        const user = await ctx.db.get(userId)
        if (!user) return null
        const memberships = await ctx.db.query("members").withIndex("byUserId", (q) => q.eq("userId", userId)).collect()
        const workspaces = []
        for (const m of memberships) {
            const ws = await ctx.db.get(m.workspaceId)
            if (ws) workspaces.push({ workspaceId: ws._id, workspaceName: ws.name, memberId: m._id, role: m.role })
        }
        return {
            profile: { name: user.name ?? null, email: user.email ?? null, title: user.title ?? null, bio: user.bio ?? null, image: user.image ?? null, joinedAt: user._creationTime },
            workspaces,
        }
    },
})

// The user's own content inside one workspace: what they wrote, notes they own, tasks assigned to them.
export const minePage = query({
    args: {
        workspaceId: v.id("workspaces"),
        table: v.union(v.literal("messages"), v.literal("notes"), v.literal("tasks")),
        cursor: v.union(v.string(), v.null()),
    },
    handler: async (ctx, args) => {
        const member = await myMember(ctx, args.workspaceId)
        const opts = { numItems: PAGE, cursor: args.cursor }
        if (args.table === "messages") {
            const page = await ctx.db.query("messages").withIndex("by_member_id", (q) => q.eq("memberId", member._id)).paginate(opts)
            const rows = page.page.map((m: Doc<"messages">) => ({ id: m._id, channelId: m.channelId ?? null, directMessage: !!m.conversationId, text: plainText(m.body), body: m.body, fileName: m.fileName ?? null, createdAt: m._creationTime }))
            return { rows, isDone: page.isDone, cursor: page.continueCursor }
        }
        if (args.table === "notes") {
            const page = await ctx.db.query("notes").withIndex("by_author_id", (q) => q.eq("authorId", member._id)).paginate(opts)
            const rows = page.page.filter((n) => n.workspaceId === args.workspaceId).map(({ _id, _creationTime, ...rest }) => ({ id: _id, createdAt: _creationTime, ...rest }))
            return { rows, isDone: page.isDone, cursor: page.continueCursor }
        }
        const page = await ctx.db.query("tasks").withIndex("by_assignee_id", (q) => q.eq("assigneeId", member._id)).paginate(opts)
        const rows = page.page.filter((t) => t.workspaceId === args.workspaceId).map(({ _id, _creationTime, ...rest }) => ({ id: _id, createdAt: _creationTime, ...rest }))
        return { rows, isDone: page.isDone, cursor: page.continueCursor }
    },
})
