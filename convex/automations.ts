import { v, ConvexError } from "convex/values"
import { internalAction, internalMutation, internalQuery, mutation, query, MutationCtx, QueryCtx } from "./_generated/server"
import { internal } from "./_generated/api"
import { Doc, Id } from "./_generated/dataModel"
import { AGENT_NAMES, isAdmin, signedInMember } from "./agents"
import { chat } from "./agentRunner"
import { notify } from "./notifications"
import { plainToDelta } from "./integrations"
import { noteReplyAdded } from "./messageHelpers"
import { canViewChannel } from "./permissions"
import { deltaToText } from "./validate"

// Automations: small jobs that keep work moving without anyone asking. Most use no AI at all (reminders, prep briefs);
// the decisions log uses the small model once per meeting, and the weekly digest one large-model call per workspace a week.
// Admins switch each one on or off on the Agents page.

const HOUR = 60 * 60_000
const DAY = 24 * HOUR

export const KEYS = ["overdueNudges", "unansweredQuestions", "missingSummary", "meetingPrep", "decisionsLog", "weeklyDigest"] as const
export type AutomationKey = (typeof KEYS)[number]
// the no-AI reminders and the decisions log start on; the two that post into channels wait for an admin
const DEFAULT_ON: Record<AutomationKey, boolean> = {
    overdueNudges: true, missingSummary: true, meetingPrep: true, decisionsLog: true, unansweredQuestions: false, weeklyDigest: false,
}
const keyV = v.union(...KEYS.map((k) => v.literal(k)))

type Ctx = QueryCtx | MutationCtx
const settingFor = (ctx: Ctx, workspaceId: Id<"workspaces">, key: AutomationKey) =>
    ctx.db.query("automations").withIndex("by_workspace_key", (q) => q.eq("workspaceId", workspaceId).eq("key", key)).unique()
export const isOn = async (ctx: Ctx, workspaceId: Id<"workspaces">, key: AutomationKey) => {
    const row = await settingFor(ctx, workspaceId, key)
    return row ? row.enabled : DEFAULT_ON[key]
}
// workspaces asked to stay quiet, cached per run
const onCheck = (ctx: Ctx, key: AutomationKey) => {
    const seen = new Map<string, boolean>()
    return async (workspaceId: Id<"workspaces">) => {
        const k = String(workspaceId)
        if (!seen.has(k)) seen.set(k, await isOn(ctx, workspaceId, key))
        return seen.get(k)!
    }
}
const already = async (ctx: Ctx, key: string, refId: string) =>
    !!(await ctx.db.query("automationLog").withIndex("by_key_ref", (q) => q.eq("key", key).eq("refId", refId)).first())
const mark = (ctx: MutationCtx, key: string, refId: string) => ctx.db.insert("automationLog", { key, refId })

// ---------- settings (Agents page) ----------

export const list = query({
    args: { workspaceId: v.id("workspaces") },
    handler: async (ctx, args) => {
        const member = await signedInMember(ctx, args.workspaceId).catch(() => null)
        if (!member) return null
        const admin = await isAdmin(ctx, member)
        const rows = await Promise.all(KEYS.map(async (key) => {
            const row = await settingFor(ctx, args.workspaceId, key)
            const channel = row?.channelId ? await ctx.db.get(row.channelId) : null
            return { key, enabled: row ? row.enabled : DEFAULT_ON[key], channelId: channel ? channel._id : null, channelName: channel?.name ?? null }
        }))
        return { admin, rows }
    },
})

export const configure = mutation({
    args: { workspaceId: v.id("workspaces"), key: keyV, enabled: v.boolean(), channelId: v.optional(v.id("channels")) },
    handler: async (ctx, args) => {
        const member = await signedInMember(ctx, args.workspaceId)
        if (!member || !(await isAdmin(ctx, member))) throw new ConvexError("Only the owner and admins can change automations")
        let channelId = args.channelId
        if (channelId) {
            const channel = await ctx.db.get(channelId)
            if (!channel || channel.workspaceId !== args.workspaceId || !(await canViewChannel(ctx, channelId, member.userId))) throw new ConvexError("Channel not found")
        }
        const row = await settingFor(ctx, args.workspaceId, args.key)
        channelId = channelId ?? row?.channelId
        if (args.key === "weeklyDigest" && args.enabled && !channelId) throw new ConvexError("Pick a channel for the weekly digest")
        if (row) await ctx.db.patch(row._id, { enabled: args.enabled, channelId, updatedBy: member._id })
        else await ctx.db.insert("automations", { workspaceId: args.workspaceId, key: args.key, enabled: args.enabled, channelId, updatedBy: member._id })
        return null
    },
})

