// @vitest-environment edge-runtime
/// <reference types="vite/client" />
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { convexTest } from "convex-test"
import schema from "../convex/schema"
import { api, internal } from "../convex/_generated/api"
import type { Id } from "../convex/_generated/dataModel"

const modules = import.meta.glob("../convex/**/*.ts")
const DAY = 24 * 60 * 60 * 1000

const delta = (text: string) => JSON.stringify({ ops: [{ insert: text + "\n" }] })
const asUser = (t: ReturnType<typeof convexTest>, id: Id<"users">) => t.withIdentity({ subject: `${id}|session` })

type Ids = {
  owner: Id<"users">; alice: Id<"users">; bob: Id<"users">; outsider: Id<"users">
  ws: Id<"workspaces">; ownerM: Id<"members">; aliceM: Id<"members">; bobM: Id<"members">
  general: Id<"channels">; locked: Id<"channels">
}

async function setup(plan: "free" | "growth" = "free") {
  const t = convexTest(schema, modules)
  const ids = await t.run(async (ctx) => {
    const owner = await ctx.db.insert("users", { name: "Olivia Owner" })
    const alice = await ctx.db.insert("users", { name: "Alice Member" })
    const bob = await ctx.db.insert("users", { name: "Bob Member" })
    const outsider = await ctx.db.insert("users", { name: "Eve Outsider" })
    const ws = await ctx.db.insert("workspaces", { name: "Test", userId: owner, joinCode: "ABC123", plan })
    const ownerM = await ctx.db.insert("members", { userId: owner, workspaceId: ws, role: "admin" })
    const aliceM = await ctx.db.insert("members", { userId: alice, workspaceId: ws, role: "member" })
    const bobM = await ctx.db.insert("members", { userId: bob, workspaceId: ws, role: "member" })
    const general = await ctx.db.insert("channels", { name: "general", workspaceId: ws })
    const locked = await ctx.db.insert("channels", { name: "leadership", workspaceId: ws, isPrivate: true, memberIds: [ownerM] })
    return { owner, alice, bob, outsider, ws, ownerM, aliceM, bobM, general, locked } as Ids
  })
  return { t, ids }
}

const list = (t: ReturnType<typeof convexTest>, user: Id<"users">, channelId: Id<"channels">) =>
  asUser(t, user).query(api.messages.get, { channelId, paginationOpts: { numItems: 50, cursor: null } })

describe("message flows", () => {
  let ctx: Awaited<ReturnType<typeof setup>>
  beforeEach(async () => { ctx = await setup() })

  it("lets a member post in a channel and everyone in it read it", async () => {
    const { t, ids } = ctx
    await asUser(t, ids.alice).mutation(api.messages.create, { workspaceId: ids.ws, channelId: ids.general, body: delta("Hello team") })
    const seen = await list(t, ids.bob, ids.general)
    expect(seen.page).toHaveLength(1)
    expect(seen.page[0].user.name).toBe("Alice Member")
  })

  it("rejects posting from someone who is not a member", async () => {
    const { t, ids } = ctx
    await expect(asUser(t, ids.outsider).mutation(api.messages.create, { workspaceId: ids.ws, channelId: ids.general, body: delta("hi") })).rejects.toThrow()
  })

  it("rejects signed-out access", async () => {
    const { t, ids } = ctx
    await expect(t.mutation(api.messages.create, { workspaceId: ids.ws, channelId: ids.general, body: delta("hi") })).rejects.toThrow()
  })

  it("keeps locked channels closed to members who were not added", async () => {
    const { t, ids } = ctx
    await expect(asUser(t, ids.alice).mutation(api.messages.create, { workspaceId: ids.ws, channelId: ids.locked, body: delta("sneaky") })).rejects.toThrow(/access/i)
    await asUser(t, ids.owner).mutation(api.messages.create, { workspaceId: ids.ws, channelId: ids.locked, body: delta("secret plan") })
    expect((await list(t, ids.alice, ids.locked)).page).toHaveLength(0)
    expect((await list(t, ids.owner, ids.locked)).page).toHaveLength(1)
  })

  it("rejects bodies that are not a Quill delta", async () => {
    const { t, ids } = ctx
    await expect(asUser(t, ids.alice).mutation(api.messages.create, { workspaceId: ids.ws, channelId: ids.general, body: "not json" })).rejects.toThrow()
  })

  it("only lets the author edit a message", async () => {
    const { t, ids } = ctx
    const id = await asUser(t, ids.alice).mutation(api.messages.create, { workspaceId: ids.ws, channelId: ids.general, body: delta("v1") })
    await expect(asUser(t, ids.bob).mutation(api.messages.update, { id, body: delta("hacked") })).rejects.toThrow()
    await asUser(t, ids.alice).mutation(api.messages.update, { id, body: delta("v2") })
    const row = await t.run((c) => c.db.get(id))
    expect(row?.body).toContain("v2")
  })

  it("lets a member delete their own message but not someone else's", async () => {
    const { t, ids } = ctx
    const id = await asUser(t, ids.alice).mutation(api.messages.create, { workspaceId: ids.ws, channelId: ids.general, body: delta("mine") })
    await expect(asUser(t, ids.bob).mutation(api.messages.remove, { id })).rejects.toThrow()
    await asUser(t, ids.alice).mutation(api.messages.remove, { id })
    expect(await t.run((c) => c.db.get(id))).toBeNull()
  })
})

