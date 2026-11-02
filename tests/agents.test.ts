// @vitest-environment edge-runtime
/// <reference types="vite/client" />
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { convexTest } from "convex-test"
import schema from "../convex/schema"
import { api } from "../convex/_generated/api"
import type { Id } from "../convex/_generated/dataModel"
import { parseDue, looksLikeRequest, TRIAGE_DELAY_MS, localNow, mentionsAgent } from "../convex/agents"
import { internal } from "../convex/_generated/api"

const modules = import.meta.glob("../convex/**/*.ts")
const asUser = (t: ReturnType<typeof convexTest>, id: Id<"users">) => t.withIdentity({ subject: `${id}|session` })

async function setup(plan: "free" | "growth" = "growth") {
  const t = convexTest(schema, modules)
  const ids = await t.run(async (ctx) => {
    const owner = await ctx.db.insert("users", { name: "Olivia Owner" })
    const dev = await ctx.db.insert("users", { name: "Dev Patel" })
    const ava = await ctx.db.insert("users", { name: "Ava Chen" })
    const outsider = await ctx.db.insert("users", { name: "Eve Outsider" })
    const ws = await ctx.db.insert("workspaces", { name: "Bright", userId: owner, joinCode: "ABC123", plan })
    const other = await ctx.db.insert("workspaces", { name: "Elsewhere", userId: outsider, joinCode: "XYZ789" })
    const ownerM = await ctx.db.insert("members", { userId: owner, workspaceId: ws, role: "admin" })
    const devM = await ctx.db.insert("members", { userId: dev, workspaceId: ws, role: "member" })
    const avaM = await ctx.db.insert("members", { userId: ava, workspaceId: ws, role: "member" })
    const outsiderM = await ctx.db.insert("members", { userId: outsider, workspaceId: other, role: "admin" })
    const general = await ctx.db.insert("channels", { name: "general", workspaceId: ws })
    const locked = await ctx.db.insert("channels", { name: "leaders", workspaceId: ws, isPrivate: true, memberIds: [ownerM] })
    const meeting = await ctx.db.insert("meetings", {
      workspaceId: ws, roomName: "r1", title: "Weekly launch sync", createdBy: ownerM, startedAt: Date.now() - 3_600_000, endedAt: Date.now() - 60_000,
      participants: ["Olivia Owner", "Dev Patel", "Ava Chen"],
    })
    // a used AI summary credit: this is what makes a summary "real"
    await ctx.db.insert("aiSummaryLog", { workspaceId: ws, meetingId: meeting, memberId: ownerM, consumed: true })
    return { owner, dev, ava, outsider, ws, ownerM, devM, avaM, outsiderM, general, locked, meeting }
  })
  return { t, ids }
}

// A fake model: each reply is one assistant message with the given tool calls.
const call = (name: string, args: Record<string, unknown>, i = 0) => ({ id: `c${name}${i}`, type: "function", function: { name, arguments: JSON.stringify(args) } })
const fakeModel = (...replies: ReturnType<typeof call>[][]) => {
  const seen: unknown[] = []
  let n = 0
  const fetchMock = vi.fn(async (_url: string, init: { body: string }) => {
    seen.push(JSON.parse(init.body))
    const tool_calls = replies[Math.min(n++, replies.length - 1)]
    return new Response(JSON.stringify({ choices: [{ message: { role: "assistant", content: null, tool_calls } }], usage: { prompt_tokens: 1_000, completion_tokens: 100 } }), { status: 200 })
  })
  vi.stubGlobal("fetch", fetchMock)
  return { fetchMock, seen }
}

const SUMMARY = "📌 Action Items\n- Dev sends the launch email by Friday\n- Ava publishes the pricing page"
const nextFriday = () => {
  const d = new Date(); d.setUTCDate(d.getUTCDate() + ((5 - d.getUTCDay() + 7) % 7 || 7)); return d.toISOString().slice(0, 10)
}

