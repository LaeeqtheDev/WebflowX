import { v, ConvexError } from "convex/values"
import { internalMutation, internalQuery, mutation, query, MutationCtx, QueryCtx } from "./_generated/server"
import { Doc, Id } from "./_generated/dataModel"
import { internal } from "./_generated/api"
import { auth } from "./auth"
import { findMember } from "./access"
import { assert2fa, can, roleOf } from "./permissions"
import { checkLimit } from "./limits"
import { throttle } from "./rateLimit"
import { logAudit } from "./audit"
import { notify } from "./notifications"
import { emit, plainToDelta } from "./integrations"
import { MAX } from "./validate"

// AI agents that work inside a workspace. The first one follows up on meetings: once a meeting has an AI summary
// it turns the action items into tasks for the right people and can post a recap to a channel.
// Agents act for the admin who switched them on. In "suggest" mode nothing happens until someone approves it.

export const AGENT_NAME = "Follow-up agent"
// most tasks and characters one run may create, whatever the model says
export const MAX_TASKS_PER_RUN = 12
export const MAX_RECAP = 2_000

type Action = Doc<"agentRuns">["actions"][number]
type Ctx = QueryCtx | MutationCtx

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

const agentFor = (ctx: Ctx, workspaceId: Id<"workspaces">) =>
    ctx.db.query("agents").withIndex("by_workspace_kind", (q) => q.eq("workspaceId", workspaceId).eq("kind", "meetingFollowUp")).unique()

const startOfMonth = () => {
    const now = new Date()
    return new Date(now.getFullYear(), now.getMonth(), 1).getTime()
}

// Runs used this month against the plan allowance.
const monthlyCheck = async (ctx: Ctx, workspaceId: Id<"workspaces">) => {
    const used = await ctx.db.query("agentRuns")
        .withIndex("by_workspace_id", (q) => q.eq("workspaceId", workspaceId).gte("_creationTime", startOfMonth()))
        .take(1_200)
    return await checkLimit(ctx, workspaceId, "agentRuns", used.length)
}

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
    const agent = await agentFor(ctx, meeting.workspaceId)
    if (!agent?.enabled || meeting.deletedAt) return null
    const claims = await ctx.db.query("aiSummaryLog").withIndex("by_meeting_id", (q) => q.eq("meetingId", meeting._id)).take(20)
    if (!claims.some((c) => c.consumed)) return null
    const earlier = await ctx.db.query("agentRuns").withIndex("by_meeting_id", (q) => q.eq("meetingId", meeting._id)).first()
    if (earlier) return null
    const { allowed } = await monthlyCheck(ctx, meeting.workspaceId)
    if (!allowed) return null
    return await enqueue(ctx, agent, meeting, member._id)
}

// ---------- what the screens read ----------

const describeRun = async (ctx: QueryCtx, run: Doc<"agentRuns">) => {
    const meeting = run.meetingId ? await ctx.db.get(run.meetingId) : null
    const nameOf = async (memberId?: Id<"members">) => {
        if (!memberId) return null
        const m = await ctx.db.get(memberId)
        const u = m ? await ctx.db.get(m.userId) : null
        return u?.name ?? u?.email ?? null
    }
    const actions = await Promise.all(run.actions.map(async (a) => {
        if (a.type === "task") return { ...a, assigneeName: await nameOf(a.assigneeId) }
        const channel = await ctx.db.get(a.channelId)
        return { ...a, channelName: channel?.name ?? "deleted channel" }
    }))
    return {
        _id: run._id,
        _creationTime: run._creationTime,
        status: run.status,
        note: run.note ?? null,
        error: run.error ?? null,
        finishedAt: run.finishedAt ?? null,
        meetingId: run.meetingId ?? null,
        meetingTitle: meeting && !meeting.deletedAt ? meeting.title : null,
        decidedByName: await nameOf(run.decidedBy),
        actions,
    }
}

