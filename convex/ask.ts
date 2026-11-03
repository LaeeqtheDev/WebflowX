import { v, ConvexError } from "convex/values"
import { internalAction, internalMutation, internalQuery, mutation, query } from "./_generated/server"
import { internal } from "./_generated/api"
import { Doc, Id } from "./_generated/dataModel"
import { signedInMember, startPrivateRun } from "./agents"
import { chat, costOf } from "./agentRunner"
import type { Hit } from "./knowledge"

// "Ask WebflowX": a private side panel (Ctrl/⌘+J) where someone asks the agent about their workspace.
// Read-only: it searches what that person can see, shows its steps as it works, and cites sources they can click.
// Each question is one agent run against the plan, and draws from the same daily Groq allowance as everything else.

const MAX_STEPS = 6
const MAX_QUESTION = 2_000
const HISTORY = 8

type Source = { n: number; kind: Hit["kind"]; refId: string; channelId?: string; title: string }
type Msg =
    | { role: "system" | "user"; content: string }
    | { role: "assistant"; content: string | null; tool_calls?: { id: string; type: "function"; function: { name: string; arguments: string } }[] }
    | { role: "tool"; tool_call_id: string; content: string }

const sourceV = v.object({
    n: v.number(),
    kind: v.union(v.literal("message"), v.literal("meeting"), v.literal("task"), v.literal("doc"), v.literal("decision")),
    refId: v.string(),
    channelId: v.optional(v.string()),
    title: v.string(),
})

const fn = (name: string, description: string, properties: Record<string, unknown>, required: string[]) =>
    ({ type: "function", function: { name, description, parameters: { type: "object", properties, required } } })
const TOOLS = [
    fn("search_workspace", "Search this workspace (channel messages, meeting summaries, tasks, docs, decisions) for keywords. Returns numbered sources.", {
        query: { type: "string" },
        kind: { type: "string", enum: ["message", "meeting", "task", "doc", "decision"], description: "Optional: only this kind" },
    }, ["query"]),
    fn("list_my_tasks", "The open tasks assigned to the person asking, soonest due first.", {}, []),
    fn("find_member", "Look up workspace members by (part of) their name.", { name: { type: "string" } }, ["name"]),
    fn("answer", "Give your answer. Plain text, short: the direct answer first, then up to 6 bullet lines (•). Cite sources like [2].", { text: { type: "string" } }, ["text"]),
]

// ---------- asking ----------

export const send = mutation({
    args: { workspaceId: v.id("workspaces"), threadId: v.optional(v.id("askThreads")), text: v.string() },
    handler: async (ctx, args) => {
        const member = await signedInMember(ctx, args.workspaceId)
        if (!member) throw new ConvexError("Ask isn't available to guests")
        const text = args.text.trim().slice(0, MAX_QUESTION)
        if (!text) throw new ConvexError("Type a question")
        let threadId = args.threadId
        if (threadId) {
            const thread = await ctx.db.get(threadId)
            if (!thread || thread.memberId !== member._id) throw new ConvexError("Conversation not found")
            const last = await ctx.db.query("askMessages").withIndex("by_thread", (q) => q.eq("threadId", threadId!)).order("desc").first()
            if (last?.status === "thinking") throw new ConvexError("Wait for the answer first")
        }
        // checks the agent is on, the hourly limit and the month's runs before anything is written
        const runId = await startPrivateRun(ctx, member)
        if (!threadId) {
            threadId = await ctx.db.insert("askThreads", { workspaceId: args.workspaceId, memberId: member._id, title: text.replace(/\s+/g, " ").slice(0, 80), updatedAt: Date.now() })
        } else {
            await ctx.db.patch(threadId, { updatedAt: Date.now() })
        }
        await ctx.db.insert("askMessages", { threadId, role: "user", text })
        const answerId = await ctx.db.insert("askMessages", { threadId, role: "assistant", text: "", status: "thinking", steps: [] })
        await ctx.scheduler.runAfter(0, internal.ask.respond, { answerId, runId })
        return threadId
    },
})

export const context = internalQuery({
    args: { answerId: v.id("askMessages"), runId: v.id("agentRuns") },
    handler: async (ctx, args) => {
        const answer = await ctx.db.get(args.answerId)
        const thread = answer ? await ctx.db.get(answer.threadId) : null
        const member = thread ? await ctx.db.get(thread.memberId) : null
        if (!answer || !thread || !member) return null
        const user = await ctx.db.get(member.userId)
        const rows = await ctx.db.query("askMessages").withIndex("by_thread", (q) => q.eq("threadId", thread._id)).order("desc").take(HISTORY + 1)
        const history = rows.filter((r) => r._id !== answer._id && (r.role === "user" || r.status === "done")).reverse()
            .map((r) => ({ role: r.role, text: r.text.slice(0, 1_500) }))
        return { memberId: member._id, workspaceId: thread.workspaceId, name: user?.name ?? "a teammate", history }
    },
})