describe("follow-up agent", () => {
  let ctx: Awaited<ReturnType<typeof setup>>
  beforeEach(async () => {
    vi.useFakeTimers()
    vi.stubEnv("GROQ_API_KEY", "test-key")
    ctx = await setup()
  })
  afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); vi.unstubAllEnvs() })

  const turnOn = (mode: "suggest" | "act", channel = true) =>
    asUser(ctx.t, ctx.ids.owner).mutation(api.agents.configure, { workspaceId: ctx.ids.ws, enabled: true, mode, channelId: channel ? ctx.ids.general : null })

  const saveSummary = async () => {
    await asUser(ctx.t, ctx.ids.owner).mutation(api.meetings.saveSummary, { id: ctx.ids.meeting, summary: SUMMARY })
    await ctx.t.finishAllScheduledFunctions(vi.runAllTimers)
  }

  const standardReplies = () => [
    [call("propose_task", { title: "Send the launch email", assignee_member_id: ctx.ids.devM, due_date: nextFriday(), priority: "high" }),
     call("propose_task", { title: "Publish the pricing page", assignee_member_id: ctx.ids.avaM }, 1)],
    [call("post_recap", { text: "Launch is Friday.\nDev: launch email. Ava: pricing page." })],
    [call("finish", { note: "Added 2 tasks and a recap." })],
  ]

  it("only lets the owner or an admin switch it on, and only with a public channel", async () => {
    const { t, ids } = ctx
    await expect(asUser(t, ids.dev).mutation(api.agents.configure, { workspaceId: ids.ws, enabled: true, mode: "suggest", channelId: null })).rejects.toThrow(/owner and admins/)
    await expect(asUser(t, ids.outsider).mutation(api.agents.configure, { workspaceId: ids.ws, enabled: true, mode: "suggest", channelId: null })).rejects.toThrow()
    await expect(asUser(t, ids.owner).mutation(api.agents.configure, { workspaceId: ids.ws, enabled: true, mode: "suggest", channelId: ids.locked })).rejects.toThrow(/public channel/)
    await turnOn("suggest")
    const o = await asUser(t, ids.owner).query(api.agents.overview, { workspaceId: ids.ws })
    expect(o?.agents.meetingFollowUp).toMatchObject({ enabled: true, mode: "suggest", channelId: ids.general, channelIds: [] })
    expect(o?.agents.triage).toBeNull()
  })

  it("tries itself on a sample meeting: admins only, switches on in suggest mode, never counts as a meeting", async () => {
    const { t, ids } = ctx
    await expect(asUser(t, ids.dev).mutation(api.agents.trySample, { workspaceId: ids.ws })).rejects.toThrow(/owner and admins/)
    const { seen } = fakeModel(...standardReplies())
    const before = await asUser(t, ids.owner).query(api.usage.get, { workspaceId: ids.ws })
    const meetingId = await asUser(t, ids.owner).mutation(api.agents.trySample, { workspaceId: ids.ws })
    await t.finishAllScheduledFunctions(vi.runAllTimers)

    const meeting = await t.run((c) => c.db.get(meetingId))
    expect(meeting).toMatchObject({ sample: true, title: "Sample: Weekly product sync" })
    // the made-up action items name real people in the workspace
    expect(meeting?.summary).toMatch(/Dev|Ava/)
    expect(JSON.stringify(seen[0])).toContain("checkout bug")
    const o = await asUser(t, ids.owner).query(api.agents.overview, { workspaceId: ids.ws })
    expect(o?.agents.meetingFollowUp).toMatchObject({ enabled: true, mode: "suggest" })
    const view = await asUser(t, ids.owner).query(api.agents.forMeeting, { meetingId })
    expect(view?.run?.status).toBe("review")
    const after = await asUser(t, ids.owner).query(api.usage.get, { workspaceId: ids.ws })
    expect(after?.usage.meetings.current).toBe(before?.usage.meetings.current)
    // the sample is free: it doesn't use up the plan's agent runs either
    expect(after?.usage.agentRuns.current).toBe(before?.usage.agentRuns.current)
    expect((await asUser(t, ids.owner).query(api.agents.overview, { workspaceId: ids.ws }))?.usage.used).toBe(0)
  })

  it("does nothing after a summary when the workspace hasn't switched it on", async () => {
    const { fetchMock } = fakeModel(...standardReplies())
    await saveSummary()
    expect(fetchMock).not.toHaveBeenCalled()
    const runs = await ctx.t.run((c) => c.db.query("agentRuns").collect())
    expect(runs).toHaveLength(0)
  })

  it("in suggest mode proposes tasks and a recap, and changes nothing until someone approves", async () => {
    const { t, ids } = ctx
    await turnOn("suggest")
    const { seen } = fakeModel(...standardReplies())
    await saveSummary()

    const view = await asUser(t, ids.dev).query(api.agents.forMeeting, { meetingId: ids.meeting })
    expect(view?.run?.status).toBe("review")
    expect(view?.run?.actions.map((a) => a.type)).toEqual(["task", "task", "recap"])
    expect(view?.run?.actions[0]).toMatchObject({ title: "Send the launch email", assigneeName: "Dev Patel", priority: "high" })
    expect(await t.run((c) => c.db.query("tasks").collect())).toHaveLength(0)
    // the model was told who is in the workspace, by member id
    expect(JSON.stringify(seen[0])).toContain(String(ids.devM))

    // a plain member can't approve (it assigns work to other people)
    await expect(asUser(t, ids.dev).mutation(api.agents.decide, { runId: view!.run!._id, approve: true })).rejects.toThrow(/manage/)
    // the owner keeps the first task and the recap
    const keep = [view!.run!.actions[0].id, view!.run!.actions[2].id]
    await asUser(t, ids.owner).mutation(api.agents.decide, { runId: view!.run!._id, approve: true, actionIds: keep })

    const tasks = await t.run((c) => c.db.query("tasks").collect())
    expect(tasks.map((x) => [x.title, x.assigneeId, x.status, x.labels])).toEqual([["Send the launch email", ids.devM, "todo", ["agent"]]])
    expect(tasks[0].dueDate).toBe(parseDue(nextFriday()))
    // the task links back to the meeting, and the link only opens for people who can see it
    expect(tasks[0].sourceMeetingId).toBe(ids.meeting)
    expect(await asUser(t, ids.ava).query(api.tasks.sourceOf, { id: tasks[0]._id })).toMatchObject({ kind: "meeting", title: "Weekly launch sync" })
    expect(await asUser(t, ids.outsider).query(api.tasks.sourceOf, { id: tasks[0]._id })).toBeNull()
    const notes = await t.run((c) => c.db.query("notifications").collect())
    expect(notes.map((n) => [n.type, n.recipientId])).toEqual([["task_assigned", ids.devM]])
    const msgs = await t.run((c) => c.db.query("messages").collect())
    expect(msgs).toHaveLength(1)
    expect(msgs[0]).toMatchObject({ channelId: ids.general, integrationName: "Follow-up agent", agent: true })
    expect(msgs[0].body).toContain("Launch is Friday.")
    const after = await asUser(t, ids.owner).query(api.agents.forMeeting, { meetingId: ids.meeting })
    expect(after?.run?.status).toBe("done")
    await expect(asUser(t, ids.owner).mutation(api.agents.decide, { runId: view!.run!._id, approve: true })).rejects.toThrow(/already/)
  })

  it("in act mode carries the work out straight away", async () => {
    await turnOn("act")
    fakeModel(...standardReplies())
    await saveSummary()
    const tasks = await ctx.t.run((c) => c.db.query("tasks").collect())
    expect(tasks.map((x) => x.title).sort()).toEqual(["Publish the pricing page", "Send the launch email"])
    expect(await ctx.t.run((c) => c.db.query("messages").collect())).toHaveLength(1)
    const run = (await ctx.t.run((c) => c.db.query("agentRuns").collect()))[0]
    expect(run.status).toBe("done")
    expect(run.note).toBe("Added 2 tasks and a recap.")
    expect(run.actions.every((a) => (a.type === "task" ? !!a.taskId : a.type === "recap" ? !!a.messageId : !!a.applied))).toBe(true)
    // 3 model calls at 1,000 tokens in and 100 out each, priced as gpt-oss-120b
    expect(run).toMatchObject({ model: "openai/gpt-oss-120b", tokensIn: 3_000, tokensOut: 300 })
    expect(run.costUsd).toBeCloseTo((3_000 * 0.15 + 300 * 0.6) / 1e6, 8)
    const o = await asUser(ctx.t, ctx.ids.owner).query(api.agents.overview, { workspaceId: ctx.ids.ws })
    expect(o?.usage.tokens).toBe(3_300)
    // the cost meter is for admins only
    const forMember = await asUser(ctx.t, ctx.ids.dev).query(api.agents.overview, { workspaceId: ctx.ids.ws })
    expect(forMember?.usage).not.toHaveProperty("costUsd")
  })

  it("throws away proposals it can't trust: other workspaces' people, duplicates, bad dates, a recap with no channel", async () => {
    const { ids } = ctx
    await turnOn("act", false)
    fakeModel(
      [call("propose_task", { title: "Send the launch email", assignee_member_id: ids.outsiderM, due_date: "2020-01-01", priority: "whenever" }),
       call("propose_task", { title: "  send the LAUNCH email ", assignee_member_id: ids.devM }, 1),
       call("propose_task", { title: "Fix the FAQ", assignee_member_id: "not-an-id", due_date: "2026-02-31" }, 2),
       call("post_recap", { text: "recap" })],
      [call("finish", { note: "done" })],
    )
    await saveSummary()
    const tasks = await ctx.t.run((c) => c.db.query("tasks").collect())
    expect(tasks.map((x) => [x.title, x.assigneeId ?? null, x.dueDate ?? null, x.priority])).toEqual([
      ["Send the launch email", null, null, "medium"],
      ["Fix the FAQ", null, null, "medium"],
    ])
    expect(await ctx.t.run((c) => c.db.query("messages").collect())).toHaveLength(0)
  })

  it("runs once per meeting, and only for a real AI summary", async () => {
    const { t, ids } = ctx
    await turnOn("suggest")
    const { fetchMock } = fakeModel(...standardReplies())
    await saveSummary()
    const calls = fetchMock.mock.calls.length
    await saveSummary() // editing the summary later doesn't start it again
    expect(fetchMock.mock.calls.length).toBe(calls)
    expect(await t.run((c) => c.db.query("agentRuns").collect())).toHaveLength(1)

    // a meeting whose summary is just the "no transcript" note (no AI credit used) is left alone
    const plain = await t.run((c) => c.db.insert("meetings", { workspaceId: ids.ws, roomName: "r2", title: "Quick chat", createdBy: ids.ownerM, startedAt: Date.now() }))
    await asUser(t, ids.owner).mutation(api.meetings.saveSummary, { id: plain, summary: "No transcript was captured for this meeting." })
    await t.finishAllScheduledFunctions(vi.runAllTimers)
    expect(await t.run((c) => c.db.query("agentRuns").collect())).toHaveLength(1)
  })

  it("can be run by hand from a meeting, but not twice at once and not past the monthly allowance", async () => {
    const { t, ids } = ctx
    await expect(asUser(t, ids.dev).mutation(api.agents.runForMeeting, { meetingId: ids.meeting })).rejects.toThrow(/no summary/)
    await t.run((c) => c.db.patch(ids.meeting, { summary: SUMMARY }))
    await expect(asUser(t, ids.dev).mutation(api.agents.runForMeeting, { meetingId: ids.meeting })).rejects.toThrow(/switched off/)
    await turnOn("suggest")
    fakeModel(...standardReplies())
    await asUser(t, ids.dev).mutation(api.agents.runForMeeting, { meetingId: ids.meeting })
    await expect(asUser(t, ids.dev).mutation(api.agents.runForMeeting, { meetingId: ids.meeting })).rejects.toThrow(/already working/)
    await t.finishAllScheduledFunctions(vi.runAllTimers)
    // someone from another workspace can't run it
    await expect(asUser(t, ids.outsider).mutation(api.agents.runForMeeting, { meetingId: ids.meeting })).rejects.toThrow()

    // use up a Free workspace's runs
    const free = await setup("free")
    await asUser(free.t, free.ids.owner).mutation(api.agents.configure, { workspaceId: free.ids.ws, enabled: true, mode: "suggest", channelId: null })
    await free.t.run(async (c) => {
      const agent = (await c.db.query("agents").collect())[0]
      for (let i = 0; i < 5; i++) await c.db.insert("agentRuns", { workspaceId: free.ids.ws, agentId: agent._id, startedBy: free.ids.ownerM, status: "done", actions: [] })
      await c.db.patch(free.ids.meeting, { summary: SUMMARY })
    })
    await expect(asUser(free.t, free.ids.owner).mutation(api.agents.runForMeeting, { meetingId: free.ids.meeting })).rejects.toThrow(/LIMIT_REACHED:agentRuns:5:free/)
  })

  it("records a clear failure when the AI key is missing or the AI service errors", async () => {
    const { t } = ctx
    await turnOn("suggest")
    vi.stubEnv("GROQ_API_KEY", "")
    await saveSummary()
    let run = (await t.run((c) => c.db.query("agentRuns").collect()))[0]
    expect(run.status).toBe("failed")
    expect(run.error).toMatch(/GROQ_API_KEY/)

    vi.stubEnv("GROQ_API_KEY", "test-key")
    vi.stubGlobal("fetch", vi.fn(async () => new Response("slow down", { status: 429 })))
    await t.run((c) => c.db.delete(run._id))
    await saveSummary()
    run = (await t.run((c) => c.db.query("agentRuns").collect()))[0]
    expect(run.status).toBe("failed")
    expect(run.error).toMatch(/busy/)
  })

  it("stops after a fixed number of steps even if the model never calls finish", async () => {
    await turnOn("suggest")
    const { fetchMock } = fakeModel([call("find_member", { name: "dev" })])
    await saveSummary()
    expect(fetchMock.mock.calls.length).toBe(8)
    const run = (await ctx.t.run((c) => c.db.query("agentRuns").collect()))[0]
    expect(run.status).toBe("done")
    expect(run.note).toBe("Nothing to follow up on.")
  })
})

