// @vitest-environment edge-runtime
/// <reference types="vite/client" />
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { convexTest } from "convex-test"
import schema from "../convex/schema"
import { api } from "../convex/_generated/api"
import type { Id } from "../convex/_generated/dataModel"
import { parseDue } from "../convex/agents"

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
    return new Response(JSON.stringify({ choices: [{ message: { role: "assistant", content: null, tool_calls } }] }), { status: 200 })
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
    expect(o?.agent).toEqual({ enabled: true, mode: "suggest", channelId: ids.general })
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
    expect(run.actions.every((a) => (a.type === "task" ? !!a.taskId : !!a.messageId))).toBe(true)
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
