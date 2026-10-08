import { v, ConvexError } from "convex/values"
import { mutation, query, internalMutation, internalQuery, internalAction, MutationCtx } from "./_generated/server"
import { internal } from "./_generated/api"
import { Doc, Id } from "./_generated/dataModel"
import { requirePermission } from "./permissions"
import { checkLimitLazy, PLANS, getPlan } from "./limits"
import { logAudit } from "./audit"
import { consume } from "./rateLimit"
import { text, deltaToText } from "./validate"

// ---------------------------------------------------------------------------------------------
// API keys, incoming webhooks, GitHub hooks and outgoing webhooks.
// Keys and URL tokens are shown once and stored only as a SHA-256 hash.
// ---------------------------------------------------------------------------------------------

export type Kind = "apiKey" | "incoming" | "github" | "outgoing"
type LimitFeature = "apiKeys" | "incomingHooks" | "outgoingHooks" | "githubHooks"

const FEATURE: Record<Kind, LimitFeature> = {
    apiKey: "apiKeys",
    incoming: "incomingHooks",
    github: "githubHooks",
    outgoing: "outgoingHooks",
}

// requests per minute, per key / hook
const RATE: Record<Kind, number> = { apiKey: 120, incoming: 60, github: 120, outgoing: 0 }

export const EVENTS = ["message.created", "task.created", "task.completed"] as const

const kindValidator = v.union(v.literal("apiKey"), v.literal("incoming"), v.literal("github"), v.literal("outgoing"))

const hex = (bytes: Uint8Array) => Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join("")
const randomHex = (n: number) => {
    const b = new Uint8Array(n)
    crypto.getRandomValues(b)
    return hex(b)
}
export const sha256Hex = async (s: string) => hex(new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s))))

export const hmacHex = async (secret: string, body: string) => {
    const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"])
    return hex(new Uint8Array(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(body))))
}

// Outgoing webhooks go to public HTTPS hosts only (no localhost, private names or raw IP addresses).
const checkUrl = (raw: string): string => {
    let u: URL
    try { u = new URL(raw.trim()) } catch { throw new ConvexError("Enter a full https:// address") }
    const host = u.hostname.toLowerCase()
    if (u.protocol !== "https:") throw new ConvexError("Webhook addresses must start with https://")
    if (u.username || u.password) throw new ConvexError("Remove the username and password from the address")
    if (u.port && u.port !== "443") throw new ConvexError("Webhook addresses must use the standard HTTPS port")
    const bad =
        !host.includes(".") ||
        /^[\d.]+$/.test(host) || host.includes(":") || host.startsWith("[") ||
        /(^|\.)(localhost|local|internal|lan|home|corp|intranet)$/.test(host)
    if (bad) throw new ConvexError("That address isn't allowed. Use a public website address.")
    if (raw.length > 500) throw new ConvexError("That address is too long")
    return u.toString()
}

const publicRow = (r: Doc<"integrations">) => ({
    _id: r._id,
    kind: r.kind,
    name: r.name,
    prefix: r.prefix,
    channelId: r.channelId,
    url: r.url,
    events: r.events,
    includePrivate: !!r.includePrivate,
    active: r.active,
    lastUsedAt: r.lastUsedAt,
    failCount: r.failCount ?? 0,
    lastStatus: r.lastStatus,
    _creationTime: r._creationTime,
})

// ---- management (workspace settings) ----

export const list = query({
    args: { workspaceId: v.id("workspaces") },
    handler: async (ctx, args) => {
        await requirePermission(ctx, args.workspaceId, "editWorkspace", "Only admins can manage integrations")
        const rows = await ctx.db.query("integrations").withIndex("by_workspace_id", (q) => q.eq("workspaceId", args.workspaceId)).take(200)
        const workspace = await ctx.db.get(args.workspaceId)
        const plan = PLANS[getPlan(workspace?.plan)]
        return {
            site: (process.env.CONVEX_SITE_URL ?? "").replace(/\/$/, ""),
            allowed: { apiKey: plan.apiKeys !== 0, incoming: plan.incomingHooks !== 0, github: plan.githubHooks !== 0, outgoing: plan.outgoingHooks !== 0 },
            rows: rows.map(publicRow),
        }
    },
})