// ---------- hourly: reminders (no AI) ----------

export const hourly = internalMutation({
    args: {},
    handler: async (ctx) => {
        const now = Date.now()

        // 1. Overdue tasks: one nudge to the owner per due date (due dates are midnight UTC of the day)
        const overdueOn = onCheck(ctx, "overdueNudges")
        const overdue = await ctx.db.query("tasks").withIndex("by_due_date", (q) => q.gte("dueDate", now - 14 * DAY).lt("dueDate", now - DAY)).take(500)
        for (const t of overdue) {
            if (!t.assigneeId || t.status === "done" || t.overdueNudgedFor === t.dueDate) continue
            if (!(await overdueOn(t.workspaceId))) continue
            if (!(await ctx.db.get(t.assigneeId))) continue
            await ctx.db.patch(t._id, { overdueNudgedFor: t.dueDate })
            await notify(ctx, { workspaceId: t.workspaceId, recipientId: t.assigneeId, senderId: t.assigneeId, type: "agent_nudge", taskId: t._id, body: `Overdue: ${t.title}`, read: false }, { email: false })
        }

        // 2. Meetings that ended over 30 minutes ago with no summary: remind whoever started it
        const summaryOn = onCheck(ctx, "missingSummary")
        const ended = await ctx.db.query("meetings").withIndex("by_ended_started", (q) => q.gte("endedAt", now - 12 * HOUR).lte("endedAt", now - 30 * 60_000)).take(300)
        for (const m of ended) {
            if (m.kind === "oneToOne" || m.sample || m.deletedAt || m.summary?.trim()) continue
            if (!(await summaryOn(m.workspaceId)) || (await already(ctx, "missingSummary", m._id))) continue
            await mark(ctx, "missingSummary", m._id)
            if (!(await ctx.db.get(m.createdBy))) continue
            await notify(ctx, { workspaceId: m.workspaceId, recipientId: m.createdBy, senderId: m.createdBy, type: "agent_nudge", meetingId: m._id, body: `“${m.title}” has no summary yet. Add one so the follow-up agent can turn it into tasks.`, read: false }, { email: false })
        }

        // 3. Questions in channels nobody answered for a day: the agent replies in the thread so it resurfaces
        const recent = await ctx.db.query("messages").withIndex("by_creation_time", (q) => q.gte("_creationTime", now - 2 * DAY).lte("_creationTime", now - DAY)).take(2_000)
        const questionsOn = onCheck(ctx, "unansweredQuestions")
        let pinged = 0
        for (const m of recent) {
            if (pinged >= 50) break
            if (!m.channelId || m.conversationId || m.parentMessagesId || m.agent || m.integrationName || (m.threadCount ?? 0) > 0) continue
            const text = deltaToText(m.body).trim()
            if (text.length < 12 || !/\?\s*$/.test(text)) continue
            if (!(await questionsOn(m.workspaceId)) || (await already(ctx, "unansweredQuestions", m._id))) continue
            await mark(ctx, "unansweredQuestions", m._id)
            const id = await ctx.db.insert("messages", {
                memberId: m.memberId, body: plainToDelta("This question has been open for a day with no reply. Can anyone help?"),
                workspaceId: m.workspaceId, channelId: m.channelId, parentMessagesId: m._id, integrationName: AGENT_NAMES.assistant, agent: true,
            })
            const row = await ctx.db.get(id)
            if (row) await noteReplyAdded(ctx, m._id, row)
            pinged++
        }
        return null
    },
})

// ---------- every 15 minutes: meeting prep (no AI) ----------

const clip = (s: string, n: number) => (s.length > n ? `${s.slice(0, n - 1).trimEnd()}…` : s)