describe("leaving a workspace", () => {
  // removing a member schedules a cleanup job; fake timers let the test run it
  beforeEach(() => { vi.useFakeTimers() })
  afterEach(() => { vi.useRealTimers() })

  it("keeps channel messages and reactions visible as a former member on the Free plan, with a 90 day deadline", async () => {
    const { t, ids } = await setup("free")
    const id = await asUser(t, ids.alice).mutation(api.messages.create, { workspaceId: ids.ws, channelId: ids.general, body: delta("before I go") })
    await t.run((c) => c.db.insert("reactions", { workspaceId: ids.ws, messageId: id, memberId: ids.aliceM, value: "+1" }))

    const before = Date.now()
    await asUser(t, ids.alice).mutation(api.members.remove, { id: ids.aliceM })
    await t.finishAllScheduledFunctions(vi.runAllTimers)

    const page = (await list(t, ids.bob, ids.general)).page
    expect(page).toHaveLength(1)
    expect(page[0].user.name).toBe("Alice Member (former member)")
    const row = await t.run((c) => c.db.get(id))
    expect(row?.retainUntil).toBeGreaterThanOrEqual(before + 90 * DAY - 1000)
    expect(row?.retainUntil).toBeLessThanOrEqual(Date.now() + 90 * DAY)
    const reactions = await t.run((c) => c.db.query("reactions").collect())
    expect(reactions).toHaveLength(1)
    expect(reactions[0].retainUntil).toBe(row?.retainUntil)
  })

  it("shows a former member by name in threads, saved, pinned and search", async () => {
    const { t, ids } = await setup("growth")
    const parent = await asUser(t, ids.alice).mutation(api.messages.create, { workspaceId: ids.ws, channelId: ids.general, body: delta("quarterly roadmap kickoff") })
    await asUser(t, ids.bob).mutation(api.messages.create, { workspaceId: ids.ws, channelId: ids.general, parentMessageId: parent, body: delta("sounds good") })
    const reply = await asUser(t, ids.alice).mutation(api.messages.create, { workspaceId: ids.ws, channelId: ids.general, parentMessageId: parent, body: delta("thanks") })
    await asUser(t, ids.bob).mutation(api.marks.toggleSave, { messageId: parent })
    await t.run((c) => c.db.insert("pins", { workspaceId: ids.ws, channelId: ids.general, messageId: parent, pinnedBy: ids.aliceM }))

    await asUser(t, ids.alice).mutation(api.members.remove, { id: ids.aliceM })
    await t.finishAllScheduledFunctions(vi.runAllTimers)

    const bob = asUser(t, ids.bob)
    const threads = await bob.query(api.threads.get, { workspaceId: ids.ws })
    const row = threads.participatedThreads[0]
    expect(row.author.user?.name).toBe("Alice Member (former member)")
    expect(row.lastReplyUser).toBe("Alice Member (former member)")
    expect(reply).toBeTruthy()

    const saved = await bob.query(api.marks.savedList, { workspaceId: ids.ws })
    expect(saved[0].authorName).toBe("Alice Member (former member)")

    const pins = await bob.query(api.marks.pinned, { channelId: ids.general })
    expect(pins[0].authorName).toBe("Alice Member (former member)")
    expect(pins[0].pinnedByName).toBe("Former member")

    const found = await bob.query(api.messages.search, { workspaceId: ids.ws, query: "roadmap" })
    expect(found[0].authorName).toBe("Alice Member (former member)")
  })

  it("keeps everything with no deadline on paid plans", async () => {
    const { t, ids } = await setup("growth")
    const id = await asUser(t, ids.alice).mutation(api.messages.create, { workspaceId: ids.ws, channelId: ids.general, body: delta("staying on record") })
    await t.run((c) => c.db.insert("reactions", { workspaceId: ids.ws, messageId: id, memberId: ids.aliceM, value: "+1" }))
    await asUser(t, ids.alice).mutation(api.members.remove, { id: ids.aliceM })
    await t.finishAllScheduledFunctions(vi.runAllTimers)
    const row = await t.run((c) => c.db.get(id))
    expect(row?.removedAuthor?.name).toBe("Alice Member")
    expect(row?.retainUntil).toBeUndefined()
    expect(await t.run((c) => c.db.query("reactions").collect())).toHaveLength(1)
    await t.mutation(internal.retention.purgeExpired, {})
    expect(await t.run((c) => c.db.get(id))).not.toBeNull()
  })

  it("erases kept content only after the deadline", async () => {
    const { t, ids } = await setup("free")
    const id = await asUser(t, ids.alice).mutation(api.messages.create, { workspaceId: ids.ws, channelId: ids.general, body: delta("short lived") })
    await t.run((c) => c.db.insert("reactions", { workspaceId: ids.ws, messageId: id, memberId: ids.aliceM, value: "+1" }))
    await asUser(t, ids.alice).mutation(api.members.remove, { id: ids.aliceM })
    await t.finishAllScheduledFunctions(vi.runAllTimers)

    await t.mutation(internal.retention.purgeExpired, {})
    expect(await t.run((c) => c.db.get(id))).not.toBeNull()

    await t.run(async (c) => {
      await c.db.patch(id, { retainUntil: Date.now() - 1000 })
      for (const r of await c.db.query("reactions").collect()) await c.db.patch(r._id, { retainUntil: Date.now() - 1000 })
    })
    await t.mutation(internal.retention.purgeExpired, {})
    expect(await t.run((c) => c.db.get(id))).toBeNull()
    expect(await t.run((c) => c.db.query("reactions").collect())).toHaveLength(0)
  })

  it("removes direct messages with the conversation", async () => {
    const { t, ids } = await setup("free")
    const conv = await t.run((c) => c.db.insert("conversations", { workspaceId: ids.ws, memberOneId: ids.aliceM, memberTwoId: ids.bobM }))
    const dm = await asUser(t, ids.alice).mutation(api.messages.create, { workspaceId: ids.ws, conversationId: conv, body: delta("private") })
    await asUser(t, ids.alice).mutation(api.members.remove, { id: ids.aliceM })
    await t.finishAllScheduledFunctions(vi.runAllTimers)
    expect(await t.run((c) => c.db.get(dm))).toBeNull()
  })

  it("does not let the owner leave, or a member remove an admin", async () => {
    const { t, ids } = await setup("free")
    await expect(asUser(t, ids.owner).mutation(api.members.remove, { id: ids.ownerM })).rejects.toThrow()
    await expect(asUser(t, ids.alice).mutation(api.members.remove, { id: ids.bobM })).rejects.toThrow()
  })
})

describe("plan limits", () => {
  it("blocks creating a sixth channel on the Free plan", async () => {
    const { t, ids } = await setup("free")
    // one channel exists already ("general") plus the locked one = 2; add up to the limit of 5
    for (const name of ["a", "b", "c"]) await asUser(t, ids.owner).mutation(api.channels.create, { workspaceId: ids.ws, name })
    await expect(asUser(t, ids.owner).mutation(api.channels.create, { workspaceId: ids.ws, name: "d" })).rejects.toThrow(/LIMIT_REACHED:channels:5:free/)
  })

  it("lets a Growth workspace create more channels than Free allows", async () => {
    const { t, ids } = await setup("growth")
    for (const name of ["a", "b", "c", "d"]) await asUser(t, ids.owner).mutation(api.channels.create, { workspaceId: ids.ws, name })
    expect(await t.run((c) => c.db.query("channels").collect())).toHaveLength(6)
  })
})