const delta = (text: string) => JSON.stringify({ ops: [{ insert: text + "\n" }] })

describe("chat triage agent", () => {
  let ctx: Awaited<ReturnType<typeof setup>>
  beforeEach(async () => {
    vi.useFakeTimers()
    vi.stubEnv("GROQ_API_KEY", "test-key")
    ctx = await setup()
  })
  afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); vi.unstubAllEnvs() })

  const watchGeneral = (mode: "suggest" | "act") =>
    asUser(ctx.t, ctx.ids.owner).mutation(api.agents.configure, { workspaceId: ctx.ids.ws, kind: "triage", enabled: true, mode, channelIds: [ctx.ids.general] })
  const post = (user: Id<"users">, text: string, channelId = ctx.ids.general) =>
    asUser(ctx.t, user).mutation(api.messages.create, { workspaceId: ctx.ids.ws, channelId, body: delta(text) })
  const runs = () => ctx.t.run((c) => c.db.query("agentRuns").collect())

  it("needs channels to watch, public ones only, and only admins can set it", async () => {
    const { t, ids } = ctx
    await expect(asUser(t, ids.owner).mutation(api.agents.configure, { workspaceId: ids.ws, kind: "triage", enabled: true, mode: "suggest", channelIds: [] })).rejects.toThrow(/at least one channel/)
    await expect(asUser(t, ids.owner).mutation(api.agents.configure, { workspaceId: ids.ws, kind: "triage", enabled: true, mode: "suggest", channelIds: [ids.locked] })).rejects.toThrow(/public channels/)
    await expect(asUser(t, ids.dev).mutation(api.agents.configure, { workspaceId: ids.ws, kind: "triage", enabled: true, mode: "suggest", channelIds: [ids.general] })).rejects.toThrow(/owner and admins/)
    await watchGeneral("suggest")
    const o = await asUser(t, ids.owner).query(api.agents.overview, { workspaceId: ids.ws })
    expect(o?.agents.triage).toMatchObject({ enabled: true, channelIds: [ids.general] })
  })

  it("only wakes up for requests in watched channels, and reads a burst of them as one run", async () => {
    const { ids } = ctx
    await watchGeneral("suggest")
    const other = await ctx.t.run((c) => c.db.insert("channels", { name: "random", workspaceId: ids.ws }))
    await post(ids.ava, "good morning everyone!")
    await post(ids.ava, "Can someone fix the checkout button on mobile?", other)
    expect(await runs()).toHaveLength(0)

    await post(ids.ava, "Can someone fix the checkout button on mobile? It's broken for customers")
    await post(ids.owner, "Dev, please update the pricing page by Friday")
    await post(ids.dev, "thanks!")
    const queued = await runs()
    expect(queued).toHaveLength(1)
    expect(queued[0].messageIds).toHaveLength(2)
    expect(queued[0].status).toBe("queued")
  })

  it("proposes one task per request, linked to its message, and replies in the thread once approved", async () => {
    const { t, ids } = ctx
    await watchGeneral("suggest")
    const m1 = await post(ids.ava, "Can someone fix the checkout button on mobile? It's broken for customers")
    const m2 = await post(ids.owner, "Dev, please update the pricing page by Friday")
    const { seen } = fakeModel(
      [call("propose_task", { title: "Fix the checkout button on mobile", source_message_id: m1, priority: "urgent" }),
       call("propose_task", { title: "Update the pricing page", source_message_id: m2, assignee_member_id: ids.devM, due_date: nextFriday() }, 1),
       // a second task from the same message, and one from a message it was never shown: both dropped
       call("propose_task", { title: "Also fix checkout on desktop", source_message_id: m1 }, 2),
       call("propose_task", { title: "Invented work", source_message_id: "not-a-message" }, 3)],
      [call("finish", { note: "2 requests turned into tasks." })],
    )
    await t.finishAllScheduledFunctions(vi.runAllTimers)
    // the model saw the messages with their ids
    expect(JSON.stringify(seen[0])).toContain(String(m1))

    const o = await asUser(t, ids.owner).query(api.agents.overview, { workspaceId: ids.ws })
    const run = o!.runs[0]
    expect(run.kind).toBe("triage")
    expect(run.channelName).toBe("general")
    expect(run.status).toBe("review")
    expect(run.actions.map((a) => a.type === "task" && a.title)).toEqual(["Fix the checkout button on mobile", "Update the pricing page"])
    const first = run.actions[0]
    expect(first.type === "task" && first.source?.author).toBe("Ava Chen")
    expect(await t.run((c) => c.db.query("tasks").collect())).toHaveLength(0)

    await asUser(t, ids.owner).mutation(api.agents.decide, { runId: run._id, approve: true })
    const tasks = await t.run((c) => c.db.query("tasks").collect())
    expect(tasks.map((x) => [x.title, x.priority, x.assigneeId ?? null])).toEqual([
      ["Fix the checkout button on mobile", "urgent", null],
      ["Update the pricing page", "medium", ids.devM],
    ])
    expect(tasks[0].description).toContain("#general")
    const replies = await t.run((c) => c.db.query("messages").withIndex("by_parent_message_id", (q) => q.eq("parentMessagesId", m2)).collect())
    expect(replies).toHaveLength(1)
    expect(replies[0]).toMatchObject({ integrationName: "Triage agent", agent: true, channelId: ids.general })
    expect(replies[0].body).toContain("Update the pricing page → Dev Patel")
    expect((await t.run((c) => c.db.get(m2)))?.threadCount).toBe(1)
  })

  it("in act mode adds the tasks straight away, and ignores its own replies", async () => {
    const { t, ids } = ctx
    await watchGeneral("act")
    const m1 = await post(ids.ava, "Could you send the invoice to Bright Cafe please?")
    fakeModel([call("propose_task", { title: "Send the invoice to Bright Cafe", source_message_id: m1 })], [call("finish", { note: "ok" })])
    await t.finishAllScheduledFunctions(vi.runAllTimers)
    expect(await t.run((c) => c.db.query("tasks").collect())).toHaveLength(1)
    // the agent's thread reply says "Added to the board…" but must not start another run
    expect(await runs()).toHaveLength(1)
  })

  it("stays quiet when the month's runs are used up", async () => {
    const free = await setup("free")
    await asUser(free.t, free.ids.owner).mutation(api.agents.configure, { workspaceId: free.ids.ws, kind: "triage", enabled: true, mode: "suggest", channelIds: [free.ids.general] })
    await free.t.run(async (c) => {
      const agent = (await c.db.query("agents").collect())[0]
      for (let i = 0; i < 5; i++) await c.db.insert("agentRuns", { workspaceId: free.ids.ws, agentId: agent._id, startedBy: free.ids.ownerM, status: "done", actions: [] })
    })
    await asUser(free.t, free.ids.ava).mutation(api.messages.create, { workspaceId: free.ids.ws, channelId: free.ids.general, body: delta("Can someone fix the login page please?") })
    expect(await free.t.run((c) => c.db.query("agentRuns").collect())).toHaveLength(5)
  })

  it("waits a minute before reading", () => {
    expect(TRIAGE_DELAY_MS).toBe(60_000)
  })
})