const prepFor = async (ctx: MutationCtx, m: Doc<"meetings">) => {
    // the last time a meeting with this name happened in the workspace
    const earlier = await ctx.db.query("meetings")
        .withIndex("by_workspace_started", (q) => q.eq("workspaceId", m.workspaceId).lt("startedAt", m.startedAt))
        .order("desc").take(200)
    const name = m.title.trim().toLowerCase()
    const last = earlier.find((x) => x._id !== m._id && !x.deletedAt && !x.sample && x.endedAt && x.title.trim().toLowerCase() === name)
    const lines: string[] = []
    if (last) {
        const when = new Date(last.startedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" })
        lines.push(`Last time (${when}):`)
        const decided = await ctx.db.query("decisions").withIndex("by_meeting", (q) => q.eq("meetingId", last._id)).take(8)
        if (decided.length) {
            lines.push("Decided:", ...decided.map((d) => `• ${clip(d.text, 160)}`))
        } else if (last.summary?.trim()) {
            lines.push(clip(last.summary.trim().split("\n").filter(Boolean).slice(0, 4).join(" "), 400))
        }
        const tasks = await ctx.db.query("tasks").withIndex("by_workspace_id", (q) => q.eq("workspaceId", m.workspaceId)).order("desc").take(1_000)
        const open = tasks.filter((t) => t.sourceMeetingId === last._id && t.status !== "done")
        if (open.length) {
            const names = new Map<string, string>()
            for (const t of open.slice(0, 10)) {
                if (t.assigneeId && !names.has(String(t.assigneeId))) {
                    const mm = await ctx.db.get(t.assigneeId)
                    names.set(String(t.assigneeId), (mm ? (await ctx.db.get(mm.userId))?.name : null) ?? "someone")
                }
            }
            lines.push(`Still open from it (${open.length}):`, ...open.slice(0, 10).map((t) => `• ${clip(t.title, 120)}${t.assigneeId ? ` (${names.get(String(t.assigneeId))})` : ""}`))
        }
    }
    return lines.length ? lines.join("\n") : null
}

export const prepTick = internalMutation({
    args: {},
    handler: async (ctx) => {
        const now = Date.now()
        // scheduled, not started yet: startedAt is the planned time until someone joins
        const soon = await ctx.db.query("meetings").withIndex("by_ended_started", (q) => q.eq("endedAt", undefined).gte("startedAt", now + 15 * 60_000).lte("startedAt", now + 45 * 60_000)).take(300)
        const prepOn = onCheck(ctx, "meetingPrep")
        for (const m of soon) {
            if (!m.scheduledFor || m.kind === "oneToOne" || m.deletedAt || m.sample || m.prep) continue
            if (!(await prepOn(m.workspaceId)) || (await already(ctx, "meetingPrep", m._id))) continue
            await mark(ctx, "meetingPrep", m._id)
            const prep = await prepFor(ctx, m)
            if (!prep) continue
            await ctx.db.patch(m._id, { prep })
            await notify(ctx, { workspaceId: m.workspaceId, recipientId: m.createdBy, senderId: m.createdBy, type: "agent_nudge", meetingId: m._id, body: `Prep for “${m.title}” is ready: what was decided last time and what's still open.`, read: false }, { email: false })
        }
        return null
    },
})

// ---------- Mondays: weekly digest (one AI call per workspace, plain version if the allowance is spent) ----------

export const digestTick = internalMutation({
    args: {},
    handler: async (ctx) => {
        const rows = await ctx.db.query("automations").withIndex("by_key_enabled", (q) => q.eq("key", "weeklyDigest").eq("enabled", true)).take(1_000)
        const week = new Date().toISOString().slice(0, 10)
        let i = 0
        for (const r of rows) {
            if (!r.channelId || (await already(ctx, "weeklyDigest", `${r.workspaceId}:${week}`))) continue
            await mark(ctx, "weeklyDigest", `${r.workspaceId}:${week}`)
            // spread out so the free tier's per-minute limit isn't hit all at once
            await ctx.scheduler.runAfter(i++ * 20_000, internal.automations.digest, { workspaceId: r.workspaceId })
        }
        return null
    },
})

export const digestFacts = internalQuery({
    args: { workspaceId: v.id("workspaces") },
    handler: async (ctx, args) => {
        const since = Date.now() - 7 * DAY
        const setting = await settingFor(ctx, args.workspaceId, "weeklyDigest")
        if (!setting?.enabled || !setting.channelId) return null
        const channel = await ctx.db.get(setting.channelId)
        if (!channel) return null
        const tasks = await ctx.db.query("tasks").withIndex("by_workspace_id", (q) => q.eq("workspaceId", args.workspaceId)).order("desc").take(1_500)
        const done = tasks.filter((t) => t.status === "done" && (t.updatedAt ?? t._creationTime) > since).map((t) => t.title)
        const added = tasks.filter((t) => t._creationTime > since).map((t) => t.title)
        const overdue = tasks.filter((t) => t.status !== "done" && t.dueDate && t.dueDate < Date.now() - DAY).map((t) => t.title)
        const meetings = (await ctx.db.query("meetings").withIndex("by_workspace_started", (q) => q.eq("workspaceId", args.workspaceId).gte("startedAt", since)).take(100))
            .filter((m) => !m.deletedAt && !m.sample && m.kind !== "oneToOne" && m.endedAt)
            .map((m) => ({ title: m.title, summary: clip(m.summary?.trim() ?? "", 500) }))
        const decisions = (await ctx.db.query("decisions").withIndex("by_workspace", (q) => q.eq("workspaceId", args.workspaceId)).order("desc").take(60))
            .filter((d) => d._creationTime > since).map((d) => d.text)
        return { channelId: channel._id, channel: channel.name, done, added, overdue, meetings, decisions }
    },
})

const plainDigest = (f: { done: string[]; added: string[]; overdue: string[]; meetings: { title: string }[]; decisions: string[] }) => {
    const part = (label: string, items: string[]) => (items.length ? `${label} (${items.length}):\n${items.slice(0, 8).map((x) => `• ${clip(x, 120)}`).join("\n")}` : "")
    return ["This week in the workspace.", part("Done", f.done), part("Decided", f.decisions), part("Meetings", f.meetings.map((m) => m.title)), part("Overdue", f.overdue), part("New tasks", f.added)]
        .filter(Boolean).join("\n\n")
}

export const digest = internalAction({
    args: { workspaceId: v.id("workspaces") },
    handler: async (ctx, args): Promise<null> => {
        const f = await ctx.runQuery(internal.automations.digestFacts, { workspaceId: args.workspaceId })
        if (!f) return null
        const quiet = !f.done.length && !f.added.length && !f.meetings.length && !f.decisions.length && !f.overdue.length
        if (quiet) return null
        let text = plainDigest(f)
        const key = process.env.GROQ_API_KEY
        const left: number = key ? await ctx.runQuery(internal.aiBudget.left, { tier: "large" }) : 0
        if (key && left > 8_000) {
            const usage = { model: null as string | null, tokensIn: 0, tokensOut: 0 }
            try {
                const reply = await chat(key, [
                    { role: "system", content: "Write a team's weekly digest for their chat channel from the facts given. Plain text, no markdown headings. Start with one sentence on how the week went, then short bullet lines (•) under: Shipped, Decided, Needs attention. Skip empty sections. Under 180 words. Never invent anything." },
                    { role: "user", content: JSON.stringify({ done: f.done.slice(0, 40), decided: f.decisions.slice(0, 20), meetings: f.meetings.slice(0, 12), overdue: f.overdue.slice(0, 20), newTasks: f.added.slice(0, 30) }) },
                ], [], usage, "large")
                if (reply?.content?.trim()) text = reply.content.trim()
            } catch (e) {
                console.error("weekly digest AI failed, posting the plain version", e)
            }
            if (usage.model) await ctx.runMutation(internal.aiBudget.add, { model: usage.model, tokens: usage.tokensIn + usage.tokensOut })
        }
        await ctx.runMutation(internal.automations.post, { workspaceId: args.workspaceId, channelId: f.channelId, text })
        return null
    },
})

export const post = internalMutation({
    args: { workspaceId: v.id("workspaces"), channelId: v.id("channels"), text: v.string() },
    handler: async (ctx, args) => {
        const setting = await settingFor(ctx, args.workspaceId, "weeklyDigest")
        const author = setting ? await ctx.db.get(setting.updatedBy) : null
        if (!author) return null
        await ctx.db.insert("messages", {
            memberId: author._id, body: plainToDelta(args.text.slice(0, 4_000)), workspaceId: args.workspaceId, channelId: args.channelId,
            integrationName: "Weekly digest", agent: true,
        })
        return null
    },
})
