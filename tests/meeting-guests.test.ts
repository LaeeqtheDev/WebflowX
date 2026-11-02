// @vitest-environment edge-runtime
/// <reference types="vite/client" />
import { describe, expect, it } from "vitest"
import { convexTest } from "convex-test"
import schema from "../convex/schema"
import { api } from "../convex/_generated/api"
import type { Id } from "../convex/_generated/dataModel"

const modules = import.meta.glob("../convex/**/*.ts")
const asUser = (t: ReturnType<typeof convexTest>, id: Id<"users">) => t.withIdentity({ subject: `${id}|session` })

async function setup() {
  const t = convexTest(schema, modules)
  const ids = await t.run(async (ctx) => {
    const owner = await ctx.db.insert("users", { name: "Olivia Owner" })
    const dev = await ctx.db.insert("users", { name: "Dev Patel" })
    const client = await ctx.db.insert("users", { name: "Cara Client" })
    const ws = await ctx.db.insert("workspaces", { name: "Bright", userId: owner, joinCode: "ABC123", plan: "growth" })
    const ownerM = await ctx.db.insert("members", { userId: owner, workspaceId: ws, role: "admin" })
    const devM = await ctx.db.insert("members", { userId: dev, workspaceId: ws, role: "member" })
    const clientM = await ctx.db.insert("members", { userId: client, workspaceId: ws, role: "guest" })
    const meeting = await ctx.db.insert("meetings", { workspaceId: ws, roomName: "room-a", title: "Client review", createdBy: ownerM, startedAt: Date.now(), activeMembers: [] })
    const other = await ctx.db.insert("meetings", { workspaceId: ws, roomName: "room-b", title: "Internal planning", createdBy: ownerM, startedAt: Date.now(), activeMembers: [] })
    return { owner, dev, client, ws, ownerM, devM, clientM, meeting, other }
  })
  return { t, ids }
}

describe("guests in meetings", () => {
  it("a guest sees and joins only the meetings they were invited to", async () => {
    const { t, ids } = await setup()
    const guest = asUser(t, ids.client)
    expect(await guest.query(api.meetings.get, { workspaceId: ids.ws })).toEqual([])
    expect(await guest.query(api.meetings.authorizeRoom, { roomName: "room-a" })).toBeNull()
    await expect(guest.mutation(api.meetings.join, { id: ids.meeting })).rejects.toThrow()

    await asUser(t, ids.owner).mutation(api.meetings.setGuests, { id: ids.meeting, guestIds: [ids.clientM] })
    const list = await guest.query(api.meetings.get, { workspaceId: ids.ws })
    expect(list.map((m) => m.title)).toEqual(["Client review"])
    expect(await guest.query(api.meetings.authorizeRoom, { roomName: "room-a" })).toMatchObject({ host: false })
    expect(await guest.query(api.meetings.authorizeRoom, { roomName: "room-b" })).toBeNull()
    await guest.mutation(api.meetings.join, { id: ids.meeting })
    // guests can't run the meeting
    await expect(guest.mutation(api.meetings.saveSummary, { id: ids.meeting, summary: "x" })).rejects.toThrow()
    await expect(guest.mutation(api.meetings.setGuests, { id: ids.meeting, guestIds: [] })).rejects.toThrow()
  })

  it("only the host or a moderator invites, and only workspace guests can be invited", async () => {
    const { t, ids } = await setup()
    await expect(asUser(t, ids.dev).mutation(api.meetings.setGuests, { id: ids.meeting, guestIds: [ids.clientM] })).rejects.toThrow(/host/)
    await expect(asUser(t, ids.owner).mutation(api.meetings.setGuests, { id: ids.meeting, guestIds: [ids.devM] })).rejects.toThrow(/guests/)
    await asUser(t, ids.owner).mutation(api.meetings.setGuests, { id: ids.meeting, guestIds: [ids.clientM] })
    const notes = await t.run((c) => c.db.query("notifications").collect())
    expect(notes.some((n) => n.recipientId === ids.clientM && n.type === "meeting_invite")).toBe(true)
  })

  it("a join link works for anyone until the host turns it off or the meeting ends", async () => {
    const { t, ids } = await setup()
    await expect(asUser(t, ids.dev).mutation(api.meetings.setPublicLink, { id: ids.meeting, enabled: true })).rejects.toThrow(/host/)
    const token = await asUser(t, ids.owner).mutation(api.meetings.setPublicLink, { id: ids.meeting, enabled: true })
    expect(token).toMatch(/^[A-Za-z0-9]{18}$/)
    // no sign-in needed to read it
    expect(await t.query(api.meetings.publicInfo, { token: token! })).toMatchObject({ title: "Client review", status: "open", roomName: "room-a" })
    expect(await t.query(api.meetings.publicInfo, { token: "x".repeat(18) })).toBeNull()
    // the same link stays the same when switched on again
    expect(await asUser(t, ids.owner).mutation(api.meetings.setPublicLink, { id: ids.meeting, enabled: true })).toBe(token)
    // a workspace guest never sees the link
    await asUser(t, ids.owner).mutation(api.meetings.setGuests, { id: ids.meeting, guestIds: [ids.clientM] })
    const [seen] = await asUser(t, ids.client).query(api.meetings.get, { workspaceId: ids.ws })
    expect(seen.publicToken).toBeUndefined()
    await asUser(t, ids.owner).mutation(api.meetings.setPublicLink, { id: ids.meeting, enabled: false })
    expect(await t.query(api.meetings.publicInfo, { token: token! })).toBeNull()
    const again = await asUser(t, ids.owner).mutation(api.meetings.setPublicLink, { id: ids.meeting, enabled: true })
    await t.run((c) => c.db.patch(ids.meeting, { endedAt: Date.now() }))
    expect(await t.query(api.meetings.publicInfo, { token: again! })).toMatchObject({ status: "ended", roomName: null })
  })
})