describe("daily standup agent", () => {
  let ctx: Awaited<ReturnType<typeof setup>>
  // Tuesday 3 Nov 2026, 09:01 in Karachi
  const TUE_9AM_PKT = new Date("2026-11-03T04:01:00Z")
  beforeEach(async () => {
    vi.useFakeTimers()
    vi.setSystemTime(TUE_9AM_PKT)
    vi.stubEnv("GROQ_API_KEY", "test-key")
    ctx = await setup()
  })
  afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); vi.unstubAllEnvs() })

  const turnOn = (extra: { postHour?: number; weekdaysOnly?: boolean } = {}) =>
    asUser(ctx.t, ctx.ids.owner).mutation(api.agents.configure, {
      workspaceId: ctx.ids.ws, kind: "standup", enabled: true, mode: "suggest", channelId: ctx.ids.general, postHour: 9, postTz: "Asia/Karachi", ...extra,
    })
  const seedWork = () => ctx.t.run(async (c) => {
    const { ws, ownerM, devM, avaM, general } = ctx.ids
    const noon = (d: string) => Date.parse(`${d}T12:00:00Z`)
    await c.db.insert("tasks", { title: "Ship the onboarding emails", status: "done", priority: "medium", workspaceId: ws, createdBy: ownerM, assigneeId: avaM, updatedAt: Date.now() - 3_600_000 })
    await c.db.insert("tasks", { title: "Send the launch email", status: "todo", priority: "high", workspaceId: ws, createdBy: ownerM, assigneeId: devM, dueDate: noon("2026-11-03") })
    await c.db.insert("tasks", { title: "Fix the invoice export", status: "in_progress", priority: "medium", workspaceId: ws, createdBy: ownerM, dueDate: noon("2026-10-30") })
    await c.db.insert("tasks", { title: "Old finished thing", status: "done", priority: "low", workspaceId: ws, createdBy: ownerM, updatedAt: Date.now() - 5 * 86_400_000 })
    await c.db.insert("messages", { body: JSON.stringify({ ops: [{ insert: "Blocked on the Stripe keys, waiting for the LLC papers\n" }] }), memberId: devM, workspaceId: ws, channelId: general })
  })
  const runs = () => ctx.t.run((c) => c.db.query("agentRuns").collect())
  const posts = () => ctx.t.run((c) => c.db.query("messages").collect()).then((m) => m.filter((x) => x.agent))

  it("works out the local day and hour", () => {
    expect(localNow(TUE_9AM_PKT.getTime(), "Asia/Karachi")).toEqual({ day: "2026-11-03", hour: 9, weekday: 2 })
    expect(localNow(TUE_9AM_PKT.getTime(), "America/New_York")).toEqual({ day: "2026-11-02", hour: 23, weekday: 1 })
  })

  it("needs a channel, a real time zone and a sane hour, and never waits for approval", async () => {
    const { t, ids } = ctx
    const base = { workspaceId: ids.ws, kind: "standup" as const, enabled: true, mode: "suggest" as const }
    await expect(asUser(t, ids.owner).mutation(api.agents.configure, { ...base, channelId: null })).rejects.toThrow(/channel/)
    await expect(asUser(t, ids.owner).mutation(api.agents.configure, { ...base, channelId: ids.general, postTz: "Mars/Olympus" })).rejects.toThrow(/time zone/)
    await expect(asUser(t, ids.owner).mutation(api.agents.configure, { ...base, channelId: ids.general, postHour: 25 })).rejects.toThrow(/hour/)
    await expect(asUser(t, ids.dev).mutation(api.agents.configure, { ...base, channelId: ids.general })).rejects.toThrow(/owner and admins/)
    await turnOn()
    const o = await asUser(t, ids.owner).query(api.agents.overview, { workspaceId: ids.ws })
    expect(o?.agents.standup).toMatchObject({ enabled: true, mode: "act", postHour: 9, postTz: "Asia/Karachi", weekdaysOnly: true })
  })

  it("posts once at its local hour with what got done, what's due and what's overdue", async () => {
    await turnOn()
    await seedWork()
    const { seen } = fakeModel([call("post_standup", { text: "Morning team ☀️\n• Done: onboarding emails (Ava)" })], [call("finish", { note: "Posted." })])
    expect(await ctx.t.mutation(internal.agents.standupTick, {})).toBe(1)
    await ctx.t.finishAllScheduledFunctions(vi.runAllTimers)
    const prompt = JSON.stringify(seen[0])
    expect(prompt).toContain("Ship the onboarding emails")
    expect(prompt).toMatch(/Due today:[^]*Send the launch email/)
    expect(prompt).toMatch(/Overdue:[^]*Fix the invoice export/)
    expect(prompt).toContain("Blocked on the Stripe keys")
    expect(prompt).not.toContain("Old finished thing")
    const p = await posts()
    expect(p).toHaveLength(1)
    expect(p[0]).toMatchObject({ channelId: ctx.ids.general, integrationName: "Standup agent" })
    expect(p[0].body).toContain("Morning team")
    // the next hourly check the same day does nothing
    expect(await ctx.t.mutation(internal.agents.standupTick, {})).toBe(0)
    expect(await runs()).toHaveLength(1)
  })

  it("waits for its hour, and skips weekends unless told not to", async () => {
    await turnOn({ postHour: 10 })
    expect(await ctx.t.mutation(internal.agents.standupTick, {})).toBe(0)
    vi.setSystemTime(new Date("2026-11-07T04:01:00Z")) // Saturday 09:01 in Karachi
    await turnOn()
    expect(await ctx.t.mutation(internal.agents.standupTick, {})).toBe(0)
    await turnOn({ weekdaysOnly: false })
    expect(await ctx.t.mutation(internal.agents.standupTick, {})).toBe(1)
  })

  it("stays quiet on a day when nothing happened, without calling the AI", async () => {
    await turnOn()
    const { fetchMock } = fakeModel([call("post_standup", { text: "hi" })])
    await ctx.t.mutation(internal.agents.standupTick, {})
    await ctx.t.finishAllScheduledFunctions(vi.runAllTimers)
    expect(fetchMock).not.toHaveBeenCalled()
    expect(await posts()).toHaveLength(0)
    expect((await runs())[0]).toMatchObject({ status: "done" })
  })

  it("still posts a plain standup when the AI can't be reached", async () => {
    await turnOn()
    await seedWork()
    vi.stubGlobal("fetch", vi.fn(async () => new Response("down", { status: 503 })))
    await ctx.t.mutation(internal.agents.standupTick, {})
    await ctx.t.finishAllScheduledFunctions(vi.runAllTimers)
    const p = await posts()
    expect(p).toHaveLength(1)
    expect(p[0].body).toContain("Send the launch email (Dev Patel)")
    expect(p[0].body).toContain("Overdue (1)")
    expect((await runs())[0].note).toMatch(/plain version/)
  })

  it("can be posted by hand by an admin to try it out", async () => {
    const { t, ids } = ctx
    await expect(asUser(t, ids.owner).mutation(api.agents.runStandupNow, { workspaceId: ids.ws })).rejects.toThrow(/Turn the standup agent on/)
    await turnOn()
    await expect(asUser(t, ids.dev).mutation(api.agents.runStandupNow, { workspaceId: ids.ws })).rejects.toThrow(/owner and admins/)
    await seedWork()
    fakeModel([call("post_standup", { text: "Morning!" })], [call("finish", { note: "ok" })])
    await asUser(t, ids.owner).mutation(api.agents.runStandupNow, { workspaceId: ids.ws })
    await t.finishAllScheduledFunctions(vi.runAllTimers)
    expect(await posts()).toHaveLength(1)
  })
})

