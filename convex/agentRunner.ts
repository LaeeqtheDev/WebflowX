import { v } from "convex/values"
import { action, internalAction } from "./_generated/server"
import { ConvexError } from "convex/values"
import { auth } from "./auth"
import type { Id } from "./_generated/dataModel"
import { internal } from "./_generated/api"
import type { Hit } from "./knowledge"

// The agents' loop: the model reads a meeting (follow-up agent) or new channel messages (triage agent),
// looks people up, and proposes tasks (and a recap) through tool calls. Nothing it proposes touches the workspace here; agents.finishRun checks every
// proposal again and either carries it out or holds it for approval.

const MAX_STEPS = 8
const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions"

type Source = { n: number; kind: Hit["kind"]; refId: string; channelId?: string; title: string }
type Msg =
    | { role: "system" | "user"; content: string }
    | { role: "assistant"; content: string | null; tool_calls?: ToolCall[] }
    | { role: "tool"; tool_call_id: string; content: string }
type ToolCall = { id: string; type: "function"; function: { name: string; arguments: string } }
type Person = { id: string; name: string }
type Line = { id: string; at: number; name: string; memberId: string; text: string }
type Context =
    | {
        kind: "meetingFollowUp"
        meeting: { title: string; startedAt: number; summary: string; transcript: string; participants: string[] }
        people: Person[]
        openTasks: string[]
        recapChannel: string | null
    }
    | { kind: "triage"; channel: string; earlier: Line[]; messages: Line[]; people: Person[]; openTasks: string[] }
    | { kind: "standup"; channel: string; facts: Facts; quiet: boolean; plain: string }
    | { kind: "assistant"; channel: string; asker: { id: string; name: string; canAssign: boolean }; question: Line; conversation: Line[]; people: Person[] }
type TaskLine = { title: string; who: string | null; due: number | null; priority: string }
type Facts = {
    today: string
    done: TaskLine[]; dueToday: TaskLine[]; overdue: TaskLine[]; added: TaskLine[]; inReview: TaskLine[]
    chat: { channel: string; who: string; text: string }[]
}
type Proposal =
    | { type: "task"; title: string; assigneeId?: string; dueDate?: string; priority?: string; sourceMessageId?: string; parentTaskId?: string }
    | { type: "meeting"; title: string; startsAt: string }
    | { type: "doc"; title: string; markdown: string }
    | { type: "recap"; text: string }
    | { type: "update"; taskId: string; status?: string; assigneeId?: string; dueDate?: string; priority?: string }

const standupTools = [
    {
        type: "function",
        function: {
            name: "post_standup",
            description: "Post the morning standup. Plain text with short sections and bullet lines (•). At most 18 lines.",
            parameters: { type: "object", properties: { text: { type: "string" } }, required: ["text"] },
        },
    },
    {
        type: "function",
        function: {
            name: "finish",
            description: "Call once you are done, with one sentence on what you did.",
            parameters: { type: "object", properties: { note: { type: "string" } }, required: ["note"] },
        },
    },
]

const fn = (name: string, description: string, properties: Record<string, unknown>, required: string[]) =>
    ({ type: "function", function: { name, description, parameters: { type: "object", properties, required } } })