export const create = mutation({
    args: {
        workspaceId: v.id("workspaces"),
        kind: kindValidator,
        name: v.string(),
        channelId: v.optional(v.id("channels")),
        url: v.optional(v.string()),
        events: v.optional(v.array(v.string())),
        includePrivate: v.optional(v.boolean()),
    },
    handler: async (ctx, args) => {
        const { member } = await requirePermission(ctx, args.workspaceId, "editWorkspace", "Only admins can manage integrations")
        const name = text(args.name, 60, "Name", { required: true, collapse: true })

        const { allowed, limit, plan } = await checkLimitLazy(ctx, args.workspaceId, FEATURE[args.kind], async (cap) =>
            (await ctx.db.query("integrations").withIndex("by_workspace_kind", (q) => q.eq("workspaceId", args.workspaceId).eq("kind", args.kind)).take(cap)).length
        )
        if (!allowed) throw new ConvexError(`LIMIT_REACHED:${FEATURE[args.kind]}:${limit}:${plan}`)

        let channelId: Id<"channels"> | undefined
        if (args.kind === "incoming" || args.kind === "github") {
            if (!args.channelId) throw new ConvexError("Choose a channel to post into")
            const ch = await ctx.db.get(args.channelId)
            if (!ch || ch.workspaceId !== args.workspaceId) throw new ConvexError("Channel not found")
            channelId = ch._id
        }

        let url: string | undefined
        let events: string[] | undefined
        if (args.kind === "outgoing") {
            if (!args.url) throw new ConvexError("Enter the address to send events to")
            url = checkUrl(args.url)
            events = (args.events ?? [...EVENTS]).filter((e) => (EVENTS as readonly string[]).includes(e))
            if (events.length === 0) throw new ConvexError("Pick at least one event")
        }

        // apiKey: the whole key is the token. incoming / github: the token goes in the URL.
        const raw = randomHex(24)
        const token = args.kind === "apiKey" ? `wfx_${raw}` : raw
        const secret = args.kind === "outgoing" || args.kind === "github" ? randomHex(24) : undefined

        const id = await ctx.db.insert("integrations", {
            workspaceId: args.workspaceId,
            kind: args.kind,
            name,
            createdBy: member._id,
            tokenHash: args.kind === "outgoing" ? undefined : await sha256Hex(token),
            prefix: args.kind === "outgoing" ? undefined : token.slice(0, 8),
            channelId,
            url,
            secret,
            events,
            includePrivate: args.kind === "outgoing" ? !!args.includePrivate : undefined,
            active: true,
        })
        await logAudit(ctx, args.workspaceId, member._id, "integration.create", `${args.kind}: ${name}`)
        // the key / token / secret are returned this one time only
        return { id, token: args.kind === "outgoing" ? undefined : token, secret }
    },
})

export const setActive = mutation({
    args: { id: v.id("integrations"), active: v.boolean() },
    handler: async (ctx, args) => {
        const row = await ctx.db.get(args.id)
        if (!row) throw new ConvexError("Not found")
        const { member } = await requirePermission(ctx, row.workspaceId, "editWorkspace", "Only admins can manage integrations")
        await ctx.db.patch(row._id, { active: args.active, failCount: 0 })
        await logAudit(ctx, row.workspaceId, member._id, args.active ? "integration.on" : "integration.off", `${row.kind}: ${row.name}`)
    },
})

export const remove = mutation({
    args: { id: v.id("integrations") },
    handler: async (ctx, args) => {
        const row = await ctx.db.get(args.id)
        if (!row) return
        const { member } = await requirePermission(ctx, row.workspaceId, "editWorkspace", "Only admins can manage integrations")
        await ctx.db.delete(row._id)
        await logAudit(ctx, row.workspaceId, member._id, "integration.delete", `${row.kind}: ${row.name}`)
    },
})

// ---- used by the HTTP routes ----

// Looks the token up, checks the plan still allows it, and spends one request from its rate limit.
export const authenticate = internalMutation({
    args: { tokenHash: v.string(), kind: kindValidator },
    handler: async (ctx, args) => {
        const row = await ctx.db.query("integrations").withIndex("by_token_hash", (q) => q.eq("tokenHash", args.tokenHash)).unique()
        if (!row || row.kind !== args.kind || !row.active) return { status: "invalid" as const }
        const workspace = await ctx.db.get(row.workspaceId)
        if (!workspace) return { status: "invalid" as const }
        if (PLANS[getPlan(workspace.plan)][FEATURE[row.kind]] === 0) return { status: "plan" as const }
        // keys and hooks act as the person who made them, so they follow the workspace's two-step rule too
        if (workspace.require2fa) {
            const creator = await ctx.db.get(row.createdBy)
            const tf = creator ? await ctx.db.query("twoFactor").withIndex("by_user_id", (q) => q.eq("userId", creator.userId)).unique() : null
            if (!tf?.enabled) return { status: "twofactor" as const }
        }
        if (!(await consume(ctx, `int:${row._id}`, RATE[row.kind], 60_000))) return { status: "limited" as const }
        const now = Date.now()
        if (!row.lastUsedAt || now - row.lastUsedAt > 60_000) await ctx.db.patch(row._id, { lastUsedAt: now })
        return { status: "ok" as const, id: row._id, secret: row.kind === "github" ? row.secret : undefined }
    },
})