export const findMembers = internalQuery({
    args: { workspaceId: v.id("workspaces"), name: v.string() },
    handler: async (ctx, args) => {
        const q = args.name.toLowerCase().trim()
        if (!q) return []
        const members = await ctx.db.query("members").withIndex("byWorkspaceId", (x) => x.eq("workspaceId", args.workspaceId)).take(500)
        const out: { member_id: string; name: string; role: string }[] = []
        for (const m of members) {
            const u = await ctx.db.get(m.userId)
            const name = u?.name ?? u?.email ?? ""
            if (name.toLowerCase().includes(q)) out.push({ member_id: m._id, name, role: m.role })
            if (out.length >= 5) break
        }
        return out
    },
})

export const step = internalMutation({
    args: { answerId: v.id("askMessages"), step: v.string() },
    handler: async (ctx, args) => {
        const a = await ctx.db.get(args.answerId)
        if (a?.status === "thinking") await ctx.db.patch(a._id, { steps: [...(a.steps ?? []), args.step.slice(0, 120)].slice(-12) })
    },
})

export const finish = internalMutation({
    args: { answerId: v.id("askMessages"), runId: v.id("agentRuns"), text: v.string(), ok: v.boolean(), sources: v.array(sourceV) },
    handler: async (ctx, args) => {
        const a = await ctx.db.get(args.answerId)
        if (a) await ctx.db.patch(a._id, { text: args.text.slice(0, 8_000), status: args.ok ? "done" : "error", sources: args.sources })
        const run = await ctx.db.get(args.runId)
        if (run && run.status === "running") {
            await ctx.db.patch(run._id, args.ok
                ? { status: "done", note: "Answered a private question", finishedAt: Date.now() }
                : { status: "failed", error: args.text.slice(0, 300), finishedAt: Date.now() })
        }
    },
})

const kindLabel: Record<Hit["kind"], string> = { message: "messages", meeting: "meetings", task: "tasks", doc: "docs", decision: "decisions" }

