// @vitest-environment edge-runtime
/// <reference types="vite/client" />
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
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
    const outsider = await ctx.db.insert("users", { name: "Eve Outsider" })
    const ws = await ctx.db.insert("workspaces", { name: "Bright", userId: owner, joinCode: "ABC123", plan: "growth" })
    const other = await ctx.db.insert("workspaces", { name: "Other", userId: outsider, joinCode: "XYZ789" })
    const ownerM = await ctx.db.insert("members", { userId: owner, workspaceId: ws, role: "admin" })
    const devM = await ctx.db.insert("members", { userId: dev, workspaceId: ws, role: "member" })
    const clientM = await ctx.db.insert("members", { userId: client, workspaceId: ws, role: "guest" })
    await ctx.db.insert("members", { userId: outsider, workspaceId: other, role: "admin" })
    const doc = await ctx.db.insert("docs", { title: "Launch plan", workspaceId: ws, createdBy: ownerM, type: "document", liveblocksRoomId: "room-1" })
    const general = await ctx.db.insert("channels", { name: "general", workspaceId: ws })
    return { owner, dev, client, outsider, ws, ownerM, devM, clientM, doc, general }
  })
  return { t, ids }
}

describe("doc comments", () => {
  it("comments, replies, notifies the page owner, resolves; guests and outsiders can't", async () => {
    const { t, ids } = await setup()
    const dev = asUser(t, ids.dev)
    const c = await dev.mutation(api.docExtras.addComment, { docId: ids.doc, body: "Is the date final?", quote: "Launch on the 18th" })
    await asUser(t, ids.owner).mutation(api.docExtras.addComment, { docId: ids.doc, body: "Yes", parentId: c })
    const rows = await dev.query(api.docExtras.comments, { docId: ids.doc })
    expect(rows.map((r) => [r.body, r.quote ?? null, r.author])).toEqual([["Is the date final?", "Launch on the 18th", "Dev Patel"], ["Yes", null, "Olivia Owner"]])
    const notes = await t.run((x) => x.db.query("notifications").collect())
    // the owner hears about the comment, Dev hears about the reply to his thread
    expect(notes.map((n) => [n.type, n.recipientId, n.docId])).toEqual([["doc_comment", ids.ownerM, ids.doc], ["doc_comment", ids.devM, ids.doc]])
    await dev.mutation(api.docExtras.resolveComment, { id: c, resolved: true })
    expect((await dev.query(api.docExtras.comments, { docId: ids.doc }))[0].resolved).toBe(true)
    // only the author or an admin deletes
    const mine = await asUser(t, ids.owner).mutation(api.docExtras.addComment, { docId: ids.doc, body: "Owner note" })
    await expect(dev.mutation(api.docExtras.deleteComment, { id: mine })).rejects.toThrow(/your own/)
    await asUser(t, ids.owner).mutation(api.docExtras.deleteComment, { id: c })
    expect((await dev.query(api.docExtras.comments, { docId: ids.doc })).map((r) => r.body)).toEqual(["Owner note"])
    await expect(asUser(t, ids.client).mutation(api.docExtras.addComment, { docId: ids.doc, body: "hi" })).rejects.toThrow()
    expect(await asUser(t, ids.outsider).query(api.docExtras.comments, { docId: ids.doc })).toEqual([])
  })
})

describe("doc versions", () => {
  beforeEach(() => { vi.useFakeTimers() })
  afterEach(() => { vi.useRealTimers() })

  it("saves on demand, skips unchanged or too-frequent automatic copies, and keeps the newest 50", async () => {
    const { t, ids } = await setup()
    const dev = asUser(t, ids.dev)
    expect(await dev.mutation(api.docExtras.saveVersion, { docId: ids.doc, html: "<p>one</p>" })).not.toBeNull()
    expect(await dev.mutation(api.docExtras.saveVersion, { docId: ids.doc, html: "<p>one</p>" })).toBeNull()
    expect(await dev.mutation(api.docExtras.saveVersion, { docId: ids.doc, html: "<p>two</p>", auto: true })).toBeNull()
    vi.advanceTimersByTime(11 * 60_000)
    const v2 = await dev.mutation(api.docExtras.saveVersion, { docId: ids.doc, html: "<p>two</p>", auto: true })
    expect(v2).not.toBeNull()
    const list = await dev.query(api.docExtras.versions, { docId: ids.doc })
    expect(list.map((v) => v.author)).toEqual(["Dev Patel", "Dev Patel"])
    expect((await dev.query(api.docExtras.version, { id: v2! }))?.html).toBe("<p>two</p>")
    expect(await asUser(t, ids.outsider).query(api.docExtras.version, { id: v2! })).toBeNull()
    for (let i = 0; i < 55; i++) await t.run((x) => x.db.insert("docVersions", { docId: ids.doc, workspaceId: ids.ws, memberId: ids.devM, title: "Launch plan", html: `<p>${i}</p>` }))
    vi.advanceTimersByTime(60 * 60_000)
    await asUser(t, ids.owner).mutation(api.docExtras.saveVersion, { docId: ids.doc, html: "<p>latest</p>" })
    expect(await t.run((x) => x.db.query("docVersions").collect())).toHaveLength(50)
  })
})

describe("doc mentions and channel read markers", () => {
  it("notifies a mentioned teammate, never a guest or someone outside", async () => {
    const { t, ids } = await setup()
    await asUser(t, ids.owner).mutation(api.docExtras.mention, { docId: ids.doc, memberId: ids.devM })
    await expect(asUser(t, ids.owner).mutation(api.docExtras.mention, { docId: ids.doc, memberId: ids.clientM })).rejects.toThrow()
    const notes = await t.run((x) => x.db.query("notifications").collect())
    expect(notes.map((n) => [n.type, n.recipientId])).toEqual([["doc_mention", ids.devM]])
  })

  it("remembers when someone last read a channel", async () => {
    const { t, ids } = await setup()
    const dev = asUser(t, ids.dev)
    expect(await dev.query(api.docExtras.lastRead, { channelId: ids.general })).toBeNull()
    await dev.mutation(api.docExtras.markRead, { channelId: ids.general })
    expect(typeof (await dev.query(api.docExtras.lastRead, { channelId: ids.general }))).toBe("number")
    expect(await asUser(t, ids.outsider).query(api.docExtras.lastRead, { channelId: ids.general })).toBeNull()
  })
})