describe("@agent in chat", () => {
  let ctx: Awaited<ReturnType<typeof setup>>
  beforeEach(async () => {
    vi.useFakeTimers()
    vi.stubEnv("GROQ_API_KEY", "test-key")
    ctx = await setup()
  })
  afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); vi.unstubAllEnvs() })

  const turnOn = () => asUser(ctx.t, ctx.ids.owner).mutation(api.agents.configure, { workspaceId: ctx.ids.ws, kind: "assistant", enabled: true, mode: "suggest" })
  const post = (user: Id<"users">, text: string, extra: { channelId?: Id<"channels">; parentMessageId?: Id<"messages"> } = {}) =>
    asUser(ctx.t, user).mutation(api.messages.create, { workspaceId: ctx.ids.ws, channelId: extra.channelId ?? ctx.ids.general, parentMessageId: extra.parentMessageId, body: delta(text) })
  const agentReplies = () => ctx.t.run((c) => c.db.query("messages").collect()).then((m) => m.filter((x) => x.agent))
  const settle = () => ctx.t.finishAllScheduledFunctions(vi.runAllTimers)

  it("changes existing tasks when asked, with the asker's permissions", async () => {
    const { t, ids } = ctx
    const [mine, avas] = await t.run(async (c) => [
      await c.db.insert("tasks", { title: "Send the launch email", status: "todo", priority: "medium", workspaceId: ids.ws, assigneeId: ids.devM, createdBy: ids.ownerM }),
      await c.db.insert("tasks", { title: "Publish the pricing page", status: "todo", priority: "medium", workspaceId: ids.ws, assigneeId: ids.avaM, createdBy: ids.ownerM }),
    ])
    // Dev (a member) marks his own task done and tries to change Ava's
    fakeModel(
      [call("list_my_tasks", {})],
      [call("update_task", { task_id: mine, status: "done" }), call("update_task", { task_id: avas, status: "done", due_date: nextFriday() }, 1)],
      [call("answer", { text: "Marked it done." })],
      [call("finish", { note: "ok" })],
    )
    await post(ids.dev, "@agent mark my launch email task done, and Ava's pricing page too")
    await settle()
    const after = await t.run(async (c) => [await c.db.get(mine), await c.db.get(avas)])
    expect(after[0]?.status).toBe("done")
    // not his task and he isn't an admin: left alone
    expect(after[1]?.status).toBe("todo")
    expect(after[1]?.dueDate).toBeUndefined()
    const run = (await t.run((c) => c.db.query("agentRuns").collect())).at(-1)!
    expect(run.actions.filter((a) => a.type === "update").map((a) => a.type === "update" && a.applied)).toEqual([true, false])
    expect(await agentReplies()).toHaveLength(1)
  })

  it("Catch me up gathers only what the reader can see, and counts one run", async () => {
    const { t, ids } = ctx
    await post(ids.ava, "We decided to ship on Friday")
    await post(ids.owner, "Dev, can you check the invoices?")
    const got = await t.mutation(internal.agents.startCatchUp, { channelId: ids.general, userId: ids.dev })
    expect(got.lines.map((l) => l.text)).toEqual(["We decided to ship on Friday", "Dev, can you check the invoices?"])
    expect(got.me).toBe("Dev Patel")
    // a locked channel he isn't in
    await expect(t.mutation(internal.agents.startCatchUp, { channelId: ids.locked, userId: ids.dev })).rejects.toThrow(/not found/)
    const runs = await t.run((c) => c.db.query("agentRuns").collect())
    expect(runs.filter((r) => r.status === "running")).toHaveLength(1)
  })

  it("spots @agent but not email addresses or other words", () => {
    expect(mentionsAgent("@agent what did we decide?")).toBe(true)
    expect(mentionsAgent("hey (@Agent) can you help")).toBe(true)
    expect(mentionsAgent("mail travel@agentur.de")).toBe(false)
    expect(mentionsAgent("our @agents page")).toBe(false)
  })

  it("is on by default and stops when an admin switches it off", async () => {
    const { t, ids } = ctx
    expect(await asUser(t, ids.dev).query(api.agents.chatAgentOn, { workspaceId: ids.ws })).toBe(true)
    await asUser(t, ids.owner).mutation(api.agents.configure, { workspaceId: ids.ws, kind: "assistant", enabled: false, mode: "act" })
    expect(await asUser(t, ids.dev).query(api.agents.chatAgentOn, { workspaceId: ids.ws })).toBe(false)
    const { fetchMock } = fakeModel([call("answer", { text: "hi" })])
    await post(ctx.ids.dev, "@agent hello?")
    await settle()
    expect(fetchMock).not.toHaveBeenCalled()
    expect(await agentReplies()).toHaveLength(0)
  })

  it("answers out of the box, before anyone has opened the agent settings", async () => {
    fakeModel([call("answer", { text: "Hello from the agent" })])
    await post(ctx.ids.dev, "@agent hello?")
    await settle()
    expect(await agentReplies()).toHaveLength(1)
  })

  it("answers in the thread under the question, using what it found", async () => {
    const { t, ids } = ctx
    await turnOn()
    await t.run((c) => c.db.insert("meetings", { workspaceId: ids.ws, roomName: "p", title: "Pricing review", createdBy: ids.ownerM, startedAt: Date.now() - 86_400_000, summary: "Decided: Startup plan stays at $29, Growth goes to $79." }))
    const { seen } = fakeModel(
      [call("search_meetings", { query: "pricing" })],
      [call("answer", { text: "We decided Startup stays at $29 and Growth goes to $79 (Pricing review meeting)." })],
      [call("finish", { note: "answered" })],
    )
    const q = await post(ids.dev, "@agent what did we decide about pricing?")
    await settle()
    // the second call to the model carried the search result
    expect(JSON.stringify(seen[1])).toContain("Growth goes to $79")
    const replies = await agentReplies()
    expect(replies).toHaveLength(1)
    expect(replies[0]).toMatchObject({ parentMessagesId: q, channelId: ids.general, integrationName: "WebflowX Agent" })
    expect(replies[0].body).toContain("Startup stays at $29")
    expect((await t.run((c) => c.db.get(q)))?.threadCount).toBe(1)
  })

  it("asked inside a thread, it reads the thread and answers there", async () => {
    const { ids } = ctx
    await turnOn()
    const root = await post(ids.ava, "Checkout is broken on Safari")
    await post(ids.owner, "Looks like the new payment script", { parentMessageId: root })
    const { seen } = fakeModel([call("answer", { text: "Summary: Safari checkout broke after the new payment script." })])
    await post(ids.dev, "@agent summarise this thread", { parentMessageId: root })
    await settle()
    expect(JSON.stringify(seen[0])).toContain("Looks like the new payment script")
    const replies = await agentReplies()
    expect(replies[0].parentMessagesId).toBe(root)
  })

  it("never shows the asker anything from channels they can't open", async () => {
    const { t, ids } = ctx
    await turnOn()
    await t.run((c) => c.db.insert("messages", { body: delta("secret salary plan for the team"), memberId: ids.ownerM, workspaceId: ids.ws, channelId: ids.locked }))
    await t.run((c) => c.db.insert("messages", { body: delta("public salary bands are on the wiki"), memberId: ids.ownerM, workspaceId: ids.ws, channelId: ids.general }))
    const { seen } = fakeModel([call("search_messages", { query: "salary" })], [call("answer", { text: "ok" })])
    await post(ids.dev, "@agent what do we know about salary?")
    await settle()
    const toolResult = JSON.stringify(seen[1])
    expect(toolResult).toContain("public salary bands")
    expect(toolResult).not.toContain("secret salary plan")
  })

  it("makes tasks as the person asking, with their permissions", async () => {
    const { t, ids } = ctx
    await turnOn()
    fakeModel([call("create_task", { title: "Send the invoice", assignee_member_id: ids.avaM }), call("answer", { text: "Added it." }, 1)])
    await post(ids.dev, "@agent add a task for Ava to send the invoice")
    await settle()
    let tasks = await t.run((c) => c.db.query("tasks").collect())
    // a plain member can't assign work to someone else, so it's left unassigned, and it's theirs
    expect(tasks.map((x) => [x.title, x.assigneeId ?? null, x.createdBy])).toEqual([["Send the invoice", null, ids.devM]])

    fakeModel([call("create_task", { title: "Review the FAQ", assignee_member_id: ids.avaM }), call("answer", { text: "Added it." }, 1)])
    await post(ids.owner, "@agent add a task for Ava to review the FAQ")
    await settle()
    tasks = await t.run((c) => c.db.query("tasks").collect())
    expect(tasks.find((x) => x.title === "Review the FAQ")?.assigneeId).toBe(ids.avaM)
  })

  it("always replies, even when the AI is down or forgets to answer", async () => {
    await turnOn()
    vi.stubGlobal("fetch", vi.fn(async () => new Response("down", { status: 503 })))
    await post(ctx.ids.dev, "@agent are you there?")
    await settle()
    let replies = await agentReplies()
    expect(replies[0].body).toContain("Try again in a minute")

    fakeModel([call("finish", { note: "done" })])
    await post(ctx.ids.dev, "@agent what's the wifi password?")
    await settle()
    replies = await agentReplies()
    expect(replies[1].body).toContain("couldn't find an answer")
  })

  it("doesn't answer its own replies, and slows down heavy use", async () => {
    const { t, ids } = ctx
    await turnOn()
    fakeModel([call("answer", { text: "Hi! @agent here." })])
    await post(ids.dev, "@agent hi")
    await settle()
    expect(await agentReplies()).toHaveLength(1)
    expect(await t.run((c) => c.db.query("agentRuns").collect())).toHaveLength(1)
    await t.run((c) => c.db.insert("rateLimits", { key: `agent-ask:${ids.ava}`, windowStart: Date.now(), count: 20 }))
    await post(ids.ava, "@agent hi again")
    const last = (await agentReplies()).pop()!
    expect(last.body).toContain("a lot this hour")
  })
})

describe("looksLikeRequest", () => {
  it("picks out asks, commitments and broken things, and skips chit-chat", () => {
    for (const s of ["Can someone fix the checkout button?", "Dev, please update the pricing page", "I'll send the deck by Friday", "The login page is down", "Need someone to call the client back"]) {
      expect(looksLikeRequest(s), s).toBe(true)
    }
    for (const s of ["good morning!", "thanks team", "lol", "Great work on the launch everyone"]) {
      expect(looksLikeRequest(s), s).toBe(false)
    }
  })
})

describe("parseDue", () => {
  it("accepts real dates in the next year only", () => {
    const soon = new Date(Date.now() + 3 * 86_400_000).toISOString().slice(0, 10)
    expect(parseDue(soon)).toBe(Date.UTC(+soon.slice(0, 4), +soon.slice(5, 7) - 1, +soon.slice(8, 10), 12))
    expect(parseDue("2026-02-31")).toBeUndefined()
    expect(parseDue("2001-01-01")).toBeUndefined()
    expect(parseDue("next friday")).toBeUndefined()
    expect(parseDue(undefined)).toBeUndefined()
  })
})