const assistantTools = (canAssign: boolean) => [
    fn("search_messages", "Search what was said in the workspace's channels (only ones the person asking can see). Use a few keywords.", { query: { type: "string" } }, ["query"]),
    fn("search_tasks", "Search tasks on the board by keywords. Returns status, owner and due date.", { query: { type: "string" } }, ["query"]),
    fn("search_meetings", "Search past meetings by keywords. Returns their AI summaries.", { query: { type: "string" } }, ["query"]),
    fn("find_member", "Look up workspace members by (part of) their name.", { name: { type: "string" } }, ["name"]),
    fn("create_task", canAssign
        ? "Create a task, only when the person asked for tasks to be made. One call per task."
        : "Create a task, only when the person asked for tasks to be made. One call per task. This person can only assign tasks to themselves.",
        {
            title: { type: "string", description: "Short imperative title" },
            assignee_member_id: { type: "string" },
            due_date: { type: "string", description: "YYYY-MM-DD, only if a date or day was given" },
            priority: { type: "string", enum: ["urgent", "high", "medium", "low"] },
            parent_task_id: { type: "string", description: "Only when breaking an existing task into subtasks: that task's id (from search_tasks or list_my_tasks)" },
        }, ["title"]),
    fn("schedule_meeting", "Schedule a team meeting, only when asked (\"set up a call with the team Thursday 3pm\"). One per request.", {
        title: { type: "string" },
        starts_at: { type: "string", description: "ISO date-time in UTC, e.g. 2026-11-06T15:00:00Z. Work it out from today's date; ask in your answer if no time was given instead of guessing." },
    }, ["title", "starts_at"]),
    fn("draft_doc", "Write a doc page, only when asked (\"write this thread up as a doc\", \"draft a launch plan\"). Content in simple Markdown: # headings, - bullets, 1. lists, - [ ] checklists, **bold**. Base it on the thread and what you found; no invented facts.", {
        title: { type: "string" },
        markdown: { type: "string" },
    }, ["title", "markdown"]),
    fn("list_my_tasks", "The open tasks assigned to the person asking (with task ids), overdue and soonest due first. Use for 'what's on my plate', 'what's due', 'what am I late on'.", {}, []),
    fn("update_task", canAssign
        ? "Change an existing task the person asked you to change: status, owner, due date or priority. Get the task_id from search_tasks or list_my_tasks first. One call per task."
        : "Change an existing task the person asked you to change. This person can only change the status of tasks assigned to or created by them, or take a task themselves. Get the task_id from search_tasks or list_my_tasks first.",
        {
            task_id: { type: "string" },
            status: { type: "string", enum: ["backlog", "todo", "in_progress", "in_review", "done"] },
            assignee_member_id: { type: "string" },
            due_date: { type: "string", description: "YYYY-MM-DD" },
            priority: { type: "string", enum: ["urgent", "high", "medium", "low"] },
        }, ["task_id"]),
    fn("answer", "Post your reply in the thread. Plain text, short: a direct answer first, then up to 5 bullet lines (•). Say where facts came from (#channel, meeting name, task).", { text: { type: "string" } }, ["text"]),
    fn("finish", "Call once you have answered.", { note: { type: "string" } }, ["note"]),
]

const tools = (hasRecap: boolean, triage = false) => [
    {
        type: "function",
        function: {
            name: "find_member",
            description: "Look up workspace members by (part of) their name. Use it when the list you were given doesn't settle who someone is.",
            parameters: { type: "object", properties: { name: { type: "string" } }, required: ["name"] },
        },
    },
    {
        type: "function",
        function: {
            name: "propose_task",
            description: triage
                ? "Propose one task for a message that asks for something to be done. One call per message."
                : "Propose one task for a concrete action item agreed in the meeting. One call per task.",
            parameters: {
                type: "object",
                properties: {
                    ...(triage ? { source_message_id: { type: "string", description: "The id of the message the request came from" } } : {}),
                    title: { type: "string", description: "Short imperative title, e.g. 'Send the launch email'" },
                    assignee_member_id: { type: "string", description: "The member id of the owner, only if the meeting made the owner clear" },
                    due_date: { type: "string", description: "YYYY-MM-DD, only if a date or day was said" },
                    priority: { type: "string", enum: ["urgent", "high", "medium", "low"] },
                },
                required: triage ? ["title", "source_message_id"] : ["title"],
            },
        },
    },
    ...(hasRecap ? [{
        type: "function",
        function: {
            name: "post_recap",
            description: "Write the short recap message for the team channel: decisions and who owns what. Plain text, at most 8 short lines.",
            parameters: { type: "object", properties: { text: { type: "string" } }, required: ["text"] },
        },
    }] : []),
    {
        type: "function",
        function: {
            name: "finish",
            description: "Call once you are done, with one sentence on what you did.",
            parameters: { type: "object", properties: { note: { type: "string" } }, required: ["note"] },
        },
    },
]

const day = (ms: number) => new Date(ms).toISOString().slice(0, 10)
const weekday = (ms: number) => new Date(ms).toLocaleDateString("en-US", { weekday: "long", timeZone: "UTC" })