export const respond = internalAction({
    args: { answerId: v.id("askMessages"), runId: v.id("agentRuns") },
    handler: async (ctx, args): Promise<null> => {
        const sources: Source[] = []
        const usage = { model: null as string | null, tokensIn: 0, tokensOut: 0 }
        const done = async (text: string, ok: boolean) => {
            if (usage.model) {
                await ctx.runMutation(internal.agents.recordUsage, {
                    runId: args.runId, model: usage.model, tokensIn: usage.tokensIn, tokensOut: usage.tokensOut, costUsd: costOf(usage.model, usage.tokensIn, usage.tokensOut),
                })
            }
            const used = ok ? sources.filter((s) => text.includes(`[${s.n}]`)) : []
            await ctx.runMutation(internal.ask.finish, { answerId: args.answerId, runId: args.runId, text, ok, sources: used })
            return null
        }
        const say = (s: string) => ctx.runMutation(internal.ask.step, { answerId: args.answerId, step: s })
        try {
            const key = process.env.GROQ_API_KEY
            if (!key) return await done("The AI key isn't set up yet (GROQ_API_KEY on the Convex deployment).", false)
            const c = await ctx.runQuery(internal.ask.context, { answerId: args.answerId, runId: args.runId })
            if (!c) return await done("This conversation is gone.", false)
            const left: number = await ctx.runQuery(internal.aiBudget.left, { tier: "large" })
            if (left < 6_000) return await done("This workspace has used today's AI allowance. Ask again tomorrow.", false)

            const cite = (hits: Hit[]) => hits.map((h) => {
                let n = sources.findIndex((x) => x.refId === h.refId) + 1
                if (!n) { sources.push({ n: sources.length + 1, kind: h.kind, refId: h.refId, channelId: h.channelId ?? undefined, title: h.title }); n = sources.length }
                return { source: n, kind: h.kind, title: h.title, when: new Date(h.at).toISOString().slice(0, 10), text: h.text.slice(0, 600) }
            })
            const asked = c.history.filter((h) => h.role === "user"); const question = asked[asked.length - 1]?.text ?? ""
            const now = new Date()
            const messages: Msg[] = [{
                role: "system",
                content: [
                    `You are WebflowX, the assistant built into a team workspace. ${c.name} (member id ${c.memberId}) is asking you privately. Today is ${now.toISOString().slice(0, 10)} (UTC).`,
                    "- Answer from the workspace: search before answering anything about past work, decisions, meetings, tasks or docs. Try other keywords if a search finds nothing.",
                    "- Cite the numbered sources you used like [2]. Never invent facts, names, numbers or decisions; if you can't find it, say so.",
                    "- You can't change anything from here. If they want tasks made or changed, tell them to @agent in a channel.",
                    "- Finish by calling answer once. Short and plain: no headings, no markdown tables.",
                ].join("\n"),
            }]
            for (const h of c.history.slice(0, -1)) messages.push(h.role === "user" ? { role: "user", content: h.text } : { role: "assistant", content: h.text })
            messages.push({ role: "user", content: question })

            // one free search up front, so most questions need a single model call
            await say("Searching the workspace")
            const first: Hit[] = await ctx.runQuery(internal.knowledge.textSearch, { memberId: c.memberId as Id<"members">, query: question })
            if (first.length) {
                await say(`Found ${first.length} possible source${first.length === 1 ? "" : "s"}`)
                messages.push({ role: "user", content: `Possibly relevant, from this workspace (cite as [n] when you use one):\n${JSON.stringify(cite(first.slice(0, 6)))}` })
            }
            await say("Thinking")
            for (let i = 0; i < MAX_STEPS; i++) {
                const reply = await chat(key, messages, TOOLS, usage, "large")
                if (!reply) throw new Error("The AI gave no answer")
                const calls = reply.tool_calls ?? []
                messages.push({ role: "assistant", content: reply.content ?? null, tool_calls: calls.length ? calls : undefined })
                if (!calls.length) {
                    const text = reply.content?.trim()
                    return await done(text || "Sorry, I couldn't find an answer to that in this workspace.", true)
                }
                for (const call of calls) {
                    let input: Record<string, unknown> = {}
                    try { input = JSON.parse(call.function.arguments || "{}") } catch { /* answered below */ }
                    const str = (k: string) => (typeof input[k] === "string" ? (input[k] as string) : undefined)
                    let result = "Unknown tool."
                    switch (call.function.name) {
                        case "search_workspace": {
                            const q = (str("query") ?? "").trim()
                            const kind = str("kind") as Hit["kind"] | undefined
                            const ok = kind && kind in kindLabel ? kind : undefined
                            await say(`Searching ${ok ? kindLabel[ok] : "everything"} for “${q.slice(0, 40)}”`)
                            const hits: Hit[] = q ? await ctx.runQuery(internal.knowledge.textSearch, { memberId: c.memberId as Id<"members">, query: q, kind: ok }) : []
                            result = hits.length ? JSON.stringify(cite(hits.slice(0, 8))).slice(0, 6_000) : "Nothing found."
                            break
                        }
                        case "list_my_tasks": {
                            await say("Checking your tasks")
                            const mine: unknown[] = await ctx.runQuery(internal.agents.myTasks, { runId: args.runId })
                            result = mine.length ? JSON.stringify(mine).slice(0, 5_000) : "They have no open tasks."
                            break
                        }
                        case "find_member": {
                            await say(`Looking up ${(str("name") ?? "").slice(0, 30)}`)
                            const found = await ctx.runQuery(internal.ask.findMembers, { workspaceId: c.workspaceId, name: str("name") ?? "" })
                            result = found.length ? JSON.stringify(found) : "No member with that name."
                            break
                        }
                        case "answer": {
                            const text = str("text")?.trim()
                            if (text) return await done(text, true)
                            result = "The answer is empty."
                            break
                        }
                    }
                    messages.push({ role: "tool", tool_call_id: call.id, content: result })
                }
            }
            return await done("I couldn't pin that down. Try asking more specifically.", true)
        } catch (e) {
            console.error("ask failed", e)
            return await done("Sorry, the AI service didn't answer. Try again in a minute.", false)
        }
    },
})

// ---------- what the panel reads ----------

export const threads = query({
    args: { workspaceId: v.id("workspaces") },
    handler: async (ctx, args) => {
        const member = await signedInMember(ctx, args.workspaceId).catch(() => null)
        if (!member) return []
        const rows = await ctx.db.query("askThreads").withIndex("by_member", (q) => q.eq("memberId", member._id)).order("desc").take(30)
        return rows.map((t) => ({ _id: t._id, title: t.title, updatedAt: t.updatedAt }))
    },
})

const ownThread = async (ctx: Parameters<typeof signedInMember>[0], threadId: Id<"askThreads">): Promise<Doc<"askThreads"> | null> => {
    const thread = await ctx.db.get(threadId)
    if (!thread) return null
    const member = await signedInMember(ctx, thread.workspaceId).catch(() => null)
    return member && member._id === thread.memberId ? thread : null
}

export const messages = query({
    args: { threadId: v.id("askThreads") },
    handler: async (ctx, args) => {
        const thread = await ownThread(ctx, args.threadId)
        if (!thread) return []
        const rows = await ctx.db.query("askMessages").withIndex("by_thread", (q) => q.eq("threadId", thread._id)).take(200)
        return rows.map((m) => ({ _id: m._id, role: m.role, text: m.text, status: m.status ?? "done", steps: m.steps ?? [], sources: m.sources ?? [] }))
    },
})

export const deleteThread = mutation({
    args: { threadId: v.id("askThreads") },
    handler: async (ctx, args) => {
        const thread = await ownThread(ctx, args.threadId)
        if (!thread) return
        const rows = await ctx.db.query("askMessages").withIndex("by_thread", (q) => q.eq("threadId", thread._id)).take(500)
        for (const r of rows) await ctx.db.delete(r._id)
        await ctx.db.delete(thread._id)
    },
})
