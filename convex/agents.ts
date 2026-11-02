import { v, ConvexError } from "convex/values"
import { internalMutation, internalQuery, mutation, query, MutationCtx, QueryCtx } from "./_generated/server"
import { Doc, Id } from "./_generated/dataModel"
import { internal } from "./_generated/api"
import { auth } from "./auth"
import { findMember } from "./access"
import { assert2fa, can, canViewChannel, roleOf } from "./permissions"
import { checkLimit, historyCutoff } from "./limits"
import { consume, throttle } from "./rateLimit"
import { logAudit } from "./audit"
import { notify } from "./notifications"
import { emit, plainToDelta } from "./integrations"
import { MAX, deltaToText, snippetOf } from "./validate"
import { noteReplyAdded } from "./messageHelpers"

// AI agents that work inside a workspace. They act for the admin who switched them on, and in "suggest" mode
// nothing they propose touches the workspace until someone approves it.
//  - meetingFollowUp: after a meeting's AI summary, turns the action items into tasks and posts a recap
//  - triage: watches chosen channels and turns requests ("can someone fix…") into tasks, replying in the thread
//  - standup: every morning posts what got done, what's due today and what's overdue, plus anything notable from chat

export type AgentKind = "meetingFollowUp" | "triage" | "standup" | "assistant"
export const AGENT_NAMES: Record<AgentKind, string> = { meetingFollowUp: "Follow-up agent", triage: "Triage agent", standup: "Standup agent", assistant: "WebflowX Agent" }
export const AGENT_NAME = AGENT_NAMES.meetingFollowUp
// most tasks and characters one run may create, whatever the model says
export const MAX_TASKS_PER_RUN = 12
export const MAX_RECAP = 2_000
// triage waits this long after a request so a burst of messages is read (and paid for) as one run
export const TRIAGE_DELAY_MS = 60_000
export const TRIAGE_BATCH = 20
export const MAX_WATCHED = 10

type Action = Doc<"agentRuns">["actions"][number]
type Ctx = QueryCtx | MutationCtx
const kindV = v.union(v.literal("meetingFollowUp"), v.literal("triage"), v.literal("standup"), v.literal("assistant"))

const signedInMember = async (ctx: Ctx, workspaceId: Id<"workspaces">) => {
    const userId = await auth.getUserId(ctx)
    if (!userId) return null
    const member = await findMember(ctx, workspaceId, userId)
    if (!member || member.role === "guest") return null
    await assert2fa(ctx, member)
    return member
}

// Turning agents on and off is for the owner and admins: the agent acts with their permissions.
const isAdmin = async (ctx: Ctx, member: Doc<"members">) => {
    const workspace = await ctx.db.get(member.workspaceId)
    if (!workspace) return false
    const role = roleOf(workspace, member)
    return role === "owner" || role === "admin"
}

const agentFor = (ctx: Ctx, workspaceId: Id<"workspaces">, kind: AgentKind) =>
    ctx.db.query("agents").withIndex("by_workspace_kind", (q) => q.eq("workspaceId", workspaceId).eq("kind", kind)).unique()

const startOfMonth = () => {
    const now = new Date()
    return new Date(now.getFullYear(), now.getMonth(), 1).getTime()
}

const monthRuns = (ctx: Ctx, workspaceId: Id<"workspaces">) =>
    ctx.db.query("agentRuns")
        .withIndex("by_workspace_id", (q) => q.eq("workspaceId", workspaceId).gte("_creationTime", startOfMonth()))
        .take(1_200)
const runsThisMonth = async (ctx: Ctx, workspaceId: Id<"workspaces">) => (await monthRuns(ctx, workspaceId)).length

// Runs used this month against the plan allowance (all agents share it).
const monthlyCheck = async (ctx: Ctx, workspaceId: Id<"workspaces">) =>
    await checkLimit(ctx, workspaceId, "agentRuns", await runsThisMonth(ctx, workspaceId))

const enqueue = async (ctx: MutationCtx, agent: Doc<"agents">, meeting: Doc<"meetings">, startedBy: Id<"members">) => {
    const runId = await ctx.db.insert("agentRuns", {
        workspaceId: agent.workspaceId,
        agentId: agent._id,
        meetingId: meeting._id,
        startedBy,
        status: "queued",
        actions: [],
    })
    await ctx.scheduler.runAfter(0, internal.agentRunner.run, { runId })
    return runId
}

// Called when a meeting's AI summary is saved. Runs once per meeting, only for real AI summaries
// (not the "no transcript" or error notes), and quietly skips when the month's runs are used up.
export const maybeAutoRun = async (ctx: MutationCtx, meeting: Doc<"meetings">, member: Doc<"members">) => {
    const agent = await agentFor(ctx, meeting.workspaceId, "meetingFollowUp")
    if (!agent?.enabled || meeting.deletedAt) return null
    const claims = await ctx.db.query("aiSummaryLog").withIndex("by_meeting_id", (q) => q.eq("meetingId", meeting._id)).take(20)
    if (!claims.some((c) => c.consumed)) return null
    const earlier = await ctx.db.query("agentRuns").withIndex("by_meeting_id", (q) => q.eq("meetingId", meeting._id)).first()
    if (earlier) return null
    const { allowed } = await monthlyCheck(ctx, meeting.workspaceId)
    if (!allowed) return null
    return await enqueue(ctx, agent, meeting, member._id)
}