// Models get retired from time to time: try the configured one, then others that support tool calls.
const MODELS = () => [process.env.GROQ_AGENT_MODEL, "openai/gpt-oss-120b", "llama-3.3-70b-versatile"]
    .filter((m, i, all): m is string => !!m && all.indexOf(m) === i)

// US dollars per million tokens [input, output]. Estimates for the agents' cost meter:
// gpt-oss-120b from Groq's published rates (Oct 2026); llama-3.3-70b is sales-priced now, so its last list price.
export const PRICES: Record<string, [number, number]> = {
    "llama-3.1-8b-instant": [0.05, 0.08],
    "openai/gpt-oss-20b": [0.075, 0.3],
    "openai/gpt-oss-120b": [0.15, 0.6],
    "llama-3.3-70b-versatile": [0.59, 0.79],
}
export const costOf = (model: string, tokensIn: number, tokensOut: number) => {
    const [i, o] = PRICES[model] ?? PRICES["llama-3.3-70b-versatile"]
    return (tokensIn * i + tokensOut * o) / 1_000_000
}

type Usage = { model: string | null; tokensIn: number; tokensOut: number }

// "large" for answers people read; "small" (a fast model with its own free quota) for sorting and extracting.
const SMALL_MODELS = () => [process.env.GROQ_SMALL_MODEL, "llama-3.1-8b-instant", "openai/gpt-oss-20b"]
export const chat = async (key: string, messages: Msg[], toolList: unknown[], usage: Usage, tier: "large" | "small" = "large") => {
    let last = ""
    const list = (tier === "small" ? SMALL_MODELS() : MODELS()).filter((m): m is string => !!m)
    for (const model of [...new Set(list)]) {
        const res = await fetch(GROQ_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
            // an empty tool list is rejected by the API, so plain completions send none
            body: JSON.stringify({ model, messages, ...(toolList.length ? { tools: toolList, tool_choice: "auto" } : {}), temperature: 0.2, max_tokens: 1_200 }),
        })
        if (res.ok) {
            const data = await res.json()
            usage.model = model
            usage.tokensIn += Number(data.usage?.prompt_tokens) || 0
            usage.tokensOut += Number(data.usage?.completion_tokens) || 0
            return data.choices?.[0]?.message as { content: string | null; tool_calls?: ToolCall[] } | undefined
        }
        last = `${res.status} ${(await res.text().catch(() => "")).slice(0, 160)}`
        // only a retired / unknown model is worth trying the next one for
        if (res.status !== 400 && res.status !== 404) break
    }
    throw new Error(last.startsWith("401") ? "The AI key was refused" : last.startsWith("429") ? "The AI service is busy, try again in a minute" : `The AI service answered ${last}`)
}

const clock = (ms: number) => new Date(ms).toISOString().slice(11, 16)