type Part = string | [string, string]
export const delta = (parts: Part[]): string => {
    const ops = parts.map((p) => (typeof p === "string" ? { insert: p } : { insert: p[0], attributes: { link: p[1] } }))
    return JSON.stringify({ ops: [...ops, { insert: "\n" }] })
}

// Plain text (as sent by scripts and automation tools) -> message body, with web addresses made clickable.
export const plainToDelta = (raw: string): string => {
    const parts: Part[] = []
    let last = 0
    for (const m of raw.matchAll(/https?:\/\/[^\s<>"']+/g)) {
        const i = m.index ?? 0
        if (i > last) parts.push(raw.slice(last, i))
        parts.push([m[0], m[0]])
        last = i + m[0].length
    }
    if (last < raw.length) parts.push(raw.slice(last))
    return delta(parts)
}

// Posts as the integration (shown under its own name) into a public channel of its workspace.
export const postMessage = internalMutation({
    args: { id: v.id("integrations"), channelId: v.optional(v.id("channels")), body: v.string() },
    handler: async (ctx, args) => {
        const row = await ctx.db.get(args.id)
        if (!row) return { error: "Not found" }
        const channelId = row.channelId ?? args.channelId
        if (!channelId) return { error: "channelId is required" }
        const channel = await ctx.db.get(channelId)
        if (!channel || channel.workspaceId !== row.workspaceId) return { error: "Channel not found" }
        // keys can't reach locked channels
        if (channel.isPrivate && row.kind === "apiKey") return { error: "Channel not found" }
        const author = await ctx.db.get(row.createdBy)
        if (!author) return { error: "The person who created this integration has left the workspace" }
        if (deltaToText(args.body).length === 0) return { error: "text is required" }
        const messageId = await ctx.db.insert("messages", {
            memberId: author._id,
            body: args.body,
            workspaceId: row.workspaceId,
            channelId,
            integrationName: row.name,
        })
        return { id: messageId }
    },
})

const dayKey = (ms?: number) => (ms === undefined ? null : new Date(ms).toISOString().slice(0, 10))

export const apiChannels = internalQuery({
    args: { id: v.id("integrations") },
    handler: async (ctx, args) => {
        const row = await ctx.db.get(args.id)
        if (!row) return []
        const channels = await ctx.db.query("channels").withIndex("byWorkspaceId", (q) => q.eq("workspaceId", row.workspaceId)).take(500)
        return channels.filter((c) => !c.isPrivate).map((c) => ({ id: c._id, name: c.name, description: c.description ?? null, readOnly: !!c.readOnly }))
    },
})

export const apiMembers = internalQuery({
    args: { id: v.id("integrations") },
    handler: async (ctx, args) => {
        const row = await ctx.db.get(args.id)
        if (!row) return []
        const members = await ctx.db.query("members").withIndex("byWorkspaceId", (q) => q.eq("workspaceId", row.workspaceId)).take(300)
        const out = []
        for (const m of members) {
            const u = await ctx.db.get(m.userId)
            out.push({ id: m._id, name: u?.name ?? null, role: m.role })
        }
        return out
    },
})

export const apiMessages = internalQuery({
    args: { id: v.id("integrations"), channelId: v.id("channels"), limit: v.number() },
    handler: async (ctx, args) => {
        const row = await ctx.db.get(args.id)
        if (!row) return null
        const channel = await ctx.db.get(args.channelId)
        if (!channel || channel.workspaceId !== row.workspaceId || channel.isPrivate) return null
        const msgs = await ctx.db
            .query("messages")
            .withIndex("by_channel_id_parent_message_id_conversation_id", (q) =>
                q.eq("channelId", args.channelId).eq("parentMessagesId", undefined).eq("conversationId", undefined))
            .order("desc")
            .take(Math.min(Math.max(args.limit, 1), 50))
        const out = []
        for (const m of msgs) {
            let author = m.integrationName ?? null
            if (!author) {
                const mem = await ctx.db.get(m.memberId)
                author = (mem ? (await ctx.db.get(mem.userId))?.name : null) ?? null
            }
            out.push({ id: m._id, text: deltaToText(m.body), author, createdAt: new Date(m._creationTime).toISOString() })
        }
        return out
    },
})

export const apiTasks = internalQuery({
    args: { id: v.id("integrations"), status: v.optional(v.string()) },
    handler: async (ctx, args) => {
        const row = await ctx.db.get(args.id)
        if (!row) return []
        const tasks = await ctx.db.query("tasks").withIndex("by_workspace_id", (q) => q.eq("workspaceId", row.workspaceId)).order("desc").take(300)
        return tasks
            .filter((t) => !args.status || t.status === args.status)
            .slice(0, 100)
            .map((t) => ({
                id: t._id, title: t.title, description: t.description ?? null, status: t.status, priority: t.priority,
                assigneeId: t.assigneeId ?? null, dueDate: dayKey(t.dueDate), labels: t.labels ?? [],
            }))
    },
})

const STATUS = ["backlog", "todo", "in_progress", "in_review", "done"] as const
const PRIORITY = ["urgent", "high", "medium", "low"] as const

export const apiCreateTask = internalMutation({
    args: {
        id: v.id("integrations"),
        title: v.string(),
        description: v.optional(v.string()),
        status: v.optional(v.string()),
        priority: v.optional(v.string()),
        assigneeId: v.optional(v.string()),
        dueDate: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const row = await ctx.db.get(args.id)
        if (!row) return { error: "Not found" }
        const author = await ctx.db.get(row.createdBy)
        if (!author) return { error: "The person who created this key has left the workspace" }
        const title = args.title.trim().replace(/\s+/g, " ")
        if (!title) return { error: "title is required" }
        if (title.length > 200) return { error: "title is too long (max 200 characters)" }
        const description = args.description?.trim()
        if (description && description.length > 5000) return { error: "description is too long (max 5000 characters)" }
        const status = (args.status ?? "todo") as (typeof STATUS)[number]
        const priority = (args.priority ?? "medium") as (typeof PRIORITY)[number]
        if (!STATUS.includes(status)) return { error: `status must be one of ${STATUS.join(", ")}` }
        if (!PRIORITY.includes(priority)) return { error: `priority must be one of ${PRIORITY.join(", ")}` }
        let assigneeId: Id<"members"> | undefined
        if (args.assigneeId) {
            const nid = ctx.db.normalizeId("members", args.assigneeId)
            const m = nid ? await ctx.db.get(nid) : null
            if (!m || m.workspaceId !== row.workspaceId || m.role === "guest") return { error: "assigneeId is not a member of this workspace" }
            assigneeId = m._id
        }
        let dueDate: number | undefined
        if (args.dueDate) {
            if (!/^\d{4}-\d{2}-\d{2}$/.test(args.dueDate) || Number.isNaN(new Date(args.dueDate).getTime())) return { error: "dueDate must look like 2026-12-31" }
            dueDate = new Date(args.dueDate).getTime()
        }
        const taskId = await ctx.db.insert("tasks", {
            workspaceId: row.workspaceId, title, description: description || undefined, status, priority,
            assigneeId, dueDate, createdBy: author._id, updatedAt: Date.now(),
        })
        await emit(ctx, row.workspaceId, "task.created", { id: taskId, title, status, priority, assigneeId: assigneeId ?? null, dueDate: dayKey(dueDate) })
        return { id: taskId }
    },
})

// ---- outgoing webhooks ----

// Called from the mutations that create messages / tasks. Does nothing unless a hook wants the event.
export async function emit(ctx: MutationCtx, workspaceId: Id<"workspaces">, event: (typeof EVENTS)[number], data: Record<string, unknown> | (() => Promise<Record<string, unknown>>), opts?: { fromPrivate?: boolean }) {
    const hooks = await ctx.db.query("integrations").withIndex("by_workspace_kind", (q) => q.eq("workspaceId", workspaceId).eq("kind", "outgoing")).take(20)
    const live = hooks.filter((h) => h.active && (h.events ?? []).includes(event) && (!opts?.fromPrivate || h.includePrivate))
    if (live.length === 0) return
    const workspace = await ctx.db.get(workspaceId)
    if (!workspace || PLANS[getPlan(workspace.plan)].outgoingHooks === 0) return
    await ctx.scheduler.runAfter(0, internal.integrations.deliver, { hookIds: live.map((h) => h._id), event, workspaceId, data: typeof data === "function" ? await data() : data })
}

export const getHook = internalQuery({
    args: { id: v.id("integrations") },
    handler: async (ctx, args) => {
        const h = await ctx.db.get(args.id)
        if (!h || !h.active || !h.url || !h.secret) return null
        return { url: h.url, secret: h.secret }
    },
})

export const recordDelivery = internalMutation({
    args: { id: v.id("integrations"), ok: v.boolean(), status: v.string() },
    handler: async (ctx, args) => {
        const h = await ctx.db.get(args.id)
        if (!h) return
        const failCount = args.ok ? 0 : (h.failCount ?? 0) + 1
        // a dead endpoint is switched off after 15 failures in a row
        await ctx.db.patch(h._id, { failCount, lastStatus: args.status, lastUsedAt: Date.now(), active: failCount >= 15 ? false : h.active })
    },
})

export const deliver = internalAction({
    args: { hookIds: v.array(v.id("integrations")), event: v.string(), workspaceId: v.id("workspaces"), data: v.any() },
    handler: async (ctx, args) => {
        const body = JSON.stringify({ event: args.event, createdAt: new Date().toISOString(), workspaceId: args.workspaceId, data: args.data })
        await Promise.all(args.hookIds.map(async (id) => {
            const hook = await ctx.runQuery(internal.integrations.getHook, { id })
            if (!hook) return
            let ok = false
            let status = "error"
            try {
                const sig = `sha256=${await hmacHex(hook.secret, body)}`
                const r = await ctx.runAction(internal.webhookSend.post, { url: hook.url, event: args.event, signature: sig, body })
                ok = r.ok
                status = r.status
            } catch {
                status = "unreachable"
            }
            await ctx.runMutation(internal.integrations.recordDelivery, { id, ok, status })
        }))
    },
})

// ---- GitHub ----

const short = (s: string | undefined | null, n: number) => {
    const t = (s ?? "").replace(/\s+/g, " ").trim()
    return t.length > n ? t.slice(0, n - 1) + "…" : t
}

/* eslint-disable @typescript-eslint/no-explicit-any */
export function githubMessage(event: string, p: any): string | null {
    const repo: string = p?.repository?.full_name ?? "a repository"
    const who: string = p?.sender?.login ?? "Someone"
    switch (event) {
        case "ping":
            return delta([`✅ GitHub is connected to ${repo}`])
        case "push": {
            if (p.deleted || !String(p.ref ?? "").startsWith("refs/heads/")) return null
            const branch = String(p.ref).replace("refs/heads/", "")
            const commits: any[] = p.commits ?? []
            if (commits.length === 0) return null
            const parts: Part[] = [`${p.pusher?.name ?? who} pushed `, [`${commits.length} commit${commits.length === 1 ? "" : "s"}`, p.compare], ` to ${repo}:${branch}`]
            for (const c of commits.slice(0, 5)) parts.push(`\n• ${short(String(c.message).split("\n")[0], 100)} `, [`(${String(c.id).slice(0, 7)})`, c.url])
            if (commits.length > 5) parts.push(`\n…and ${commits.length - 5} more`)
            return delta(parts)
        }
        case "pull_request": {
            const pr = p.pull_request
            if (!pr) return null
            const act = p.action === "closed" ? (pr.merged ? "merged" : "closed") : p.action
            if (!["opened", "reopened", "ready_for_review", "closed"].includes(p.action)) return null
            return delta([`${who} ${act.replace("_", " ")} pull request `, [`#${pr.number} ${short(pr.title, 100)}`, pr.html_url], ` in ${repo}`])
        }
        case "issues": {
            const is = p.issue
            if (!is || !["opened", "closed", "reopened"].includes(p.action)) return null
            return delta([`${who} ${p.action} issue `, [`#${is.number} ${short(is.title, 100)}`, is.html_url], ` in ${repo}`])
        }
        case "issue_comment": {
            if (p.action !== "created" || !p.issue || !p.comment) return null
            return delta([`${who} commented on `, [`#${p.issue.number} ${short(p.issue.title, 80)}`, p.comment.html_url], `:\n“${short(p.comment.body, 200)}”`])
        }
        case "release": {
            if (p.action !== "published" || !p.release) return null
            return delta([`🚀 ${repo} released `, [short(p.release.name || p.release.tag_name, 80), p.release.html_url]])
        }
        case "workflow_run": {
            const r = p.workflow_run
            if (p.action !== "completed" || !r || r.conclusion !== "failure") return null
            return delta([`❌ Build failed: `, [`${short(r.name, 60)} on ${r.head_branch}`, r.html_url], ` (${repo})`])
        }
        default:
            return null
    }
}
