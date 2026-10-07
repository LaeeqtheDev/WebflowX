import { assert2fa } from "./permissions"
import { v, ConvexError } from "convex/values"
import { mutation, query, internalMutation } from "./_generated/server"
import { auth } from "./auth"
import { notify } from "./notifications"
import { consume } from "./rateLimit"

const DAY = 24 * 60 * 60 * 1000
const MAX_RANGE = 62 * DAY // the page never asks for more than about two months

// Everything dated in a window, for the calendar page: task due dates, sprints and meetings.
export const events = query({
    args: { workspaceId: v.id("workspaces"), from: v.number(), to: v.number() },
    handler: async (ctx, args) => {
        const userId = await auth.getUserId(ctx)
        if (!userId) return null
        const member = await ctx.db
            .query("members")
            .withIndex("byWorkspaceId_user_id", (q) => q.eq("workspaceId", args.workspaceId).eq("userId", userId))
            .unique()
        if (member) await assert2fa(ctx, member)
        if (!member || member.role === "guest") return null
        if (args.to <= args.from || args.to - args.from > MAX_RANGE) return null

        const tasks = await ctx.db
            .query("tasks")
            .withIndex("by_workspace_due", (q) => q.eq("workspaceId", args.workspaceId).gte("dueDate", args.from).lt("dueDate", args.to))
            .take(1000)
        const taskRows = []
        for (const t of tasks) {
            const assignee = t.assigneeId ? await ctx.db.get(t.assigneeId) : null
            const assigneeUser = assignee ? await ctx.db.get(assignee.userId) : null
            taskRows.push({
                _id: t._id,
                title: t.title,
                status: t.status,
                priority: t.priority,
                dueDate: t.dueDate!,
                assigneeId: t.assigneeId,
                assigneeName: assigneeUser?.name ?? undefined,
            })
        }

        const sprints = await ctx.db
            .query("sprints")
            .withIndex("by_workspace_id", (q) => q.eq("workspaceId", args.workspaceId))
            .take(200)
        const sprintRows = sprints
            .filter((s) => s.startDate !== undefined && s.endDate !== undefined && s.startDate < args.to && s.endDate >= args.from)
            .map((s) => ({ _id: s._id, name: s.name, status: s.status, startDate: s.startDate!, endDate: s.endDate! }))

        const meetings = await ctx.db
            .query("meetings")
            .withIndex("by_workspace_id", (q) => q.eq("workspaceId", args.workspaceId))
            .order("desc")
            .take(300)
        const meetingRows = meetings
            .filter((m) => m.startedAt >= args.from && m.startedAt < args.to)
            .map((m) => ({ _id: m._id, title: m.title, startedAt: m.startedAt, endedAt: m.endedAt }))

        return { tasks: taskRows, sprints: sprintRows, meetings: meetingRows, myMemberId: member._id }
    },
})

// ---- Calendar app subscription (.ics) --------------------------------------

const newToken = () => {
    const bytes = new Uint8Array(24)
    crypto.getRandomValues(bytes)
    return Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join("")
}

const feedUrl = (token: string) => `${(process.env.CONVEX_SITE_URL ?? "").replace(/\/$/, "")}/calendar.ics?token=${token}`

// Returns my private subscription link, creating it the first time.
export const getFeed = mutation({
    args: {},
    handler: async (ctx) => {
        const userId = await auth.getUserId(ctx)
        if (!userId) throw new ConvexError("Please sign in")
        let row = await ctx.db.query("calendarFeeds").withIndex("by_user_id", (q) => q.eq("userId", userId)).unique()
        if (!row) {
            const token = newToken()
            const id = await ctx.db.insert("calendarFeeds", { userId, token })
            row = (await ctx.db.get(id))!
        }
        return { url: feedUrl(row.token) }
    },
})

// A new link; the old one stops working at once (use if it was shared by mistake).
export const resetFeed = mutation({
    args: {},
    handler: async (ctx) => {
        const userId = await auth.getUserId(ctx)
        if (!userId) throw new ConvexError("Please sign in")
        const token = newToken()
        const row = await ctx.db.query("calendarFeeds").withIndex("by_user_id", (q) => q.eq("userId", userId)).unique()
        if (row) await ctx.db.patch(row._id, { token })
        else await ctx.db.insert("calendarFeeds", { userId, token })
        return { url: feedUrl(token) }
    },
})

// Called by the /calendar.ics route. Returns my open tasks with due dates across all my workspaces.
export const feedData = internalMutation({
    args: { token: v.string() },
    handler: async (ctx, args) => {
        const row = await ctx.db.query("calendarFeeds").withIndex("by_token", (q) => q.eq("token", args.token)).unique()
        if (!row) return null
        if (!(await consume(ctx, `ics:${row._id}`, 120, 60 * 60_000))) return "limited" as const
        const memberships = await ctx.db.query("members").withIndex("byUserId", (q) => q.eq("userId", row.userId)).take(50)
        const items: { id: string; title: string; workspace: string; workspaceId: string; dueDate: number; priority: string; status: string }[] = []
        for (const m of memberships) {
            const ws = await ctx.db.get(m.workspaceId)
            if (!ws) continue
            const tasks = await ctx.db
                .query("tasks")
                .withIndex("by_workspace_id_assignee", (q) => q.eq("workspaceId", m.workspaceId).eq("assigneeId", m._id))
                .take(500)
            for (const t of tasks) {
                if (t.dueDate === undefined || t.status === "done") continue
                items.push({ id: t._id, title: t.title, workspace: ws.name, workspaceId: ws._id, dueDate: t.dueDate, priority: t.priority, status: t.status })
            }
        }
        return items
    },
})

// ---- Due-date reminders (hourly) -------------------------------------------

// Due dates are stored as midnight UTC of the chosen day. Remind once, when the deadline is within a day.
export const sendDueReminders = internalMutation({
    args: {},
    handler: async (ctx) => {
        const now = Date.now()
        const tasks = await ctx.db
            .query("tasks")
            .withIndex("by_due_date", (q) => q.gte("dueDate", now - DAY).lte("dueDate", now + DAY))
            .take(300)
        for (const t of tasks) {
            if (!t.assigneeId || t.status === "done" || t.reminderSentFor === t.dueDate) continue
            const assignee = await ctx.db.get(t.assigneeId)
            if (!assignee) continue
            await ctx.db.patch(t._id, { reminderSentFor: t.dueDate })
            await notify(ctx, {
                workspaceId: t.workspaceId,
                recipientId: t.assigneeId,
                senderId: t.assigneeId,
                type: "task_due",
                taskId: t._id,
                body: t.title,
                read: false,
            })
        }
    },
})
