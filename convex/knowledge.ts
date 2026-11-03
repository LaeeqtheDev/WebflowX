import { v } from "convex/values"
import { internalMutation, internalQuery, MutationCtx, QueryCtx } from "./_generated/server"
import { Doc, Id } from "./_generated/dataModel"
import { deltaToText } from "./validate"
import { canViewChannel } from "./permissions"

// The agents' memory of the workspace: one searchable row per channel message, meeting summary, task, doc and decision.
// `indexTick` (every few minutes) adds what's new and walks back through older history in batches. Search uses
// Convex's built-in text search (ranked, typo-tolerant), so it costs no AI calls at all.

const BATCH = 200
const MAX_TEXT = 6_000

type Kind = "message" | "meeting" | "task" | "doc" | "decision"
type Row = { workspaceId: Id<"workspaces">; kind: Kind; refId: string; channelId?: Id<"channels">; title: string; text: string; at: number }

const strip = (html: string) => html.replace(/<(script|style)[\s\S]*?<\/\1>/gi, " ").replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&#39;|&apos;/g, "'").replace(/&quot;/g, '"').replace(/\s+/g, " ").trim()

const upsert = async (ctx: MutationCtx, row: Row | null, refId: string) => {
    const existing = await ctx.db.query("knowledge").withIndex("by_ref", (q) => q.eq("refId", refId)).unique()
    if (!row || !row.text.trim()) { if (existing) await ctx.db.delete(existing._id); return }
    const text = row.text.slice(0, MAX_TEXT)
    if (existing) {
        if (existing.text === text && existing.title === row.title) return
        await ctx.db.patch(existing._id, { ...row, text })
    } else {
        await ctx.db.insert("knowledge", { ...row, text })
    }
}

// what each source looks like as a knowledge row (null = nothing worth indexing)
const fromMessage = async (ctx: QueryCtx, m: Doc<"messages">): Promise<Row | null> => {
    if (!m.channelId || m.conversationId) return null // direct messages are never indexed
    const channel = await ctx.db.get(m.channelId)
    const member = await ctx.db.get(m.memberId)
    const author = (member ? (await ctx.db.get(member.userId))?.name : null) ?? m.integrationName ?? "Someone"
    const text = deltaToText(m.body).trim()
    if (text.length < 3) return null
    return { workspaceId: m.workspaceId, kind: "message", refId: m._id, channelId: m.channelId, title: `${author} in #${channel?.name ?? "channel"}`, text: `${author}: ${text}`, at: m._creationTime }
}
const fromMeeting = (m: Doc<"meetings">): Row | null =>
    m.deletedAt || m.sample || !m.summary?.trim() ? null
        : { workspaceId: m.workspaceId, kind: "meeting", refId: m._id, title: m.title, text: `${m.title}\n${m.summary}`, at: m.startedAt }
const fromTask = (t: Doc<"tasks">): Row => ({ workspaceId: t.workspaceId, kind: "task", refId: t._id, title: t.title, text: `${t.title}\n${t.description ?? ""}`.trim(), at: t._creationTime })
const fromDoc = async (ctx: QueryCtx, d: Doc<"docs">): Promise<Row | null> => {
    if (d.deletedAt || d.type !== "document") return null
    const latest = await ctx.db.query("docVersions").withIndex("by_doc", (q) => q.eq("docId", d._id)).order("desc").first()
    const body = latest ? strip(latest.html) : ""
    return { workspaceId: d.workspaceId, kind: "doc", refId: d._id, title: d.title, text: `${d.title}\n${body}`.trim(), at: latest?._creationTime ?? d._creationTime }
}

// One pass of the indexer for one kind: everything newer than the last pass, then a batch of older history.
const pass = async (ctx: MutationCtx, kind: Kind) => {
    const cur = await ctx.db.query("knowledgeCursor").withIndex("by_kind", (q) => q.eq("kind", kind)).unique()
    const newest = cur?.newest ?? Date.now()
    const table = kind === "message" ? "messages" : kind === "meeting" ? "meetings" : kind === "task" ? "tasks" : "docs"
    // docs and tasks change after they're created, so they're re-read by their last update (docs via versions)
    const fresh = await ctx.db.query(table).withIndex("by_creation_time", (q) => q.gt("_creationTime", newest)).order("asc").take(BATCH)
    const rowOf = async (doc: Doc<typeof table>): Promise<Row | null> =>
        kind === "message" ? fromMessage(ctx, doc as Doc<"messages">)
            : kind === "meeting" ? fromMeeting(doc as Doc<"meetings">)
            : kind === "task" ? fromTask(doc as Doc<"tasks">)
            : fromDoc(ctx, doc as Doc<"docs">)
    for (const d of fresh) await upsert(ctx, await rowOf(d), d._id)
    const nextNewest = fresh.length ? fresh[fresh.length - 1]._creationTime : newest
    let oldest = cur?.oldest ?? newest
    let backfillDone = cur?.backfillDone ?? false
    if (!backfillDone) {
        const older = await ctx.db.query(table).withIndex("by_creation_time", (q) => q.lt("_creationTime", oldest)).order("desc").take(BATCH)
        for (const d of older) await upsert(ctx, await rowOf(d), d._id)
        if (older.length < BATCH) backfillDone = true
        if (older.length) oldest = older[older.length - 1]._creationTime
    }
    if (cur) await ctx.db.patch(cur._id, { newest: nextNewest, oldest, backfillDone })
    else await ctx.db.insert("knowledgeCursor", { kind, newest: nextNewest, oldest, backfillDone })
    return fresh.length
}