// What the model is told, per agent.
const prompt = (c: Context, now: number): Msg[] => {
    const peopleOf = (list: Person[]) => list.slice(0, 60).map((p) => `- ${p.name} (member id: ${p.id})`).join("\n") || "- (none)"
    const openOf = (list: string[]) => list.map((t) => `- ${t}`).join("\n") || "- (none)"
    if (c.kind === "assistant") {
        return [
            {
                role: "system",
                content: [
                    "You are the WebflowX Agent, built into a team workspace. A teammate mentioned you with @agent. Help them like a sharp, friendly colleague.",
                    "Rules:",
                    "- When you use something from the numbered workspace snippets or search results, cite it like [2]. Only cite what you actually used.",
                    "- Base answers on the conversation and on what the search tools return. If you can't find it, say so plainly. Never invent facts, numbers or decisions.",
                    "- Search before answering questions about past decisions, work or meetings. Try different keywords if the first search finds nothing.",
                    "- You can change existing tasks when asked (\"mark the checkout fix done\", \"move my survey task to Friday\", \"give the FAQ review to Ava\"): find it with search_tasks or list_my_tasks, then update_task. Never change tasks nobody asked about.",
                    "- For \"what's on my plate / what's due / what am I late on\", use list_my_tasks and answer with the most urgent first.",
                    "- Only create tasks when they ask for tasks (\"make tasks from this\", \"remind Dev to…\", \"add a task…\"). Use member ids for owners. To break a task into subtasks, find it first and pass its id as parent_task_id.",
                    "- schedule_meeting and draft_doc only when asked for a meeting or a doc. Tell them in your answer what you scheduled or wrote.",
                    c.asker.canAssign ? "- They can assign tasks to anyone." : `- They can only assign tasks to themselves (member id ${c.asker.id}); leave other people's tasks unassigned and mention who it's for.`,
                    "- Due dates only when a day or date was given; work them out from today's date.",
                    "- Always finish by calling answer once (keep it short, plain text, no markdown headings), then finish.",
                ].join("\n"),
            },
            {
                role: "user",
                content: [
                    `Today is ${weekday(now)} ${day(now)} (UTC). You're in #${c.channel}. ${c.asker.name} (member id ${c.asker.id}) asked you.`,
                    `Workspace members:\n${peopleOf(c.people)}`,
                    c.conversation.length ? `The conversation so far:\n${c.conversation.map((m) => `[${clock(m.at)}] ${m.name}: ${m.text}`).join("\n")}` : "",
                    `Their message to you:\n${c.question.text}`,
                ].filter(Boolean).join("\n\n"),
            },
        ]
    }
    if (c.kind === "standup") {
        const rows = (list: TaskLine[]) => list.map((t) => `- ${t.title}${t.who ? ` (owner: ${t.who})` : " (no owner)"}${t.due ? `, due ${day(t.due)}` : ""}${t.priority === "urgent" || t.priority === "high" ? `, ${t.priority}` : ""}`).join("\n") || "- (none)"
        const f = c.facts
        return [
            {
                role: "system",
                content: [
                    `You are the standup agent inside WebflowX, a team workspace. Each morning you post a short standup in #${c.channel} so the team starts the day knowing where things stand.`,
                    "Rules:",
                    "- Open with one friendly line. Then short sections, only the ones that have something in them: Done, Due today, Overdue or stuck, Worth knowing.",
                    "- Bullet lines start with •. Name the owner after each task. Keep it under 18 lines in total.",
                    "- 'Worth knowing' is at most 3 bullets from chat: decisions, blockers, or something someone is waiting on. Skip small talk. Never invent anything that isn't in the data.",
                    "- Plain text only, no markdown headings or bold, and no emoji.",
                    "- Call post_standup once, then finish.",
                ].join("\n"),
            },
            {
                role: "user",
                content: [
                    `Today is ${f.today} where the team is.`,
                    `Done in the last day:\n${rows(f.done)}`,
                    `Due today:\n${rows(f.dueToday)}`,
                    `Overdue:\n${rows(f.overdue)}`,
                    `Waiting for review:\n${rows(f.inReview)}`,
                    `New tasks in the last day:\n${rows(f.added)}`,
                    `Chat in public channels over the last day (newest first):\n${f.chat.map((m) => `#${m.channel} ${m.who}: ${m.text}`).join("\n") || "- (none)"}`,
                ].join("\n\n"),
            },
        ]
    }
    if (c.kind === "triage") {
        const people = peopleOf(c.people), open = openOf(c.openTasks)
        return [
            {
                role: "system",
                content: [
                    "You are the triage agent inside WebflowX, a team workspace. You read new messages in a team channel and turn real requests into tasks so nothing asked for in chat gets lost.",
                    "Rules:",
                    "- Only propose a task when a message asks for something to be done, reports something broken that needs fixing, or someone commits to doing something ('I'll send it Friday').",
                    "- Ignore chit-chat, thanks, questions that just need an answer, and things already in the open tasks list.",
                    "- One task per message at most, linked with its source_message_id. Write the title as a short instruction ('Fix the checkout button on mobile').",
                    "- Owner: the person the request is addressed to (named or @mentioned), or whoever said they'd do it. Use their member id. If nobody is clear, leave it unassigned.",
                    "- Due date only when a date or day was said; work it out from today's date. Priority 'urgent' or 'high' only when the message says it's urgent, blocking or broken for customers.",
                    "- Use the tools, then call finish with one short sentence.",
                ].join("\n"),
            },
            {
                role: "user",
                content: [
                    `Today is ${weekday(now)} ${day(now)} (UTC). Channel: #${c.channel}.`,
                    `Workspace members:\n${people}`,
                    `Open tasks already on the board:\n${open}`,
                    c.earlier.length ? `Said just before (context only, don't make tasks from these):\n${c.earlier.map((m) => `[${clock(m.at)}] ${m.name}: ${m.text}`).join("\n")}` : "",
                    `New messages to triage:\n${c.messages.map((m) => `[message id: ${m.id}] [${clock(m.at)}] ${m.name} (member id: ${m.memberId}): ${m.text}`).join("\n")}`,
                ].filter(Boolean).join("\n\n"),
            },
        ]
    }
    const people = peopleOf(c.people), open = openOf(c.openTasks)
    return [
        {
            role: "system",
            content: [
                "You are the follow-up agent inside WebflowX, a team workspace. After a meeting you turn what was agreed into tasks so nothing gets lost.",
                "Rules:",
                "- Only propose tasks for action items people actually agreed to. No invented work, no vague tasks like 'Follow up'.",
                "- Assign an owner only when the meeting makes it clear who owns it, using their member id. Otherwise leave it unassigned.",
                "- Add a due date only when a date or day was said. Work out the date from today's date.",
                "- Skip anything that is already in the open tasks list.",
                c.recapChannel ? `- Post one short recap for #${c.recapChannel}: decisions, then who owns what. Plain text, no markdown headings.` : "- There is no recap channel, so don't write a recap.",
                "- Use the tools, then call finish. Keep everything short and in plain words.",
            ].join("\n"),
        },
        {
            role: "user",
            content: [
                `Today is ${weekday(now)} ${day(now)}. The meeting "${c.meeting.title}" was on ${weekday(c.meeting.startedAt)} ${day(c.meeting.startedAt)}.`,
                c.meeting.participants.length ? `People in the call: ${c.meeting.participants.join(", ")}` : "",
                `Workspace members:\n${people}`,
                `Open tasks already on the board:\n${open}`,
                `AI summary of the meeting:\n${c.meeting.summary || "(none)"}`,
                c.meeting.transcript ? `Transcript (may be cut short):\n${c.meeting.transcript}` : "",
            ].filter(Boolean).join("\n\n"),
        },
    ]
}

