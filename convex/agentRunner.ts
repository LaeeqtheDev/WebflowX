import { v } from "convex/values"
import { internalAction } from "./_generated/server"
import { internal } from "./_generated/api"

// The follow-up agent's loop: the model reads the meeting, looks people up, and proposes tasks and a recap
// through tool calls. Nothing it proposes touches the workspace here; agents.finishRun checks every
// proposal again and either carries it out or holds it for approval.

const MAX_STEPS = 8
const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions"

type Msg =
    | { role: "system" | "user"; content: string }
    | { role: "assistant"; content: string | null; tool_calls?: ToolCall[] }
    | { role: "tool"; tool_call_id: string; content: string }
type ToolCall = { id: string; type: "function"; function: { name: string; arguments: string } }
type Context = {
    meeting: { title: string; startedAt: number; summary: string; transcript: string; participants: string[] }
    people: { id: string; name: string }[]
    openTasks: string[]
    recapChannel: string | null
}
type Proposal =
    | { type: "task"; title: string; assigneeId?: string; dueDate?: string; priority?: string }
    | { type: "recap"; text: string }

const tools = (hasRecap: boolean) => [
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
            description: "Propose one task for a concrete action item agreed in the meeting. One call per task.",
            parameters: {
                type: "object",
                properties: {
                    title: { type: "string", description: "Short imperative title, e.g. 'Send the launch email'" },
                    assignee_member_id: { type: "string", description: "The member id of the owner, only if the meeting made the owner clear" },
                    due_date: { type: "string", description: "YYYY-MM-DD, only if a date or day was said" },
                    priority: { type: "string", enum: ["urgent", "high", "medium", "low"] },
                },
                required: ["title"],
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
            if (!c) return await fail("The meeting is gone.")

            const now = Date.now()
            const people = c.people.slice(0, 60).map((p) => `- ${p.name} (member id: ${p.id})`).join("\n")
            const messages: Msg[] = [
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
                        `Workspace members:\n${people || "- (none)"}`,
                        `Open tasks already on the board:\n${c.openTasks.map((t) => `- ${t}`).join("\n") || "- (none)"}`,
                        `AI summary of the meeting:\n${c.meeting.summary || "(none)"}`,
                        c.meeting.transcript ? `Transcript (may be cut short):\n${c.meeting.transcript}` : "",
                    ].filter(Boolean).join("\n\n"),
                },
            ]
            const toolList = tools(!!c.recapChannel)
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
                            const hits = q ? c.people.filter((p) => p.name.toLowerCase().includes(q)).slice(0, 5) : []
                            result = hits.length ? JSON.stringify(hits) : "No member with that name."
                            break
                        }
                        case "propose_task": {
                            const title = str("title")?.trim()
                            if (!title) { result = "A title is needed."; break }
                            proposals.push({ type: "task", title, assigneeId: str("assignee_member_id"), dueDate: str("due_date"), priority: str("priority") })
                            result = "Noted."
                            break
                        }
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
            await ctx.runMutation(internal.agents.finishRun, { runId: args.runId, proposals, note, steps })
            return null
        } catch (e) {
            return await fail(e instanceof Error ? e.message : "The agent stopped unexpectedly")
        }
    },
})