export const overview = query({
    args: { workspaceId: v.id("workspaces") },
    handler: async (ctx, args) => {
        const member = await signedInMember(ctx, args.workspaceId)
        if (!member) return null
        const admin = await isAdmin(ctx, member)
        const agent = await agentFor(ctx, args.workspaceId)
        const runs = await ctx.db.query("agentRuns").withIndex("by_workspace_id", (q) => q.eq("workspaceId", args.workspaceId)).order("desc").take(15)
        const { limit, plan } = await monthlyCheck(ctx, args.workspaceId)
        const used = (await ctx.db.query("agentRuns")
            .withIndex("by_workspace_id", (q) => q.eq("workspaceId", args.workspaceId).gte("_creationTime", startOfMonth()))
            .take(1_200)).length
        return {
            canManage: admin,
            canDecide: await can(ctx, member, "manageContent"),
            agent: agent ? { enabled: agent.enabled, mode: agent.mode, channelId: agent.channelId ?? null } : null,
            usage: { used, limit, plan },
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
        const agent = await agentFor(ctx, meeting.workspaceId)
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
        enabled: v.boolean(),
        mode: v.union(v.literal("suggest"), v.literal("act")),
        channelId: v.union(v.id("channels"), v.null()),
    },
    handler: async (ctx, args) => {
        const member = await signedInMember(ctx, args.workspaceId)
        if (!member || !(await isAdmin(ctx, member))) throw new ConvexError("Only the owner and admins can set up agents")
        if (args.channelId) {
            const channel = await ctx.db.get(args.channelId)
            if (!channel || channel.workspaceId !== args.workspaceId) throw new ConvexError("Channel not found")
            if (channel.isPrivate) throw new ConvexError("Pick a public channel for the recap")
        }
        const existing = await agentFor(ctx, args.workspaceId)
        const fields = { enabled: args.enabled, mode: args.mode, channelId: args.channelId ?? undefined, updatedAt: Date.now() }
        if (existing) await ctx.db.patch(existing._id, { ...fields, createdBy: member._id })
        else await ctx.db.insert("agents", { workspaceId: args.workspaceId, kind: "meetingFollowUp", createdBy: member._id, ...fields })
        await logAudit(ctx, args.workspaceId, member._id, args.enabled ? "agent.enabled" : "agent.disabled",
            `${AGENT_NAME}: ${args.mode === "act" ? "acts on its own" : "suggests, people approve"}`)
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
        const agent = await agentFor(ctx, meeting.workspaceId)
        if (!agent?.enabled) throw new ConvexError("The follow-up agent is switched off. An admin can turn it on in Settings › Agents.")
        const busy = await ctx.db.query("agentRuns").withIndex("by_meeting_id", (q) => q.eq("meetingId", args.meetingId)).order("desc").first()
        if (busy && (busy.status === "queued" || busy.status === "running" || busy.status === "review")) throw new ConvexError("The agent is already working on this meeting")
        await throttle(ctx, userId, "agent-run", 10, 60 * 60_000, "running agents")
        const { allowed, limit, plan } = await monthlyCheck(ctx, meeting.workspaceId)
        if (!allowed) throw new ConvexError(`LIMIT_REACHED:agentRuns:${limit}:${plan}`)
        return await enqueue(ctx, agent, meeting, member._id)
    },
})

// ---------- carrying out what the agent proposed ----------

const apply = async (ctx: MutationCtx, run: Doc<"agentRuns">, agent: Doc<"agents">, actions: Action[]) => {
    // the agent acts as the admin who set it up; if they have left, as the person who started the run
    const actorId = (await ctx.db.get(agent.createdBy)) ? agent.createdBy : run.startedBy
    const meeting = run.meetingId ? await ctx.db.get(run.meetingId) : null
    const done: Action[] = []
    for (const a of actions) {
        if (a.type === "task") {
            const assignee = a.assigneeId ? await ctx.db.get(a.assigneeId) : null
            const assigneeId = assignee && assignee.workspaceId === run.workspaceId ? assignee._id : undefined
            const taskId = await ctx.db.insert("tasks", {
                title: a.title,
                description: meeting ? `From the meeting "${meeting.title}" (added by the ${AGENT_NAME.toLowerCase()})` : undefined,
                status: "todo",
                priority: a.priority,
                workspaceId: run.workspaceId,
                assigneeId,
                createdBy: actorId,
                dueDate: a.dueDate,
                labels: ["agent"],
                updatedAt: Date.now(),
            })
            if (assigneeId && assigneeId !== actorId) {
                await notify(ctx, { workspaceId: run.workspaceId, recipientId: assigneeId, senderId: actorId, type: "task_assigned", taskId, body: a.title, read: false })
            }
            await emit(ctx, run.workspaceId, "task.created", {
                id: taskId, title: a.title, status: "todo", priority: a.priority, assigneeId: assigneeId ?? null,
                dueDate: a.dueDate === undefined ? null : new Date(a.dueDate).toISOString().slice(0, 10),
            })
            done.push({ ...a, assigneeId, taskId })
        } else {
            const channel = await ctx.db.get(a.channelId)
            if (!channel || channel.workspaceId !== run.workspaceId || channel.isPrivate) continue
            const messageId = await ctx.db.insert("messages", {
                memberId: actorId,
                body: plainToDelta(a.text),
                workspaceId: run.workspaceId,
                channelId: channel._id,
                integrationName: AGENT_NAME,
                agent: true,
            })
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
        await logAudit(ctx, run.workspaceId, member._id, "agent.approved", `${done.length} of ${run.actions.length} proposals`)
        return null
    },
})

// ---------- used by the runner ----------

export const context = internalQuery({
    args: { runId: v.id("agentRuns") },
    handler: async (ctx, args) => {
        const run = await ctx.db.get(args.runId)
        if (!run?.meetingId) return null
        const meeting = await ctx.db.get(run.meetingId)
        const agent = await ctx.db.get(run.agentId)
        if (!meeting || meeting.deletedAt || !agent) return null
        const members = await ctx.db.query("members").withIndex("byWorkspaceId", (q) => q.eq("workspaceId", run.workspaceId)).take(300)
        const people = (await Promise.all(members.filter((m) => m.role !== "guest").map(async (m) => {
            const u = await ctx.db.get(m.userId)
            return { id: m._id as string, name: u?.name ?? u?.email ?? "Member" }
        })))
        const open = await ctx.db.query("tasks").withIndex("by_workspace_id", (q) => q.eq("workspaceId", run.workspaceId)).order("desc").take(80)
        return {
            meeting: {
                title: meeting.title,
                startedAt: meeting.startedAt,
                summary: (meeting.summary ?? "").slice(0, 8_000),
                transcript: (meeting.transcript ?? "").slice(0, 14_000),
                participants: meeting.participants ?? [],
            },
            people,
            openTasks: open.filter((t) => t.status !== "done").map((t) => t.title).slice(0, 50),
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
    }),
    v.object({ type: v.literal("recap"), text: v.string() }),
)

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

// The model's proposals are checked again here: only real members, only the agent's own channel, sane sizes.
export const finishRun = internalMutation({
    args: { runId: v.id("agentRuns"), proposals: v.array(proposal), note: v.optional(v.string()), steps: v.number() },
    handler: async (ctx, args) => {
        const run = await ctx.db.get(args.runId)
        if (!run || run.status !== "running") return null
        const agent = await ctx.db.get(run.agentId)
        if (!agent) return null
        const actions: Action[] = []
        const seen = new Set<string>()
        let n = 0
        for (const p of args.proposals) {
            n++
            if (p.type === "task") {
                const title = p.title.trim().replace(/\s+/g, " ").slice(0, MAX.taskTitle)
                const key = title.toLowerCase()
                if (!title || seen.has(key) || actions.filter((a) => a.type === "task").length >= MAX_TASKS_PER_RUN) continue
                seen.add(key)
                let assigneeId: Id<"members"> | undefined
                if (p.assigneeId) {
                    const id = ctx.db.normalizeId("members", p.assigneeId)
                    const m = id ? await ctx.db.get(id) : null
                    if (m && m.workspaceId === run.workspaceId && m.role !== "guest") assigneeId = m._id
                }
                actions.push({ id: `t${n}`, type: "task", title, assigneeId, dueDate: parseDue(p.dueDate), priority: isPriority(p.priority) ? p.priority : "medium" })
            } else if (agent.channelId && !actions.some((a) => a.type === "recap")) {
                const text = p.text.trim().slice(0, MAX_RECAP)
                if (text) actions.push({ id: `r${n}`, type: "recap", channelId: agent.channelId, text })
            }
        }
        const note = args.note?.trim().slice(0, 300) || undefined
        if (actions.length === 0) {
            await ctx.db.patch(run._id, { status: "done", actions, note: note ?? "Nothing to follow up on.", steps: args.steps, finishedAt: Date.now() })
            return null
        }
        if (agent.mode === "act") {
            const done = await apply(ctx, run, agent, actions)
            await ctx.db.patch(run._id, { status: "done", actions: done, note, steps: args.steps, finishedAt: Date.now() })
        } else {
            await ctx.db.patch(run._id, { status: "review", actions, note, steps: args.steps })
        }
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