export const run = internalAction({
    args: { runId: v.id("agentRuns") },
    // annotated: the function refers to itself through `internal`, which TypeScript can't infer on its own
    handler: async (ctx, args): Promise<null> => {
        const started: boolean = await ctx.runMutation(internal.agents.markRunning, { runId: args.runId })
        if (!started) return null
        const usage: Usage = { model: null, tokensIn: 0, tokensOut: 0 }
        // whatever happens, what the AI was used for is written down for the cost meter
        const record = async () => {
            if (!usage.model) return
            await ctx.runMutation(internal.agents.recordUsage, {
                runId: args.runId, model: usage.model, tokensIn: usage.tokensIn, tokensOut: usage.tokensOut,
                costUsd: costOf(usage.model, usage.tokensIn, usage.tokensOut),
            })
        }
        const fail = async (error: string): Promise<null> => { await record(); await ctx.runMutation(internal.agents.failRun, { runId: args.runId, error }); return null }
        try {
            const key = process.env.GROQ_API_KEY
            if (!key) return await fail("The AI key isn't set up for agents yet (GROQ_API_KEY on the Convex deployment).")
            const c: Context | null = await ctx.runQuery(internal.agents.context, { runId: args.runId })
            if (!c) return await fail("What it was asked to look at is gone.")
            if (c.kind === "triage" && c.messages.length === 0) return await fail("The messages were deleted.")
            // a standup with nothing to say doesn't post (and doesn't call the AI)
            if (c.kind === "standup" && c.quiet) {
                await ctx.runMutation(internal.agents.finishRun, { runId: args.runId, proposals: [], note: "Nothing happened in the last day, so no standup was posted.", steps: 0 })
                return null
            }
            // Groq free tier: check today's shared budget first, and fall back to the plain versions when it's spent
            const tier = c.kind === "triage" ? "small" as const : "large" as const
            const budget: number = await ctx.runQuery(internal.aiBudget.left, { tier })
            if (budget < 6_000) {
                if (c.kind === "standup") {
                    await ctx.runMutation(internal.agents.finishRun, { runId: args.runId, proposals: [{ type: "recap", text: c.plain }], note: "Posted the plain version (today's AI allowance is used up).", steps: 0 })
                    return null
                }
                if (c.kind === "assistant") {
                    await ctx.runMutation(internal.agents.finishRun, { runId: args.runId, proposals: [{ type: "recap", text: "I've hit today's AI limit for this workspace's plan, so I can't look into this right now. Ask me again tomorrow." }], note: "Daily AI allowance used up", steps: 0 })
                    return null
                }
                return await fail("Today's AI allowance is used up. Agents pick up again tomorrow.")
            }
            const messages = prompt(c, Date.now())
            // @agent gets the best-matching snippets up front (one search, no extra model calls), numbered so it can cite them
            const sources: Source[] = []
            const cite = (hits: Hit[]) => hits.map((h) => {
                let n = sources.findIndex((x) => x.refId === h.refId) + 1
                if (!n) { sources.push({ n: sources.length + 1, kind: h.kind, refId: h.refId, channelId: h.channelId ?? undefined, title: h.title }); n = sources.length }
                return { source: n, kind: h.kind, title: h.title, when: new Date(h.at).toISOString().slice(0, 10), text: h.text.slice(0, 600) }
            })
            if (c.kind === "assistant") {
                const q = c.question.text.replace(/@agent\b/gi, " ").trim()
                const hits: Hit[] = q ? await ctx.runQuery(internal.knowledge.textSearch, { memberId: c.asker.id as Id<"members">, query: q }) : []
                if (hits.length) {
                    messages.push({ role: "user", content: `Possibly relevant, from this workspace (cite as [n] when you use one):\n${JSON.stringify(cite(hits.slice(0, 6)))}` })
                }
            }
            const toolList = c.kind === "standup" ? standupTools
                : c.kind === "assistant" ? assistantTools(c.asker.canAssign)
                : tools(c.kind === "meetingFollowUp" && !!c.recapChannel, c.kind === "triage")
            const proposals: Proposal[] = []
            let note: string | undefined
            let steps = 0
            for (; steps < MAX_STEPS && note === undefined; steps++) {
                const reply = await chat(key, messages, toolList, usage, tier)
                if (!reply) throw new Error("The AI gave no answer")
                const calls = reply.tool_calls ?? []
                messages.push({ role: "assistant", content: reply.content ?? null, tool_calls: calls.length ? calls : undefined })
                if (!calls.length) { note = reply.content?.trim().split("\n")[0] || undefined; break }
                for (const call of calls) {
                    let input: Record<string, unknown> = {}
                    try { input = JSON.parse(call.function.arguments || "{}") } catch { /* answered below */ }
                    const str = (k: string) => (typeof input[k] === "string" ? (input[k] as string) : undefined)
                    let result: string
                    switch (call.function.name) {
                        case "find_member": {
                            const q = (str("name") ?? "").toLowerCase().trim()
                            const hits = q && c.kind !== "standup" ? c.people.filter((p) => p.name.toLowerCase().includes(q)).slice(0, 5) : []
                            result = hits.length ? JSON.stringify(hits) : "No member with that name."
                            break
                        }
                        case "propose_task": {
                            const title = str("title")?.trim()
                            if (!title) { result = "A title is needed."; break }
                            proposals.push({ type: "task", title, assigneeId: str("assignee_member_id"), dueDate: str("due_date"), priority: str("priority"), sourceMessageId: str("source_message_id") })
                            result = "Noted."
                            break
                        }
                        case "search_messages":
                        case "search_tasks":
                        case "search_meetings": {
                            const what = call.function.name.slice(7) as "messages" | "tasks" | "meetings"
                            // the ranked index first; the older keyword scan when the index has nothing yet
                            const hits: Hit[] = c.kind === "assistant"
                                ? await ctx.runQuery(internal.knowledge.textSearch, { memberId: c.asker.id as Id<"members">, query: str("query") ?? "", kind: what === "messages" ? "message" : what === "tasks" ? "task" : "meeting" })
                                : []
                            if (hits.length) { result = JSON.stringify(cite(hits.slice(0, 8))).slice(0, 6_000); break }
                            const found: unknown[] = await ctx.runQuery(internal.agents.search, { runId: args.runId, what, query: str("query") ?? "" })
                            result = found.length ? JSON.stringify(found).slice(0, 6_000) : "Nothing found."
                            break
                        }
                        case "create_task": {
                            const title = str("title")?.trim()
                            if (!title) { result = "A title is needed."; break }
                            proposals.push({ type: "task", title, assigneeId: str("assignee_member_id"), dueDate: str("due_date"), priority: str("priority"), parentTaskId: str("parent_task_id") })
                            result = "Will be created."
                            break
                        }
                        case "schedule_meeting": {
                            const title = str("title")?.trim(), at = str("starts_at")?.trim()
                            if (!title || !at || !Number.isFinite(Date.parse(at))) { result = "A title and a valid starts_at are needed."; break }
                            if (Date.parse(at) < Date.now()) { result = "That time has passed. Pick a future time."; break }
                            proposals.push({ type: "meeting", title, startsAt: at })
                            result = "Will be scheduled if they're allowed to."
                            break
                        }
                        case "draft_doc": {
                            const title = str("title")?.trim(), markdown = str("markdown")?.trim()
                            if (!title || !markdown) { result = "A title and content are needed."; break }
                            proposals.push({ type: "doc", title, markdown })
                            result = "Will be created if they're allowed to."
                            break
                        }
                        case "list_my_tasks": {
                            const mine: unknown[] = await ctx.runQuery(internal.agents.myTasks, { runId: args.runId })
                            result = mine.length ? JSON.stringify(mine).slice(0, 5_000) : "They have no open tasks."
                            break
                        }
                        case "update_task": {
                            const taskId = str("task_id")?.trim()
                            if (!taskId) { result = "A task_id is needed (find it with search_tasks or list_my_tasks)."; break }
                            proposals.push({ type: "update", taskId, status: str("status"), assigneeId: str("assignee_member_id"), dueDate: str("due_date"), priority: str("priority") })
                            result = "Will be changed if they're allowed to."
                            break
                        }
                        case "answer":
                        case "post_standup":
                        case "post_recap": {
                            const text = str("text")?.trim()
                            if (!text) { result = "The recap is empty."; break }
                            proposals.push({ type: "recap", text })
                            result = "Noted."
                            break
                        }
                        case "finish":
                            note = str("note") ?? ""
                            result = "Done."
                            break
                        default:
                            result = "Unknown tool."
                    }
                    messages.push({ role: "tool", tool_call_id: call.id, content: result })
                }
            }
            // the person asking always hears back, even if the model forgot to answer
            if (c.kind === "assistant" && !proposals.some((p) => p.type === "recap")) {
                const made = proposals.filter((p) => p.type === "task").length
                const changed = proposals.filter((p) => p.type === "update").length
                const parts = [made && `added ${made} task${made === 1 ? "" : "s"}`, changed && `updated ${changed} task${changed === 1 ? "" : "s"}`,
                    proposals.some((p) => p.type === "meeting") && "scheduled the meeting", proposals.some((p) => p.type === "doc") && "drafted the doc"].filter(Boolean)
                proposals.push({ type: "recap", text: parts.length ? `Done. I ${parts.join(" and ")}.` : "Sorry, I couldn't find an answer to that in this workspace." })
            }
            // sources the answer cited go underneath it, so people can check
            if (c.kind === "assistant" && sources.length) {
                const answer = proposals.find((p): p is { type: "recap"; text: string } => p.type === "recap")
                const used = answer ? sources.filter((x) => answer.text.includes(`[${x.n}]`)) : []
                if (answer && used.length) answer.text = `${answer.text}\n\nSources: ${used.map((x) => `[${x.n}] ${x.title}`).join(" · ")}`
            }
            await record()
            await ctx.runMutation(internal.agents.finishRun, { runId: args.runId, proposals, note, steps })
            return null
        } catch (e) {
            const why = e instanceof Error ? e.message : "The agent stopped unexpectedly"
            // the standup still goes out without the AI: a plain list of the same facts
            const c: Context | null = await ctx.runQuery(internal.agents.context, { runId: args.runId }).catch(() => null)
            if (c?.kind === "assistant") {
                await record()
                await ctx.runMutation(internal.agents.finishRun, { runId: args.runId, proposals: [{ type: "recap", text: "Sorry, I can't think straight right now (the AI service didn't answer). Try again in a minute." }], note: why, steps: 0 })
                return null
            }
            if (c?.kind === "standup" && !c.quiet) {
                await record()
                await ctx.runMutation(internal.agents.finishRun, { runId: args.runId, proposals: [{ type: "recap", text: c.plain }], note: `Posted the plain version (${why.replace(/\.$/, "")}).`, steps: 0 })
                return null
            }
            return await fail(why)
        }
    },
})

