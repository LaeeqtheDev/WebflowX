import { v } from "convex/values"
import { internalAction } from "./_generated/server"
import { internal } from "./_generated/api"

// The agents' loop: the model reads a meeting (follow-up agent) or new channel messages (triage agent),
// looks people up, and proposes tasks (and a recap) through tool calls. Nothing it proposes touches the workspace here; agents.finishRun checks every
// proposal again and either carries it out or holds it for approval.

const MAX_STEPS = 8
const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions"

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
    | { type: "task"; title: string; assigneeId?: string; dueDate?: string; priority?: string; sourceMessageId?: string }
    | { type: "recap"; text: string }

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
        }, ["title"]),
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

const chat = async (key: string, messages: Msg[], toolList: unknown[]) => {
    let last = ""
    for (const model of MODELS()) {
        const res = await fetch(GROQ_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
            body: JSON.stringify({ model, messages, tools: toolList, tool_choice: "auto", temperature: 0.2, max_tokens: 1_200 }),
        })
        if (res.ok) {
            const data = await res.json()
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
                    "- Base answers on the conversation and on what the search tools return. If you can't find it, say so plainly. Never invent facts, numbers or decisions.",
                    "- Search before answering questions about past decisions, work or meetings. Try different keywords if the first search finds nothing.",
                    "- Only create tasks when they ask for tasks (\"make tasks from this\", \"remind Dev to…\", \"add a task…\"). Use member ids for owners.",
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
                    "- Plain text only, no markdown headings or bold. A few simple emoji are fine.",
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
        const fail = async (error: string): Promise<null> => { await ctx.runMutation(internal.agents.failRun, { runId: args.runId, error }); return null }
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
            const messages = prompt(c, Date.now())
            const toolList = c.kind === "standup" ? standupTools
                : c.kind === "assistant" ? assistantTools(c.asker.canAssign)
                : tools(c.kind === "meetingFollowUp" && !!c.recapChannel, c.kind === "triage")
            const proposals: Proposal[] = []
            let note: string | undefined
            let steps = 0
            for (; steps < MAX_STEPS && note === undefined; steps++) {
                const reply = await chat(key, messages, toolList)
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
                            const found: unknown[] = await ctx.runQuery(internal.agents.search, { runId: args.runId, what, query: str("query") ?? "" })
                            result = found.length ? JSON.stringify(found).slice(0, 6_000) : "Nothing found."
                            break
                        }
                        case "create_task": {
                            const title = str("title")?.trim()
                            if (!title) { result = "A title is needed."; break }
                            proposals.push({ type: "task", title, assigneeId: str("assignee_member_id"), dueDate: str("due_date"), priority: str("priority") })
                            result = "Will be created."
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
                proposals.push({ type: "recap", text: made ? `Done. I added ${made} task${made === 1 ? "" : "s"} to the board.` : "Sorry, I couldn't find an answer to that in this workspace." })
            }
            await ctx.runMutation(internal.agents.finishRun, { runId: args.runId, proposals, note, steps })
            return null
        } catch (e) {
            const why = e instanceof Error ? e.message : "The agent stopped unexpectedly"
            // the standup still goes out without the AI: a plain list of the same facts
            const c: Context | null = await ctx.runQuery(internal.agents.context, { runId: args.runId }).catch(() => null)
            if (c?.kind === "assistant") {
                await ctx.runMutation(internal.agents.finishRun, { runId: args.runId, proposals: [{ type: "recap", text: "Sorry, I can't think straight right now (the AI service didn't answer). Try again in a minute." }], note: why, steps: 0 })
                return null
            }
            if (c?.kind === "standup" && !c.quiet) {
                await ctx.runMutation(internal.agents.finishRun, { runId: args.runId, proposals: [{ type: "recap", text: c.plain }], note: `Posted the plain version (${why.replace(/\.$/, "")}).`, steps: 0 })
                return null
            }
            return await fail(why)
        }
    },
})