export const indexTick = internalMutation({
    args: {},
    handler: async (ctx) => {
        let n = 0
        for (const kind of ["message", "meeting", "task", "doc"] as const) n += await pass(ctx, kind)
        return n
    },
})

// Called when a source changes after it was first indexed (summary saved, task edited, doc version saved).
export const refresh = internalMutation({
    args: { kind: v.union(v.literal("message"), v.literal("meeting"), v.literal("task"), v.literal("doc")), id: v.string() },
    handler: async (ctx, args) => {
        const table = args.kind === "message" ? "messages" : args.kind === "meeting" ? "meetings" : args.kind === "task" ? "tasks" : "docs"
        const id = ctx.db.normalizeId(table, args.id)
        const doc = id ? await ctx.db.get(id) : null
        const row = !doc ? null
            : args.kind === "message" ? await fromMessage(ctx, doc as Doc<"messages">)
            : args.kind === "meeting" ? fromMeeting(doc as Doc<"meetings">)
            : args.kind === "task" ? fromTask(doc as Doc<"tasks">)
            : await fromDoc(ctx, doc as Doc<"docs">)
        await upsert(ctx, row, args.id)
        return null
    },
})

// ---------- reading (always as a specific member, with permission checks) ----------

export type Hit = { kind: Kind; refId: string; channelId: string | null; title: string; text: string; at: number }

const visibleHits = async (ctx: QueryCtx, member: Doc<"members">, rows: Doc<"knowledge">[]) => {
    const out: Hit[] = []
    const channelOk = new Map<string, boolean>()
    for (const k of rows) {
        if (k.workspaceId !== member.workspaceId) continue
        if (k.kind === "message") {
            if (!k.channelId) continue
            const key = String(k.channelId)
            if (!channelOk.has(key)) channelOk.set(key, await canViewChannel(ctx, k.channelId, member.userId))
            if (!channelOk.get(key)) continue
            const msg = await ctx.db.get(k.refId as Id<"messages">)
            if (!msg) continue
        } else if (k.kind === "meeting") {
            const m = await ctx.db.get(k.refId as Id<"meetings">)
            if (!m || m.deletedAt || (m.kind === "oneToOne" && m.createdBy !== member._id && m.inviteeId !== member._id)) continue
        } else if (k.kind === "doc") {
            const d = await ctx.db.get(k.refId as Id<"docs">)
            if (!d || d.deletedAt) continue
        } else if (k.kind === "decision") {
            if (!(await ctx.db.get(k.refId as Id<"decisions">))) continue
        } else {
            if (!(await ctx.db.get(k.refId as Id<"tasks">))) continue
        }
        out.push({ kind: k.kind, refId: k.refId, channelId: k.channelId ?? null, title: k.title, text: k.text.slice(0, 900), at: k.at })
    }
    return out
}

export const textSearch = internalQuery({
    args: { memberId: v.id("members"), query: v.string(), kind: v.optional(v.union(v.literal("message"), v.literal("meeting"), v.literal("task"), v.literal("doc"), v.literal("decision"))) },
    handler: async (ctx, args) => {
        const member = await ctx.db.get(args.memberId)
        const q = args.query.trim().slice(0, 200)
        if (!member || member.role === "guest" || !q) return []
        const rows = await ctx.db.query("knowledge").withSearchIndex("search_text", (s) => {
            const base = s.search("text", q).eq("workspaceId", member.workspaceId)
            return args.kind ? base.eq("kind", args.kind) : base
        }).take(30)
        return await visibleHits(ctx, member, rows)
    },
})

// Decisions are written straight into the index when they're extracted (see decisions.ts).
export const putDecision = async (ctx: MutationCtx, d: Doc<"decisions">, meetingTitle: string | null) =>
    upsert(ctx, { workspaceId: d.workspaceId, kind: "decision", refId: d._id, title: meetingTitle ? `Decision in ${meetingTitle}` : "Decision", text: d.text, at: d._creationTime }, d._id)

export const byIds = internalQuery({
    args: { memberId: v.id("members"), ids: v.array(v.id("knowledge")), kind: v.optional(v.string()) },
    handler: async (ctx, args) => {
        const member = await ctx.db.get(args.memberId)
        if (!member || member.role === "guest") return []
        const rows = (await Promise.all(args.ids.map((id) => ctx.db.get(id)))).filter((r): r is Doc<"knowledge"> => !!r && (!args.kind || r.kind === args.kind))
        return await visibleHits(ctx, member, rows)
    },
})