// "Catch me up" in a channel: a private summary of what the reader missed. One plain completion (no tools),
// counted as an agent run; the text goes back to the person only.
export const catchUp = action({
    args: { channelId: v.id("channels") },
    handler: async (ctx, args): Promise<{ summary: string; count: number }> => {
        const userId = await auth.getUserId(ctx)
        if (!userId) throw new ConvexError("Please sign in")
        const key = process.env.GROQ_API_KEY
        if (!key) throw new ConvexError("The AI isn't set up yet (GROQ_API_KEY on the Convex deployment).")
        const got: { runId: Id<"agentRuns">; channel: string; me: string; since: number | null; lines: { at: number; name: string; text: string; reply: boolean }[] } =
            await ctx.runMutation(internal.agents.startCatchUp, { channelId: args.channelId, userId })
        if (got.lines.length === 0) {
            await ctx.runMutation(internal.agents.finishCatchUp, { runId: got.runId, note: "Nothing new to catch up on." })
            return { summary: "You're all caught up. Nothing new here since your last visit.", count: 0 }
        }
        const usage: Usage = { model: null, tokensIn: 0, tokensOut: 0 }
        if ((await ctx.runQuery(internal.aiBudget.left, { tier: "large" })) < 4_000) {
            await ctx.runMutation(internal.agents.failRun, { runId: got.runId, error: "Daily AI allowance used up" })
            throw new ConvexError("Today's AI allowance is used up. Catch me up works again tomorrow.")
        }
        try {
            const reply = await chat(key, [
                {
                    role: "system",
                    content: [
                        `You catch ${got.me} up on what they missed in #${got.channel}, a channel in their team workspace.`,
                        "Write plain text, no markdown headings, no emoji. Start with one sentence on the gist.",
                        "Then up to three short groups, only the ones with something in them, each a label line followed by bullet lines starting with •:",
                        "Decisions — what was agreed. For you — anything asking or mentioning " + got.me + ". Open questions — asked but not answered.",
                        "Name who said what. Never invent anything. Keep it under 14 lines.",
                    ].join("\n"),
                },
                { role: "user", content: got.lines.map((l) => `[${clock(l.at)}]${l.reply ? " (thread reply)" : ""} ${l.name}: ${l.text}`).join("\n").slice(0, 24_000) },
            ], [], usage)
            const summary = reply?.content?.trim() || "I couldn't summarise that just now."
            if (usage.model) await ctx.runMutation(internal.agents.recordUsage, { runId: got.runId, model: usage.model, tokensIn: usage.tokensIn, tokensOut: usage.tokensOut, costUsd: costOf(usage.model, usage.tokensIn, usage.tokensOut) })
            await ctx.runMutation(internal.agents.finishCatchUp, { runId: got.runId, note: `Caught someone up on ${got.lines.length} messages in #${got.channel}.` })
            return { summary, count: got.lines.length }
        } catch (e) {
            await ctx.runMutation(internal.agents.failRun, { runId: got.runId, error: e instanceof Error ? e.message : "The AI didn't answer" })
            throw new ConvexError("The AI service didn't answer. Try again in a minute.")
        }
    },
})