// A cheap first look so the model only reads messages that might be asking for something to be done.
const REQUEST = [
    /\b(can|could|would|will) (someone|somebody|anyone|you|u|we)\b/i,
    /\b(please|pls|plz)\b/i,
    /\b(need|needs) (to|someone|somebody|a|an)\b/i,
    /\b(i'?ll|i will|i can|let me) (do|take|handle|fix|send|write|look|check|update|set|get|make|sort|ship)\b/i,
    /\b(todo|to-do|action item|follow up|follow-up|deadline|asap|by (mon|tue|wed|thu|fri|sat|sun|tomorrow|today|eod|end of))/i,
    /\b(fix|broken|bug|is down|not working|doesn'?t work|fails?|crash(es|ed)?)\b/i,
    /\b(remind|assign|owner)\b/i,
]
export const looksLikeRequest = (text: string) => {
    const t = text.trim()
    if (t.length < 12 || t.length > 4_000) return false
    return REQUEST.some((r) => r.test(t))
}

// Called after a new top-level message in a channel. Requests in watched channels are gathered for a minute
// and then read together in one run.
export const maybeQueueTriage = async (ctx: MutationCtx, message: Doc<"messages">) => {
    if (!message.channelId || message.parentMessagesId || message.integrationName || message.agent) return null
    const agent = await agentFor(ctx, message.workspaceId, "triage")
    if (!agent?.enabled || !agent.channelIds?.includes(message.channelId)) return null
    if (!looksLikeRequest(deltaToText(message.body))) return null
    const waiting = await ctx.db.query("agentRuns")
        .withIndex("by_channel_status", (q) => q.eq("channelId", message.channelId).eq("status", "queued"))
        .first()
    if (waiting && waiting.agentId === agent._id && (waiting.messageIds?.length ?? 0) < TRIAGE_BATCH) {
        await ctx.db.patch(waiting._id, { messageIds: [...(waiting.messageIds ?? []), message._id] })
        return waiting._id
    }
    const { allowed } = await monthlyCheck(ctx, message.workspaceId)
    if (!allowed) return null
    const runId = await ctx.db.insert("agentRuns", {
        workspaceId: message.workspaceId,
        agentId: agent._id,
        channelId: message.channelId,
        messageIds: [message._id],
        startedBy: message.memberId,
        status: "queued",
        actions: [],
    })
    await ctx.scheduler.runAfter(TRIAGE_DELAY_MS, internal.agentRunner.run, { runId })
    return runId
}

// ---------- "@agent" in chat ----------

export const mentionsAgent = (text: string) => /(^|[\s(])@agent\b/i.test(text)
export const MAX_ASKS_PER_HOUR = 20

// Called after any new channel message (top level or in a thread). "@agent …" gets an answer in the thread,
// written from what the person asking is allowed to see, and any tasks they asked for, made as them.
export const maybeAnswer = async (ctx: MutationCtx, message: Doc<"messages">) => {
    if (!message.channelId || message.integrationName || message.agent) return null
    const text = deltaToText(message.body)
    if (!mentionsAgent(text)) return null
    const found = await agentFor(ctx, message.workspaceId, "assistant")
    if (!assistantOn(found)) return null
    const asker = await ctx.db.get(message.memberId)
    if (!asker || asker.role === "guest") return null
    const agent = found ?? await (async () => {
        // first @agent in a workspace: create its settings row (acts as the asker, so no admin is needed)
        const id = await ctx.db.insert("agents", { workspaceId: message.workspaceId, kind: "assistant", enabled: true, mode: "act", createdBy: message.memberId, updatedAt: Date.now() })
        return (await ctx.db.get(id))!
    })()
    const member = await ctx.db.get(message.memberId)
    if (!member || member.role === "guest") return null
    // the answer goes under the thread's first message
    const rootId = message.parentMessagesId ?? message._id
    const say = async (reply: string) => {
        const id = await ctx.db.insert("messages", {
            memberId: member._id, body: plainToDelta(reply), workspaceId: message.workspaceId, channelId: message.channelId,
            parentMessagesId: rootId, integrationName: AGENT_NAMES.assistant, agent: true,
        })
        const row = await ctx.db.get(id)
        if (row) await noteReplyAdded(ctx, rootId, row)
        return null
    }
    if (!(await consume(ctx, `agent-ask:${member.userId}`, MAX_ASKS_PER_HOUR, 60 * 60_000))) {
        return await say("You've asked me a lot this hour. Give me a few minutes and ask again.")
    }
    const { allowed } = await monthlyCheck(ctx, message.workspaceId)
    if (!allowed) return await say("This workspace has used this month's agent runs. An admin can upgrade the plan to keep going.")
    const runId = await ctx.db.insert("agentRuns", {
        workspaceId: message.workspaceId, agentId: agent._id, channelId: message.channelId, messageIds: [message._id],
        startedBy: member._id, status: "queued", actions: [],
    })
    await ctx.scheduler.runAfter(0, internal.agentRunner.run, { runId })
    return runId
}

// Lets the chat box offer "@agent" in its mention list only when the workspace has it on.
// @agent in chat is on unless an admin switched it off: it only ever acts as the person asking, with their permissions.
const assistantOn = (a: Doc<"agents"> | null) => (a ? a.enabled : true)

export const chatAgentOn = query({
    args: { workspaceId: v.id("workspaces") },
    handler: async (ctx, args) => {
        const member = await signedInMember(ctx, args.workspaceId)
        if (!member) return false
        if (member.role === "guest") return false
        return assistantOn(await agentFor(ctx, args.workspaceId, "assistant"))
    },
})

// The chat agent's search tools. Everything is filtered by what the person who asked can see.
export const search = internalQuery({
    args: { runId: v.id("agentRuns"), what: v.union(v.literal("messages"), v.literal("tasks"), v.literal("meetings")), query: v.string() },
    handler: async (ctx, args) => {
        const run = await ctx.db.get(args.runId)
        const asker = run ? await ctx.db.get(run.startedBy) : null
        if (!run || !asker) return []
        const q = args.query.trim().slice(0, 200)
        if (!q) return []
        const words = q.toLowerCase().split(/\W+/).filter((w) => w.length > 2)
        const hits = (s: string) => { const t = s.toLowerCase(); return words.filter((w) => t.includes(w)).length }
        const nameOf = async (memberId?: Id<"members">) => {
            const m = memberId ? await ctx.db.get(memberId) : null
            const u = m ? await ctx.db.get(m.userId) : null
            return u?.name ?? u?.email ?? null
        }
        const when = (ms: number) => new Date(ms).toISOString().slice(0, 10)

        if (args.what === "messages") {
            const workspace = await ctx.db.get(run.workspaceId)
            const cutoff = historyCutoff(workspace?.plan)
            const found = await ctx.db.query("messages")
                .withSearchIndex("search_body", (s) => s.search("body", q).eq("workspaceId", run.workspaceId))
                .take(40)
            const seen = new Map<string, string | null>()
            const out = []
            for (const m of found) {
                // channels only (never DMs), only ones the asker can open, within the plan's history
                if (!m.channelId || (cutoff !== null && m._creationTime < cutoff)) continue
                if (!seen.has(m.channelId)) {
                    const ch = await ctx.db.get(m.channelId)
                    seen.set(m.channelId, ch && (await canViewChannel(ctx, ch._id, asker.userId)) ? ch.name : null)
                }
                const channel = seen.get(m.channelId)
                if (!channel) continue
                out.push({ channel, author: m.integrationName ?? (await nameOf(m.memberId)) ?? "Someone", date: when(m._creationTime), text: snippetOf(m.body, 300) })
                if (out.length >= 10) break
            }
            return out
        }
        if (args.what === "tasks") {
            const tasks = await ctx.db.query("tasks").withIndex("by_workspace_id", (s) => s.eq("workspaceId", run.workspaceId)).order("desc").take(1_000)
            const ranked = tasks.map((t) => ({ t, n: hits(`${t.title} ${t.description ?? ""}`) })).filter((x) => x.n > 0).sort((a, b) => b.n - a.n).slice(0, 10)
            return await Promise.all(ranked.map(async ({ t }) => ({
                task_id: t._id, title: t.title, status: t.status.replace("_", " "), owner: await nameOf(t.assigneeId), due: t.dueDate ? when(t.dueDate) : null, priority: t.priority,
            })))
        }
        const meetings = await ctx.db.query("meetings").withIndex("by_workspace_started", (s) => s.eq("workspaceId", run.workspaceId)).order("desc").take(150)
        const visible = meetings.filter((m) => !m.deletedAt && (m.kind !== "oneToOne" || m.createdBy === asker._id || m.inviteeId === asker._id))
        const ranked = visible.map((m) => ({ m, n: hits(`${m.title} ${m.summary ?? ""}`) })).filter((x) => x.n > 0).sort((a, b) => b.n - a.n).slice(0, 5)
        return ranked.map(({ m }) => ({ title: m.title, date: when(m.startedAt), summary: (m.summary ?? "").slice(0, 900) }))
    },
})

// "What's on my plate?": the asker's open tasks, overdue first, then by due date.
export const myTasks = internalQuery({
    args: { runId: v.id("agentRuns") },
    handler: async (ctx, args) => {
        const run = await ctx.db.get(args.runId)
        const asker = run ? await ctx.db.get(run.startedBy) : null
        if (!run || !asker) return []
        const rows = await ctx.db.query("tasks").withIndex("by_assignee_id", (q) => q.eq("assigneeId", asker._id)).take(300)
        const now = Date.now()
        return rows
            .filter((t) => t.workspaceId === run.workspaceId && t.status !== "done")
            .sort((x, y) => (x.dueDate ?? Infinity) - (y.dueDate ?? Infinity))
            .slice(0, 25)
            .map((t) => ({
                task_id: t._id, title: t.title, status: t.status.replace("_", " "), priority: t.priority,
                due: t.dueDate ? new Date(t.dueDate).toISOString().slice(0, 10) : null, overdue: !!t.dueDate && t.dueDate < now - 86_400_000 / 2,
            }))
    },
})

// "Catch me up": the messages someone missed in a channel since their last visit (or the last day), for a private
// summary. Counts as one agent run; nothing is posted.
export const startCatchUp = internalMutation({
    args: { channelId: v.id("channels"), userId: v.id("users") },
    handler: async (ctx, args) => {
        const channel = await ctx.db.get(args.channelId)
        if (!channel || !(await canViewChannel(ctx, channel._id, args.userId))) throw new ConvexError("Channel not found")
        const member = await findMember(ctx, channel.workspaceId, args.userId)
        if (!member || member.role === "guest") throw new ConvexError("Catch me up isn't available to guests")
        if (!assistantOn(await agentFor(ctx, channel.workspaceId, "assistant"))) throw new ConvexError("An admin has switched off the chat agent in this workspace")
        if (!(await consume(ctx, `agent-ask:${args.userId}`, MAX_ASKS_PER_HOUR, 60 * 60_000))) throw new ConvexError("You've asked the agent a lot this hour. Try again a little later.")
        const { allowed, limit, plan } = await monthlyCheck(ctx, channel.workspaceId)
        if (!allowed) throw new ConvexError(`LIMIT_REACHED:agentRuns:${limit}:${plan}`)
        const read = await ctx.db.query("channelReads").withIndex("by_member_channel", (q) => q.eq("memberId", member._id).eq("channelId", channel._id)).unique()
        const since = Math.min(read?.lastReadAt ?? Infinity, Date.now() - 86_400_000)
        const workspace = await ctx.db.get(channel.workspaceId)
        const floor = Math.max(since, historyCutoff(workspace?.plan) ?? 0)
        const rows = await ctx.db.query("messages")
            .withIndex("by_channel_id_parent_message_id_conversation_id", (q) => q.eq("channelId", channel._id))
            .order("desc").take(400)
        const recent = rows.filter((m) => m._creationTime > floor && !m.agent).slice(0, 150).reverse()
        const names = new Map<string, string>()
        const lines = []
        for (const m of recent) {
            const key = String(m.memberId)
            if (!names.has(key)) {
                const mm = await ctx.db.get(m.memberId)
                names.set(key, (mm ? (await ctx.db.get(mm.userId))?.name : null) ?? m.integrationName ?? "Someone")
            }
            const text = deltaToText(m.body).trim()
            if (text) lines.push({ at: m._creationTime, name: names.get(key)!, text: text.slice(0, 600), reply: !!m.parentMessagesId })
        }
        let agent = await agentFor(ctx, channel.workspaceId, "assistant")
        if (!agent) {
            const id = await ctx.db.insert("agents", { workspaceId: channel.workspaceId, kind: "assistant", enabled: true, mode: "act", createdBy: member._id, updatedAt: Date.now() })
            agent = await ctx.db.get(id)
        }
        const runId = await ctx.db.insert("agentRuns", {
            workspaceId: channel.workspaceId, agentId: agent!._id, channelId: channel._id, startedBy: member._id, status: "running", actions: [],
        })
        const me = (await ctx.db.get(member.userId))?.name ?? "you"
        return { runId, channel: channel.name, me, since: read?.lastReadAt ?? null, lines }
    },
})

export const finishCatchUp = internalMutation({
    args: { runId: v.id("agentRuns"), note: v.string() },
    handler: async (ctx, args) => {
        const run = await ctx.db.get(args.runId)
        if (run && run.status === "running") await ctx.db.patch(run._id, { status: "done", note: args.note.slice(0, 300), finishedAt: Date.now() })
        return null
    },
})

// ---------- what the screens read ----------

const describeRun = async (ctx: QueryCtx, run: Doc<"agentRuns">) => {
    const agent = await ctx.db.get(run.agentId)
    const meeting = run.meetingId ? await ctx.db.get(run.meetingId) : null
    const channel = run.channelId ? await ctx.db.get(run.channelId) : null
    const nameOf = async (memberId?: Id<"members">) => {
        if (!memberId) return null
        const m = await ctx.db.get(memberId)
        const u = m ? await ctx.db.get(m.userId) : null
        return u?.name ?? u?.email ?? null
    }
    const actions = await Promise.all(run.actions.map(async (a) => {
        if (a.type === "task") {
            const src = a.sourceMessageId ? await ctx.db.get(a.sourceMessageId) : null
            return {
                ...a,
                assigneeName: await nameOf(a.assigneeId),
                source: src ? { text: snippetOf(src.body, 140), author: (await nameOf(src.memberId)) ?? "Someone" } : null,
            }
        }
        if (a.type === "update") return { ...a, assigneeName: await nameOf(a.assigneeId) }
        const ch = await ctx.db.get(a.channelId)
        return { ...a, channelName: ch?.name ?? "deleted channel" }
    }))
    return {
        _id: run._id,
        _creationTime: run._creationTime,
        kind: (agent?.kind ?? "meetingFollowUp") as AgentKind,
        status: run.status,
        note: run.note ?? null,
        error: run.error ?? null,
        finishedAt: run.finishedAt ?? null,
        meetingId: run.meetingId ?? null,
        meetingTitle: meeting && !meeting.deletedAt ? meeting.title : null,
        channelName: channel?.name ?? null,
        decidedByName: await nameOf(run.decidedBy),
        actions,
    }
}

const settingsOf = (a: Doc<"agents"> | null) =>
    a ? {
        enabled: a.enabled, mode: a.mode, channelId: a.channelId ?? null, channelIds: a.channelIds ?? [],
        postHour: a.postHour ?? 9, postTz: a.postTz ?? "UTC", weekdaysOnly: a.weekdaysOnly ?? true,
    } : null

export const overview = query({
    args: { workspaceId: v.id("workspaces") },
    handler: async (ctx, args) => {
        const member = await signedInMember(ctx, args.workspaceId)
        if (!member) return null
        const runs = await ctx.db.query("agentRuns").withIndex("by_workspace_id", (q) => q.eq("workspaceId", args.workspaceId)).order("desc").take(20)
        const { limit, plan } = await checkLimit(ctx, args.workspaceId, "agentRuns", 0)
        const month = await monthRuns(ctx, args.workspaceId)
        const admin = await isAdmin(ctx, member)
        return {
            canManage: admin,
            canDecide: await can(ctx, member, "manageContent"),
            agents: {
                meetingFollowUp: settingsOf(await agentFor(ctx, args.workspaceId, "meetingFollowUp")),
                triage: settingsOf(await agentFor(ctx, args.workspaceId, "triage")),
                standup: settingsOf(await agentFor(ctx, args.workspaceId, "standup")),
                assistant: settingsOf(await agentFor(ctx, args.workspaceId, "assistant")) ?? { enabled: true, mode: "act" as const, channelId: null, channelIds: [], postHour: 9, postTz: "UTC", weekdaysOnly: true },
            },
            usage: {
                used: month.length, limit, plan,
                // what the AI cost this month (admins only): an estimate from the tokens each run used
                ...(admin ? {
                    costUsd: Math.round(month.reduce((sum, r) => sum + (r.costUsd ?? 0), 0) * 100) / 100,
                    tokens: month.reduce((sum, r) => sum + (r.tokensIn ?? 0) + (r.tokensOut ?? 0), 0),
                } : {}),
            },
            runs: await Promise.all(runs.map((r) => describeRun(ctx, r))),
        }
    },
})

export const forMeeting = query({
    args: { meetingId: v.id("meetings") },
    handler: async (ctx, args) => {
        const meeting = await ctx.db.get(args.meetingId)
        if (!meeting || meeting.deletedAt) return null
        const member = await signedInMember(ctx, meeting.workspaceId)
        if (!member) return null
        if (meeting.kind === "oneToOne" && meeting.createdBy !== member._id && meeting.inviteeId !== member._id) return null
        const agent = await agentFor(ctx, meeting.workspaceId, "meetingFollowUp")
        const run = await ctx.db.query("agentRuns").withIndex("by_meeting_id", (q) => q.eq("meetingId", args.meetingId)).order("desc").first()
        return {
            enabled: !!agent?.enabled,
            mode: agent?.mode ?? "suggest",
            canDecide: await can(ctx, member, "manageContent"),
            run: run ? await describeRun(ctx, run) : null,
        }
    },
})

// ---------- settings ----------

export const configure = mutation({
    args: {
        workspaceId: v.id("workspaces"),
        kind: v.optional(kindV),
        enabled: v.boolean(),
        mode: v.union(v.literal("suggest"), v.literal("act")),
        channelId: v.optional(v.union(v.id("channels"), v.null())),
        channelIds: v.optional(v.array(v.id("channels"))),
        postHour: v.optional(v.number()),
        postTz: v.optional(v.string()),
        weekdaysOnly: v.optional(v.boolean()),
    },
    handler: async (ctx, args) => {
        const kind = args.kind ?? "meetingFollowUp"
        const member = await signedInMember(ctx, args.workspaceId)
        if (!member || !(await isAdmin(ctx, member))) throw new ConvexError("Only the owner and admins can set up agents")
        const publicChannel = async (id: Id<"channels">, why: string) => {
            const channel = await ctx.db.get(id)
            if (!channel || channel.workspaceId !== args.workspaceId) throw new ConvexError("Channel not found")
            if (channel.isPrivate) throw new ConvexError(why)
        }
        if (args.channelId) await publicChannel(args.channelId, "Pick a public channel for the recap")
        const channelIds = [...new Set(args.channelIds ?? [])]
        if (channelIds.length > MAX_WATCHED) throw new ConvexError(`The agent can watch up to ${MAX_WATCHED} channels`)
        for (const id of channelIds) await publicChannel(id, "The agent only watches public channels")
        if (kind === "triage" && args.enabled && channelIds.length === 0) throw new ConvexError("Pick at least one channel for the agent to watch")
        if (kind === "standup") {
            if (args.enabled && !args.channelId) throw new ConvexError("Pick the channel the standup goes to")
            if (args.postHour !== undefined && (!Number.isInteger(args.postHour) || args.postHour < 0 || args.postHour > 23)) throw new ConvexError("Pick an hour between 0 and 23")
            if (args.postTz !== undefined && !validTz(args.postTz)) throw new ConvexError("Unknown time zone")
        }

        const existing = await agentFor(ctx, args.workspaceId, kind)
        const fields = {
            enabled: args.enabled,
            // the standup only posts a report, so there is nothing to approve
            mode: kind === "standup" || kind === "assistant" ? ("act" as const) : args.mode,
            channelId: kind === "meetingFollowUp" || kind === "standup" ? args.channelId ?? undefined : undefined,
            channelIds: kind === "triage" ? channelIds : undefined,
            ...(kind === "standup" ? {
                postHour: args.postHour ?? existing?.postHour ?? 9,
                postTz: args.postTz ?? existing?.postTz ?? "UTC",
                weekdaysOnly: args.weekdaysOnly ?? existing?.weekdaysOnly ?? true,
            } : {}),
            updatedAt: Date.now(),
        }
        if (existing) await ctx.db.patch(existing._id, { ...fields, createdBy: member._id })
        else await ctx.db.insert("agents", { workspaceId: args.workspaceId, kind, createdBy: member._id, ...fields })
        await logAudit(ctx, args.workspaceId, member._id, args.enabled ? "agent.enabled" : "agent.disabled",
            kind === "standup" ? `${AGENT_NAMES[kind]}: ${fields.postHour}:00 ${fields.postTz}` : `${AGENT_NAMES[kind]}: ${fields.mode === "act" ? "acts on its own" : "suggests, people approve"}`)
        return null
    },
})

// Someone presses "Run follow-up agent" on a meeting summary.
export const runForMeeting = mutation({
    args: { meetingId: v.id("meetings") },
    handler: async (ctx, args) => {
        const userId = await auth.getUserId(ctx)
        if (!userId) throw new ConvexError("Please sign in")
        const meeting = await ctx.db.get(args.meetingId)
        if (!meeting || meeting.deletedAt) throw new ConvexError("Meeting not found")
        const member = await signedInMember(ctx, meeting.workspaceId)
        if (!member) throw new ConvexError("Meeting not found")
        if (meeting.kind === "oneToOne" && meeting.createdBy !== member._id && meeting.inviteeId !== member._id) throw new ConvexError("Meeting not found")
        if (!meeting.summary?.trim()) throw new ConvexError("This meeting has no summary yet")
        const agent = await agentFor(ctx, meeting.workspaceId, "meetingFollowUp")
        if (!agent?.enabled) throw new ConvexError("The follow-up agent is switched off. An admin can turn it on in Settings › Agents.")
        const busy = await ctx.db.query("agentRuns").withIndex("by_meeting_id", (q) => q.eq("meetingId", args.meetingId)).order("desc").first()
        if (busy && (busy.status === "queued" || busy.status === "running" || busy.status === "review")) throw new ConvexError("The agent is already working on this meeting")
        await throttle(ctx, userId, "agent-run", 10, 60 * 60_000, "running agents")
        const { allowed, limit, plan } = await monthlyCheck(ctx, meeting.workspaceId)
        if (!allowed) throw new ConvexError(`LIMIT_REACHED:agentRuns:${limit}:${plan}`)
        return await enqueue(ctx, agent, meeting, member._id)
    },
})

// "Try it on a sample meeting": an admin sees the follow-up agent work without holding a real call first.
// Creates a finished, made-up meeting whose action items name real people in the workspace, switches the
// follow-up agent on in "suggest" mode if it was off, and queues one run. The meeting never counts against the
// plan; the run is a normal agent run and does.
export const trySample = mutation({
    args: { workspaceId: v.id("workspaces") },
    handler: async (ctx, args) => {
        const userId = await auth.getUserId(ctx)
        if (!userId) throw new ConvexError("Please sign in")
        const member = await signedInMember(ctx, args.workspaceId)
        if (!member || !(await isAdmin(ctx, member))) throw new ConvexError("Only the owner and admins can set up agents")
        await throttle(ctx, userId, "agent-sample", 3, 60 * 60_000, "sample meetings")
        const { allowed, limit, plan } = await monthlyCheck(ctx, args.workspaceId)
        if (!allowed) throw new ConvexError(`LIMIT_REACHED:agentRuns:${limit}:${plan}`)

        const people = (await ctx.db.query("members").withIndex("byWorkspaceId", (q) => q.eq("workspaceId", args.workspaceId)).take(50))
            .filter((m) => m.role !== "guest")
        const nameOf = async (m: Doc<"members">) => ((await ctx.db.get(m.userId))?.name ?? "").split(" ")[0] || "Someone"
        const me = await nameOf(member)
        const others = await Promise.all(people.filter((m) => m._id !== member._id).slice(0, 2).map(nameOf))
        const [a, b] = [others[0] ?? me, others[1] ?? others[0] ?? me]
        const summary = [
            "## Key points",
            "- The launch stays on the 18th.",
            "- The checkout bug on mobile is the top priority this week.",
            "- Beta users get a short onboarding survey.",
            "",
            "## Action items",
            `- ${a}: fix the checkout bug on mobile by Friday`,
            `- ${b}: send the onboarding survey to beta users by Monday`,
            `- ${me}: book the design review for next week`,
        ].join("\n")
        const transcript = [
            `${me}: Quick sync. Launch is still the 18th, agreed?`,
            `${a}: Agreed. The checkout bug on mobile has to go first, I'll have it fixed by Friday.`,
            `${b}: I'll send the onboarding survey to the beta users on Monday.`,
            `${me}: Great. I'll book the design review for next week.`,
        ].join("\n")
        const now = Date.now()
        const meetingId = await ctx.db.insert("meetings", {
            workspaceId: args.workspaceId,
            title: "Sample: Weekly product sync",
            roomName: `sample-${args.workspaceId}-${now}`,
            createdBy: member._id,
            startedAt: now - 20 * 60_000,
            endedAt: now,
            transcript,
            summary,
            participants: [me, a, b].filter((x, i, all) => all.indexOf(x) === i),
            activeMembers: [],
            kind: "workspace",
            sample: true,
        })

        let agent = await agentFor(ctx, args.workspaceId, "meetingFollowUp")
        if (!agent?.enabled) {
            const fields = { enabled: true, mode: (agent?.mode ?? "suggest") as "suggest" | "act", updatedAt: now, createdBy: member._id }
            if (agent) await ctx.db.patch(agent._id, fields)
            else await ctx.db.insert("agents", { workspaceId: args.workspaceId, kind: "meetingFollowUp", ...fields })
            await logAudit(ctx, args.workspaceId, member._id, "agent.enabled", `${AGENT_NAMES.meetingFollowUp}: suggests, people approve`)
            agent = await agentFor(ctx, args.workspaceId, "meetingFollowUp")
        }
        const meeting = await ctx.db.get(meetingId)
        await enqueue(ctx, agent!, meeting!, member._id)
        return meetingId
    },
})

// ---------- the daily standup ----------

export const validTz = (tz: string) => {
    try { new Intl.DateTimeFormat("en-US", { timeZone: tz }); return tz.length < 64 } catch { return false }
}

// The local date, hour and weekday somewhere, e.g. { day: "2026-11-03", hour: 9, weekday: 2 } (0 = Sunday).
export const localNow = (ms: number, tz: string) => {
    const parts = Object.fromEntries(new Intl.DateTimeFormat("en-US", {
        timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", hourCycle: "h23", weekday: "short",
    }).formatToParts(new Date(ms)).map((p) => [p.type, p.value]))
    const weekday = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(parts.weekday)
    return { day: `${parts.year}-${parts.month}-${parts.day}`, hour: Number(parts.hour) % 24, weekday }
}

const startStandup = async (ctx: MutationCtx, agent: Doc<"agents">, startedBy: Id<"members">) => {
    const runId = await ctx.db.insert("agentRuns", {
        workspaceId: agent.workspaceId, agentId: agent._id, channelId: agent.channelId, startedBy, status: "queued", actions: [],
    })
    await ctx.scheduler.runAfter(0, internal.agentRunner.run, { runId })
    return runId
}

// Hourly: every standup agent whose local posting hour has come posts once that day.
export const standupTick = internalMutation({
    args: {},
    handler: async (ctx) => {
        const agents = await ctx.db.query("agents").withIndex("by_kind_enabled", (q) => q.eq("kind", "standup").eq("enabled", true)).take(2_000)
        let started = 0
        for (const agent of agents) {
            if (!agent.channelId) continue
            const now = localNow(Date.now(), agent.postTz ?? "UTC")
            if (now.hour !== (agent.postHour ?? 9) || agent.lastRunDay === now.day) continue
            if ((agent.weekdaysOnly ?? true) && (now.weekday === 0 || now.weekday === 6)) continue
            await ctx.db.patch(agent._id, { lastRunDay: now.day })
            const { allowed } = await monthlyCheck(ctx, agent.workspaceId)
            if (!allowed) continue
            await startStandup(ctx, agent, agent.createdBy)
            started++
        }
        return started
    },
})

// "Post one now" from Settings › Agents, to see what it looks like.
export const runStandupNow = mutation({
    args: { workspaceId: v.id("workspaces") },
    handler: async (ctx, args) => {
        const userId = await auth.getUserId(ctx)
        const member = await signedInMember(ctx, args.workspaceId)
        if (!userId || !member || !(await isAdmin(ctx, member))) throw new ConvexError("Only the owner and admins can run the standup by hand")
        const agent = await agentFor(ctx, args.workspaceId, "standup")
        if (!agent?.enabled || !agent.channelId) throw new ConvexError("Turn the standup agent on and pick its channel first")
        await throttle(ctx, userId, "agent-standup", 5, 60 * 60_000, "running the standup")
        const { allowed, limit, plan } = await monthlyCheck(ctx, args.workspaceId)
        if (!allowed) throw new ConvexError(`LIMIT_REACHED:agentRuns:${limit}:${plan}`)
        return await startStandup(ctx, agent, member._id)
    },
})

// The facts the standup is written from. Also turned into a plain post when the AI can't be reached.
const DAY_MS = 86_400_000
const standupFacts = async (ctx: QueryCtx, workspaceId: Id<"workspaces">, tz: string) => {
    const now = Date.now()
    const since = now - DAY_MS
    const local = localNow(now, tz)
    const nameCache = new Map<string, string>()
    const nameOf = async (memberId?: Id<"members">) => {
        if (!memberId) return null
        if (!nameCache.has(memberId)) {
            const m = await ctx.db.get(memberId)
            const u = m ? await ctx.db.get(m.userId) : null
            nameCache.set(memberId, u?.name ?? u?.email ?? "Someone")
        }
        return nameCache.get(memberId)!
    }
    const tasks = await ctx.db.query("tasks").withIndex("by_workspace_id", (q) => q.eq("workspaceId", workspaceId)).order("desc").take(1_000)
    const line = async (t: Doc<"tasks">) => ({ title: t.title, who: await nameOf(t.assigneeId), due: t.dueDate ?? null, priority: t.priority })
    // "due today" means today's date where the team is (task due dates are stored as noon UTC of the day)
    const todayKey = local.day
    const dueKey = (ms: number) => new Date(ms).toISOString().slice(0, 10)
    const open = tasks.filter((t) => t.status !== "done")
    const done = tasks.filter((t) => t.status === "done" && (t.updatedAt ?? t._creationTime) >= since)
    const dueToday = open.filter((t) => t.dueDate !== undefined && dueKey(t.dueDate) === todayKey)
    const overdue = open.filter((t) => t.dueDate !== undefined && dueKey(t.dueDate) < todayKey)
    const added = open.filter((t) => t._creationTime >= since)
    const inReview = open.filter((t) => t.status === "in_review")
    // what was said in public channels over the last day (newest first, capped)
    const channels = (await ctx.db.query("channels").withIndex("byWorkspaceId", (q) => q.eq("workspaceId", workspaceId)).take(100)).filter((c) => !c.isPrivate)
    const chat: { channel: string; who: string; text: string }[] = []
    for (const c of channels) {
        const recent = await ctx.db.query("messages").withIndex("by_channel_id", (q) => q.eq("channelId", c._id)).order("desc").take(40)
        for (const m of recent) {
            if (m._creationTime < since || m.agent || m.integrationName) continue
            const text = deltaToText(m.body).trim()
            if (text) chat.push({ channel: c.name, who: (await nameOf(m.memberId)) ?? "Someone", text: text.slice(0, 200) })
        }
        if (chat.length >= 80) break
    }
    return {
        today: todayKey,
        done: await Promise.all(done.slice(0, 25).map(line)),
        dueToday: await Promise.all(dueToday.slice(0, 25).map(line)),
        overdue: await Promise.all(overdue.slice(0, 15).map(line)),
        added: await Promise.all(added.slice(0, 15).map(line)),
        inReview: await Promise.all(inReview.slice(0, 15).map(line)),
        chat: chat.slice(0, 80),
    }
}
type Facts = Awaited<ReturnType<typeof standupFacts>>

// The no-AI version: still useful, just less chatty.
export const plainStandup = (f: Facts) => {
    const item = (t: Facts["done"][number]) => `• ${t.title}${t.who ? ` (${t.who})` : ""}`
    const part = (title: string, rows: Facts["done"]) => (rows.length ? [`${title}`, ...rows.slice(0, 8).map(item), rows.length > 8 ? `• and ${rows.length - 8} more` : ""].filter(Boolean).join("\n") : "")
    return [
        "Good morning. Here's where things stand:",
        part(`Done in the last day (${f.done.length})`, f.done),
        part(`Due today (${f.dueToday.length})`, f.dueToday),
        part(`Overdue (${f.overdue.length})`, f.overdue),
        part(`Waiting for review (${f.inReview.length})`, f.inReview),
    ].filter(Boolean).join("\n\n")
}
export const isQuiet = (f: Facts) => !f.done.length && !f.dueToday.length && !f.overdue.length && !f.added.length && !f.inReview.length && !f.chat.length

// ---------- carrying out what an agent proposed ----------

const due = (ms?: number) => (ms ? new Date(ms).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", timeZone: "UTC" }) : null)

const apply = async (ctx: MutationCtx, run: Doc<"agentRuns">, agent: Doc<"agents">, actions: Action[]) => {
    // the agent acts as the admin who set it up; if they have left, as the person who started the run.
    // The chat agent always acts as the person who asked it, with exactly their permissions.
    const asker = agent.kind === "assistant"
    const actorId = !asker && (await ctx.db.get(agent.createdBy)) ? agent.createdBy : run.startedBy
    const actor = await ctx.db.get(actorId)
    const actorCanAssign = !!actor && (await can(ctx, actor, "manageContent"))
    const name = AGENT_NAMES[agent.kind]
    const meeting = run.meetingId ? await ctx.db.get(run.meetingId) : null
    const done: Action[] = []
    for (const a of actions) {
        if (a.type === "update") {
            // same rules as the task board: admins change anything; members only the status of their own tasks
            const task = await ctx.db.get(a.taskId)
            if (!task || !actor || task.workspaceId !== run.workspaceId) { done.push(a); continue }
            const own = task.assigneeId === actor._id || task.createdBy === actor._id
            const patch: Partial<Doc<"tasks">> = {}
            if (a.status && (actorCanAssign || own)) patch.status = a.status
            if (actorCanAssign || (own && a.assigneeId === actor._id)) {
                if (a.assigneeId) patch.assigneeId = a.assigneeId
            }
            if (actorCanAssign) {
                if (a.dueDate) patch.dueDate = a.dueDate
                if (a.priority) patch.priority = a.priority
            }
            if (Object.keys(patch).length === 0) { done.push({ ...a, applied: false }); continue }
            await ctx.db.patch(task._id, { ...patch, updatedAt: Date.now() })
            if (patch.assigneeId && patch.assigneeId !== task.assigneeId && patch.assigneeId !== actor._id) {
                await notify(ctx, { workspaceId: run.workspaceId, recipientId: patch.assigneeId, senderId: actor._id, type: "task_assigned", taskId: task._id, body: task.title, read: false })
            }
            if (patch.status === "done" && task.status !== "done") await emit(ctx, run.workspaceId, "task.completed", { id: task._id, title: task.title, priority: task.priority })
            done.push({ ...a, applied: true })
            continue
        }
        if (a.type === "task") {
            const assignee = a.assigneeId ? await ctx.db.get(a.assigneeId) : null
            let assigneeId = assignee && assignee.workspaceId === run.workspaceId ? assignee._id : undefined
            // like the task board: only people who manage tasks can hand work to someone else
            if (asker && assigneeId && assigneeId !== actorId && !actorCanAssign) assigneeId = undefined
            const source = a.sourceMessageId ? await ctx.db.get(a.sourceMessageId) : null
            const channel = source?.channelId ? await ctx.db.get(source.channelId) : null
            const description = meeting
                ? `From the meeting "${meeting.title}" (added by the ${name.toLowerCase()})`
                : asker ? `Asked for in chat (added by the ${name})`
                : source && channel ? `From a message in #${channel.name}: "${snippetOf(source.body, 300)}" (added by the ${name.toLowerCase()})` : undefined
            const taskId = await ctx.db.insert("tasks", {
                title: a.title,
                description,
                status: "todo",
                priority: a.priority,
                workspaceId: run.workspaceId,
                assigneeId,
                createdBy: actorId,
                dueDate: a.dueDate,
                labels: ["agent"],
                updatedAt: Date.now(),
                sourceMeetingId: meeting?._id,
                sourceMessageId: source?._id,
            })
            if (assigneeId && assigneeId !== actorId) {
                await notify(ctx, { workspaceId: run.workspaceId, recipientId: assigneeId, senderId: actorId, type: "task_assigned", taskId, body: a.title, read: false })
            }
            await emit(ctx, run.workspaceId, "task.created", {
                id: taskId, title: a.title, status: "todo", priority: a.priority, assigneeId: assigneeId ?? null,
                dueDate: a.dueDate === undefined ? null : new Date(a.dueDate).toISOString().slice(0, 10),
            })
            // triage answers in the thread of the message the task came from, so the asker knows it's handled
            if (!asker && source && channel && !channel.isPrivate && source.workspaceId === run.workspaceId) {
                const who = assignee ? (await ctx.db.get(assignee.userId))?.name ?? "a teammate" : null
                const text = `Added to the board: ${a.title}${who ? ` → ${who}` : " (no owner yet)"}${due(a.dueDate) ? `, due ${due(a.dueDate)}` : ""}`
                const replyId = await ctx.db.insert("messages", {
                    memberId: actorId,
                    body: plainToDelta(text),
                    workspaceId: run.workspaceId,
                    channelId: channel._id,
                    parentMessagesId: source._id,
                    integrationName: name,
                    agent: true,
                })
                const reply = await ctx.db.get(replyId)
                if (reply) await noteReplyAdded(ctx, source._id, reply)
            }
            done.push({ ...a, assigneeId, taskId })
        } else {
            const channel = await ctx.db.get(a.channelId)
            if (!channel || channel.workspaceId !== run.workspaceId) continue
            // answers go back into the thread they were asked in, even in a locked channel the asker is part of
            const parent = a.parentMessageId ? await ctx.db.get(a.parentMessageId) : null
            if (parent ? parent.channelId !== channel._id : channel.isPrivate) continue
            const messageId = await ctx.db.insert("messages", {
                memberId: actorId,
                body: plainToDelta(a.text),
                workspaceId: run.workspaceId,
                channelId: channel._id,
                parentMessagesId: parent?._id,
                integrationName: name,
                agent: true,
            })
            if (parent) {
                const reply = await ctx.db.get(messageId)
                if (reply) await noteReplyAdded(ctx, parent._id, reply)
            }
            done.push({ ...a, messageId })
        }
    }
    return done
}

// Someone with the right to manage the workspace's tasks approves (some of) the proposals, or dismisses them.
export const decide = mutation({
    args: { runId: v.id("agentRuns"), approve: v.boolean(), actionIds: v.optional(v.array(v.string())) },
    handler: async (ctx, args) => {
        const run = await ctx.db.get(args.runId)
        if (!run) throw new ConvexError("Not found")
        const member = await signedInMember(ctx, run.workspaceId)
        if (!member) throw new ConvexError("Not found")
        if (!(await can(ctx, member, "manageContent"))) throw new ConvexError("Only people who can manage the workspace's tasks can approve agent work")
        if (run.status !== "review") throw new ConvexError("This has already been decided")
        const agent = await ctx.db.get(run.agentId)
        if (!agent) throw new ConvexError("The agent was removed")
        if (!args.approve) {
            await ctx.db.patch(run._id, { status: "dismissed", decidedBy: member._id, finishedAt: Date.now() })
            return null
        }
        const keep = args.actionIds ? new Set(args.actionIds) : null
        const chosen = run.actions.filter((a) => !keep || keep.has(a.id))
        if (chosen.length === 0) throw new ConvexError("Pick at least one thing to approve, or dismiss")
        const done = await apply(ctx, run, agent, chosen)
        await ctx.db.patch(run._id, { status: "done", actions: done, decidedBy: member._id, finishedAt: Date.now() })
        await logAudit(ctx, run.workspaceId, member._id, "agent.approved", `${AGENT_NAMES[agent.kind]}: ${done.length} of ${run.actions.length} proposals`)
        return null
    },
})

// ---------- used by the runner ----------

const peopleOf = async (ctx: QueryCtx, workspaceId: Id<"workspaces">) => {
    const members = await ctx.db.query("members").withIndex("byWorkspaceId", (q) => q.eq("workspaceId", workspaceId)).take(300)
    return await Promise.all(members.filter((m) => m.role !== "guest").map(async (m) => {
        const u = await ctx.db.get(m.userId)
        return { id: m._id as string, name: u?.name ?? u?.email ?? "Member" }
    }))
}
const openTasksOf = async (ctx: QueryCtx, workspaceId: Id<"workspaces">) =>
    (await ctx.db.query("tasks").withIndex("by_workspace_id", (q) => q.eq("workspaceId", workspaceId)).order("desc").take(80))
        .filter((t) => t.status !== "done").map((t) => t.title).slice(0, 50)

export const context = internalQuery({
    args: { runId: v.id("agentRuns") },
    handler: async (ctx, args) => {
        const run = await ctx.db.get(args.runId)
        const agent = run ? await ctx.db.get(run.agentId) : null
        if (!run || !agent) return null
        if (agent.kind === "assistant") {
            const question = run.messageIds?.[0] ? await ctx.db.get(run.messageIds[0]) : null
            const channel = run.channelId ? await ctx.db.get(run.channelId) : null
            const asker = await ctx.db.get(run.startedBy)
            const askerUser = asker ? await ctx.db.get(asker.userId) : null
            if (!question || !channel || !asker) return null
            const nameOf = async (m: Doc<"messages">) => {
                if (m.integrationName) return m.integrationName
                const mm = await ctx.db.get(m.memberId)
                const u = mm ? await ctx.db.get(mm.userId) : null
                return u?.name ?? "Someone"
            }
            // the conversation it was asked in: the whole thread, or the last stretch of the channel
            const rootId = question.parentMessagesId ?? question._id
            const root = await ctx.db.get(rootId)
            const replies = await ctx.db.query("messages").withIndex("by_parent_message_id", (q) => q.eq("parentMessagesId", rootId)).take(60)
            const around = question.parentMessagesId || replies.length
                ? [root, ...replies].filter((m): m is Doc<"messages"> => !!m && m._creationTime <= question._creationTime)
                : (await ctx.db.query("messages").withIndex("by_channel_id", (q) => q.eq("channelId", channel._id)).order("desc").take(60))
                    .filter((m) => !m.parentMessagesId && m._creationTime <= question._creationTime).slice(0, 25).reverse()
            const line = async (m: Doc<"messages">) => ({ id: m._id as string, at: m._creationTime, name: await nameOf(m), memberId: m.memberId as string, text: deltaToText(m.body).slice(0, 1_200) })
            return {
                kind: "assistant" as const,
                channel: channel.name,
                asker: { id: asker._id as string, name: askerUser?.name ?? askerUser?.email ?? "Someone", canAssign: await can(ctx, asker, "manageContent") },
                question: await line(question),
                conversation: await Promise.all(around.filter((m) => m._id !== question._id).slice(-40).map(line)),
                people: await peopleOf(ctx, run.workspaceId),
            }
        }
        if (agent.kind === "standup") {
            const channel = agent.channelId ? await ctx.db.get(agent.channelId) : null
            if (!channel) return null
            const facts = await standupFacts(ctx, run.workspaceId, agent.postTz ?? "UTC")
            return { kind: "standup" as const, channel: channel.name, facts, quiet: isQuiet(facts), plain: plainStandup(facts) }
        }
        if (agent.kind === "triage") {
            const channel = run.channelId ? await ctx.db.get(run.channelId) : null
            if (!channel) return null
            const ids = new Set((run.messageIds ?? []).map(String))
            const authorOf = async (m: Doc<"messages">) => {
                const member = await ctx.db.get(m.memberId)
                const user = member ? await ctx.db.get(member.userId) : null
                return { name: m.integrationName ?? user?.name ?? "Someone", memberId: m.memberId as string }
            }
            const asked = (await Promise.all((run.messageIds ?? []).map((id) => ctx.db.get(id))))
                .filter((m): m is Doc<"messages"> => !!m)
            const firstAt = asked.reduce((t, m) => Math.min(t, m._creationTime), Infinity)
            // a little of what was said just before, so "can you do that?" makes sense
            const before = (await ctx.db.query("messages").withIndex("by_channel_id", (q) => q.eq("channelId", channel._id)).order("desc").take(40))
                .filter((m) => !m.parentMessagesId && !ids.has(m._id) && m._creationTime < firstAt).slice(0, 8).reverse()
            const line = async (m: Doc<"messages">) => ({ id: m._id as string, at: m._creationTime, ...(await authorOf(m)), text: deltaToText(m.body).slice(0, 1_200) })
            return {
                kind: "triage" as const,
                channel: channel.name,
                earlier: await Promise.all(before.map(line)),
                messages: await Promise.all(asked.map(line)),
                people: await peopleOf(ctx, run.workspaceId),
                openTasks: await openTasksOf(ctx, run.workspaceId),
            }
        }
        if (!run.meetingId) return null
        const meeting = await ctx.db.get(run.meetingId)
        if (!meeting || meeting.deletedAt) return null
        return {
            kind: "meetingFollowUp" as const,
            meeting: {
                title: meeting.title,
                startedAt: meeting.startedAt,
                summary: (meeting.summary ?? "").slice(0, 8_000),
                transcript: (meeting.transcript ?? "").slice(0, 14_000),
                participants: meeting.participants ?? [],
            },
            people: await peopleOf(ctx, run.workspaceId),
            openTasks: await openTasksOf(ctx, run.workspaceId),
            recapChannel: agent.channelId ? (await ctx.db.get(agent.channelId))?.name ?? null : null,
        }
    },
})

export const markRunning = internalMutation({
    args: { runId: v.id("agentRuns") },
    handler: async (ctx, args) => {
        const run = await ctx.db.get(args.runId)
        if (!run || run.status !== "queued") return false
        await ctx.db.patch(run._id, { status: "running" })
        return true
    },
})

const proposal = v.union(
    v.object({
        type: v.literal("task"),
        title: v.string(),
        assigneeId: v.optional(v.string()),
        dueDate: v.optional(v.string()),
        priority: v.optional(v.string()),
        sourceMessageId: v.optional(v.string()),
    }),
    v.object({ type: v.literal("recap"), text: v.string() }),
    v.object({
        type: v.literal("update"),
        taskId: v.string(),
        status: v.optional(v.string()),
        assigneeId: v.optional(v.string()),
        dueDate: v.optional(v.string()),
        priority: v.optional(v.string()),
    }),
)
const STATUSES = ["backlog", "todo", "in_progress", "in_review", "done"] as const
const isStatus = (s?: string): s is (typeof STATUSES)[number] => !!s && (STATUSES as readonly string[]).includes(s)

const PRIORITIES = ["urgent", "high", "medium", "low"] as const
const isPriority = (p?: string): p is (typeof PRIORITIES)[number] => !!p && (PRIORITIES as readonly string[]).includes(p)

// "2026-11-06" -> noon UTC that day (so it shows as the same date everywhere); anything else -> none
export const parseDue = (raw?: string) => {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec((raw ?? "").trim())
    if (!m) return undefined
    const ms = Date.UTC(+m[1], +m[2] - 1, +m[3], 12)
    const d = new Date(ms)
    if (d.getUTCMonth() !== +m[2] - 1) return undefined
    // nothing in the past, nothing years away
    if (ms < Date.now() - 86_400_000 || ms > Date.now() + 366 * 86_400_000) return undefined
    return ms
}

// The model's proposals are checked again here: only real members, only the agent's own channel or the
// messages it was given, sane sizes.
export const finishRun = internalMutation({
    args: { runId: v.id("agentRuns"), proposals: v.array(proposal), note: v.optional(v.string()), steps: v.number() },
    handler: async (ctx, args) => {
        const run = await ctx.db.get(args.runId)
        if (!run || run.status !== "running") return null
        const agent = await ctx.db.get(run.agentId)
        if (!agent) return null
        const triage = agent.kind === "triage"
        const standup = agent.kind === "standup"
        const assistant = agent.kind === "assistant"
        const allowedSources = new Set((run.messageIds ?? []).map(String))
        const actions: Action[] = []
        const seen = new Set<string>()
        let n = 0
        for (const p of args.proposals) {
            n++
            if (p.type === "task") {
                if (standup) continue
                const title = p.title.trim().replace(/\s+/g, " ").slice(0, MAX.taskTitle)
                const key = title.toLowerCase()
                if (!title || seen.has(key) || actions.filter((a) => a.type === "task").length >= MAX_TASKS_PER_RUN) continue
                let sourceMessageId: Id<"messages"> | undefined
                if (triage && !assistant) {
                    // a triage task must come from one of the messages it was shown
                    const id = p.sourceMessageId && allowedSources.has(p.sourceMessageId) ? ctx.db.normalizeId("messages", p.sourceMessageId) : null
                    if (!id) continue
                    // one task per message
                    if (actions.some((a) => a.type === "task" && a.sourceMessageId === id)) continue
                    sourceMessageId = id
                }
                seen.add(key)
                let assigneeId: Id<"members"> | undefined
                if (p.assigneeId) {
                    const id = ctx.db.normalizeId("members", p.assigneeId)
                    const m = id ? await ctx.db.get(id) : null
                    if (m && m.workspaceId === run.workspaceId && m.role !== "guest") assigneeId = m._id
                }
                actions.push({
                    id: `t${n}`, type: "task", title, assigneeId, dueDate: parseDue(p.dueDate),
                    priority: isPriority(p.priority) ? p.priority : "medium", ...(sourceMessageId ? { sourceMessageId } : {}),
                })
            } else if (p.type === "update") {
                // only the chat agent changes existing tasks, at most 10 per question, each task once
                if (!assistant || actions.filter((a) => a.type === "update").length >= 10) continue
                const id = ctx.db.normalizeId("tasks", p.taskId)
                const task = id ? await ctx.db.get(id) : null
                if (!task || task.workspaceId !== run.workspaceId || actions.some((a) => a.type === "update" && a.taskId === task._id)) continue
                let assigneeId: Id<"members"> | undefined
                if (p.assigneeId) {
                    const mid = ctx.db.normalizeId("members", p.assigneeId)
                    const m = mid ? await ctx.db.get(mid) : null
                    if (m && m.workspaceId === run.workspaceId && m.role !== "guest") assigneeId = m._id
                }
                const change = {
                    status: isStatus(p.status) ? p.status : undefined,
                    assigneeId,
                    dueDate: parseDue(p.dueDate),
                    priority: isPriority(p.priority) ? p.priority : undefined,
                }
                if (Object.values(change).every((x) => x === undefined)) continue
                actions.push({ id: `u${n}`, type: "update", taskId: task._id, title: task.title, ...change })
            } else if (p.type === "recap" && assistant && run.channelId && run.messageIds?.[0] && !actions.some((a) => a.type === "recap")) {
                const question = await ctx.db.get(run.messageIds[0])
                const text = p.text.trim().slice(0, MAX_RECAP)
                if (question && text) actions.push({ id: `r${n}`, type: "recap", channelId: run.channelId, parentMessageId: question.parentMessagesId ?? question._id, text })
            } else if (p.type === "recap" && !triage && !assistant && agent.channelId && !actions.some((a) => a.type === "recap")) {
                const text = p.text.trim().slice(0, MAX_RECAP)
                if (text) actions.push({ id: `r${n}`, type: "recap", channelId: agent.channelId, text })
            }
        }
        const note = args.note?.trim().slice(0, 300) || undefined
        if (actions.length === 0) {
            await ctx.db.patch(run._id, { status: "done", actions, note: note ?? (triage ? "No requests that need a task." : standup ? "Nothing to report today." : "Nothing to follow up on."), steps: args.steps, finishedAt: Date.now() })
            return null
        }
        if (agent.mode === "act" || standup || assistant) {
            const done = await apply(ctx, run, agent, actions)
            await ctx.db.patch(run._id, { status: "done", actions: done, note, steps: args.steps, finishedAt: Date.now() })
        } else {
            await ctx.db.patch(run._id, { status: "review", actions, note, steps: args.steps })
        }
        return null
    },
})

export const recordUsage = internalMutation({
    args: { runId: v.id("agentRuns"), model: v.string(), tokensIn: v.number(), tokensOut: v.number(), costUsd: v.number() },
    handler: async (ctx, args) => {
        const run = await ctx.db.get(args.runId)
        if (!run) return null
        await ctx.db.patch(run._id, {
            model: args.model,
            tokensIn: (run.tokensIn ?? 0) + args.tokensIn,
            tokensOut: (run.tokensOut ?? 0) + args.tokensOut,
            costUsd: Math.round(((run.costUsd ?? 0) + args.costUsd) * 1e6) / 1e6,
        })
        return null
    },
})

export const failRun = internalMutation({
    args: { runId: v.id("agentRuns"), error: v.string() },
    handler: async (ctx, args) => {
        const run = await ctx.db.get(args.runId)
        if (!run || run.status === "done" || run.status === "dismissed") return null
        await ctx.db.patch(run._id, { status: "failed", error: args.error.slice(0, 300), finishedAt: Date.now() })
        return null
    },
})
