// @vitest-environment edge-runtime
/// <reference types="vite/client" />
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { convexTest } from "convex-test"
import schema from "../convex/schema"
import { api, internal } from "../convex/_generated/api"
import type { Id } from "../convex/_generated/dataModel"

const modules = import.meta.glob("../convex/**/*.ts")
const SECRET = "whsec_test"

const hex = (buf: ArrayBuffer) => [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("")
const sign = async (body: string) => {
  const t = Math.floor(Date.now() / 1000)
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(SECRET), { name: "HMAC", hash: "SHA-256" }, false, ["sign"])
  return `t=${t},v1=${hex(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(`${t}.${body}`)))}`
}

// A small stand-in for Stripe: it holds charges, refunds, disputes and subscriptions and answers the calls the code makes.
type Charge = { id: string; customer: string | null; amount: number; amount_refunded: number; currency: string; paid: boolean; status: string }
type Refund = { id: string; charge: string | null; payment_intent?: string; amount: number; currency: string; status: string; reason: string | null; created: number; metadata?: Record<string, string> }
type Dispute = { id: string; charge: string; amount: number; currency: string; status: string; reason: string; created: number }
type Sub = { id: string; customer: string; status: string; price: string }
type Call = { method: string; path: string; params: Record<string, string>; key: string | null }

let charges: Charge[] = []
let refunds: Refund[] = []
let disputes: Dispute[] = []
let subs: Record<string, Sub> = {}
let intents: Record<string, string> = {}
let calls: Call[] = []
let byKey: Record<string, Refund> = {}
let failCancel = 0

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status })
const missing = () => json({ error: { message: "No such object" } }, 404)

const fakeStripe = async (input: string | URL, init?: RequestInit) => {
  const url = new URL(String(input))
  const method = init?.method ?? "GET"
  const params = Object.fromEntries(method === "POST" ? new URLSearchParams(String(init?.body ?? "")) : url.searchParams)
  const key = (init?.headers as Record<string, string> | undefined)?.["Idempotency-Key"] ?? null
  const path = url.pathname
  calls.push({ method, path, params, key })
  const id = path.split("/")[3]

  if (path === "/v1/charges") return json({ data: charges.filter((c) => c.customer === params.customer) })
  if (path.startsWith("/v1/charges/")) return charges.find((c) => c.id === id) ? json(charges.find((c) => c.id === id)) : missing()
  if (path.startsWith("/v1/payment_intents/")) return intents[id] ? json({ latest_charge: intents[id] }) : missing()
  if (path.startsWith("/v1/disputes/")) return disputes.find((d) => d.id === id) ? json(disputes.find((d) => d.id === id)) : missing()
  if (path === "/v1/refunds" && method === "GET") return json({ data: refunds.filter((r) => r.charge === params.charge) })
  if (path === "/v1/refunds" && method === "POST") {
    if (key && byKey[key]) return json(byKey[key])
    const charge = charges.find((c) => c.id === params.charge)
    if (!charge) return missing()
    const made: Refund = {
      id: `re_${refunds.length + 1}`, charge: charge.id, amount: Number(params.amount), currency: charge.currency, status: "succeeded",
      reason: params.reason ?? null, created: 1_800_000_000 + refunds.length, metadata: { workspaceId: params["metadata[workspaceId]"], source: params["metadata[source]"] },
    }
    charge.amount_refunded += made.amount
    refunds.push(made)
    if (key) byKey[key] = made
    return json(made)
  }
  if (path.startsWith("/v1/subscriptions/")) {
    const s = subs[id]
    if (method === "DELETE") {
      if (failCancel > 0) { failCancel--; return json({ error: { message: "Stripe is having a moment" } }, 500) }
      if (!s || s.status === "canceled") return missing()
      s.status = "canceled"
      return json(s)
    }
    if (!s) return missing()
    return json({ id: s.id, customer: s.customer, status: s.status, cancel_at_period_end: false, trial_end: null, metadata: {}, items: { data: [{ current_period_end: 1_900_000_000, price: { id: s.price } }] } })
  }
  return missing()
}

type T = ReturnType<typeof convexTest>
const setup = async () => {
  const t = convexTest(schema, modules)
  const made = await t.run(async (ctx) => {
    const owner = await ctx.db.insert("users", { name: "Owner" })
    const teammate = await ctx.db.insert("users", { name: "Teammate" })
    const ws = await ctx.db.insert("workspaces", { name: "Acme", userId: owner, joinCode: "ABC123", plan: "free", stripeCustomerId: "cus_1" })
    await ctx.db.insert("members", { userId: owner, workspaceId: ws, role: "admin" })
    await ctx.db.insert("members", { userId: teammate, workspaceId: ws, role: "admin" })
    return { ws, owner, teammate }
  })
  return { t, ...made }
}

let n = 0
const post = async (t: T, type: string, object: Record<string, unknown>, id = `evt_${++n}`) => {
  const body = JSON.stringify({ id, type, data: { object } })
  const res = await t.fetch("/stripe/webhook", { method: "POST", headers: { "stripe-signature": await sign(body) }, body })
  return { status: res.status, id }
}
const rows = (t: T) => t.run((ctx) => ctx.db.query("billingAdjustments").collect())
const workspace = (t: T, ws: Id<"workspaces">) => t.run((ctx) => ctx.db.get(ws))
const cancels = () => calls.filter((c) => c.method === "DELETE")
const charge = (over: Partial<Charge> = {}): Charge => ({ id: "ch_1", customer: "cus_1", amount: 2900, amount_refunded: 0, currency: "usd", paid: true, status: "succeeded", ...over })
const refundOf = (over: Partial<Refund> = {}): Refund => ({ id: "re_x", charge: "ch_1", amount: 2900, currency: "usd", status: "succeeded", reason: "requested_by_customer", created: 1_800_000_000, ...over })

// puts the workspace on the Growth plan with a live subscription, the way the subscription webhook would
const subscribe = async (t: T) => {
  subs.sub_1 = { id: "sub_1", customer: "cus_1", status: "active", price: "price_g_m" }
  await post(t, "customer.subscription.created", { id: "sub_1" })
}

beforeEach(() => {
  charges = []; refunds = []; disputes = []; subs = {}; intents = {}; calls = []; byKey = {}; failCancel = 0
  process.env.STRIPE_SECRET_KEY = "sk_test"
  process.env.STRIPE_WEBHOOK_SECRET = SECRET
  Object.assign(process.env, { STRIPE_PRICE_STARTUP_MONTH: "price_s_m", STRIPE_PRICE_GROWTH_MONTH: "price_g_m", STRIPE_PRICE_ENTERPRISE_MONTH: "price_e_m" })
  vi.stubGlobal("fetch", vi.fn(fakeStripe))
})
afterEach(() => { vi.unstubAllGlobals() })

describe("refund events", () => {
  it("records a refund made outside the app, and a repeated or second event does not add it twice", async () => {
    const { t, ws } = await setup()
    charges = [charge({ amount_refunded: 2900 })]
    refunds = [refundOf({ id: "re_dash" })]
    const first = await post(t, "charge.refunded", { id: "ch_1" })
    expect(first.status).toBe(200)
    await post(t, "charge.refunded", { id: "ch_1" }, first.id)
    await post(t, "refund.updated", { id: "re_dash", charge: "ch_1" })
    expect(await rows(t)).toMatchObject([{ workspaceId: ws, kind: "refund", stripeId: "re_dash", chargeId: "ch_1", amount: 2900, currency: "usd", status: "succeeded", createdAt: 1_800_000_000_000 }])
    expect(await rows(t)).toHaveLength(1)
  })

  it("keeps each partial refund on a payment, and marks one as failed when Stripe says it failed", async () => {
    const { t } = await setup()
    charges = [charge({ amount_refunded: 1000 })]
    refunds = [refundOf({ id: "re_a", amount: 1000 })]
    await post(t, "charge.refunded", { id: "ch_1" })
    refunds.push(refundOf({ id: "re_b", amount: 500, status: "pending" }))
    await post(t, "charge.refunded", { id: "ch_1" })
    expect((await rows(t)).map((r) => [r.stripeId, r.amount, r.status])).toEqual([["re_a", 1000, "succeeded"], ["re_b", 500, "pending"]])

    refunds[1].status = "failed"
    await post(t, "refund.failed", { id: "re_b", charge: "ch_1" })
    expect((await rows(t)).map((r) => [r.stripeId, r.status])).toEqual([["re_a", "succeeded"], ["re_b", "failed"]])
  })

  it("finds the payment through its payment intent when the refund event carries no charge", async () => {
    const { t } = await setup()
    charges = [charge({ amount_refunded: 2900 })]
    refunds = [refundOf({ id: "re_pi" })]
    intents = { pi_1: "ch_1" }
    await post(t, "refund.created", { id: "re_pi", charge: null, payment_intent: "pi_1" })
    expect(await rows(t)).toMatchObject([{ stripeId: "re_pi" }])
  })

  it("does not change the plan: a refund on its own leaves the subscription running", async () => {
    const { t, ws } = await setup()
    await subscribe(t)
    charges = [charge({ amount_refunded: 2900 })]
    refunds = [refundOf()]
    await post(t, "charge.refunded", { id: "ch_1" })
    expect(await workspace(t, ws)).toMatchObject({ plan: "growth", billingStatus: "active", stripeSubscriptionId: "sub_1" })
    expect(cancels()).toHaveLength(0)
  })

  it("ignores a refund for a customer that has no workspace here", async () => {
    const { t } = await setup()
    charges = [charge({ customer: "cus_other", amount_refunded: 2900 })]
    refunds = [refundOf()]
    expect((await post(t, "charge.refunded", { id: "ch_1" })).status).toBe(200)
    expect(await rows(t)).toHaveLength(0)
  })

  it("still checks the signature", async () => {
    const { t } = await setup()
    charges = [charge({ amount_refunded: 2900 })]
    refunds = [refundOf()]
    const body = JSON.stringify({ id: "evt_forged", type: "charge.refunded", data: { object: { id: "ch_1" } } })
    expect((await t.fetch("/stripe/webhook", { method: "POST", headers: { "stripe-signature": "t=1,v1=abc" }, body })).status).toBe(400)
    expect(await rows(t)).toHaveLength(0)
  })
})

describe("dispute events", () => {
  const dispute = (over: Partial<Dispute> = {}): Dispute => ({ id: "dp_1", charge: "ch_1", amount: 2900, currency: "usd", status: "needs_response", reason: "fraudulent", created: 1_800_000_500, ...over })

  it("records an open dispute and keeps the plan while it is being decided", async () => {
    const { t, ws } = await setup()
    await subscribe(t)
    charges = [charge()]
    disputes = [dispute()]
    await post(t, "charge.dispute.created", { id: "dp_1" })
    expect(await rows(t)).toMatchObject([{ workspaceId: ws, kind: "dispute", stripeId: "dp_1", chargeId: "ch_1", amount: 2900, status: "needs_response", reason: "fraudulent" }])
    expect((await workspace(t, ws))?.plan).toBe("growth")
    expect(cancels()).toHaveLength(0)
  })

  it("a lost dispute ends the subscription once, and the workspace then moves to Free", async () => {
    const { t, ws } = await setup()
    await subscribe(t)
    charges = [charge()]
    disputes = [dispute()]
    await post(t, "charge.dispute.created", { id: "dp_1" })

    disputes[0].status = "lost"
    await post(t, "charge.dispute.closed", { id: "dp_1" })
    await post(t, "charge.dispute.funds_withdrawn", { id: "dp_1" })
    expect(cancels().map((c) => c.path)).toEqual(["/v1/subscriptions/sub_1"])
    expect(await rows(t)).toMatchObject([{ stripeId: "dp_1", status: "lost" }])

    // Stripe follows the cancellation with customer.subscription.deleted
    await post(t, "customer.subscription.deleted", { id: "sub_1" })
    const w = await workspace(t, ws)
    expect(w).toMatchObject({ plan: "free", billingStatus: "canceled" })
    expect(w?.stripeSubscriptionId).toBeUndefined()
  })

  it("a dispute decided for us changes nothing", async () => {
    const { t, ws } = await setup()
    await subscribe(t)
    charges = [charge()]
    disputes = [dispute({ status: "won" })]
    await post(t, "charge.dispute.closed", { id: "dp_1" })
    expect(cancels()).toHaveLength(0)
    expect(await workspace(t, ws)).toMatchObject({ plan: "growth", stripeSubscriptionId: "sub_1" })
    expect(await rows(t)).toMatchObject([{ status: "won" }])
  })

  it("if ending the subscription fails, the event stays unhandled and Stripe's retry finishes the job", async () => {
    const { t } = await setup()
    await subscribe(t)
    charges = [charge()]
    disputes = [dispute({ status: "lost" })]
    failCancel = 1
    const first = await post(t, "charge.dispute.closed", { id: "dp_1" }, "evt_lost").catch(() => ({ status: 500, id: "evt_lost" }))
    expect(first.status).toBeGreaterThanOrEqual(500)
    expect(await rows(t)).toHaveLength(0)
    expect(subs.sub_1.status).toBe("active")

    expect((await post(t, "charge.dispute.closed", { id: "dp_1" }, "evt_lost")).status).toBe(200)
    expect(subs.sub_1.status).toBe("canceled")
    expect(await rows(t)).toMatchObject([{ stripeId: "dp_1", status: "lost" }])
  })

  it("a lost dispute on a workspace with no live subscription is recorded without calling Stripe to cancel", async () => {
    const { t } = await setup()
    charges = [charge()]
    disputes = [dispute({ status: "lost" })]
    expect((await post(t, "charge.dispute.closed", { id: "dp_1" })).status).toBe(200)
    expect(cancels()).toHaveLength(0)
    expect(await rows(t)).toMatchObject([{ status: "lost" }])
  })
})

describe("refund action", () => {
  it("refunds the latest payment in full, shows it at once and leaves the subscription alone", async () => {
    const { t, ws } = await setup()
    await subscribe(t)
    charges = [charge({ id: "ch_new" }), charge({ id: "ch_old" })]
    const out = await t.action(internal.stripe.refund, { workspaceId: ws })
    expect(out).toEqual({ refundId: "re_1", chargeId: "ch_new", amount: 2900, currency: "usd", status: "succeeded", subscriptionCancelled: false })

    const sent = calls.find((c) => c.method === "POST" && c.path === "/v1/refunds")
    expect(sent?.params).toMatchObject({ charge: "ch_new", amount: "2900", reason: "requested_by_customer", "metadata[workspaceId]": ws, "metadata[source]": "webflowx" })
    expect(sent?.key).toBe("wfx-refund-ch_new-2900-1")
    expect(await rows(t)).toMatchObject([{ workspaceId: ws, kind: "refund", stripeId: "re_1", chargeId: "ch_new", amount: 2900, status: "succeeded" }])
    expect(cancels()).toHaveLength(0)

    // the webhook that follows brings the same row up to date instead of adding a second one
    await post(t, "charge.refunded", { id: "ch_new" })
    expect(await rows(t)).toHaveLength(1)
  })

  it("skips payments that are already refunded or never succeeded", async () => {
    const { t, ws } = await setup()
    charges = [charge({ id: "ch_failed", paid: false, status: "failed" }), charge({ id: "ch_done", amount_refunded: 2900 }), charge({ id: "ch_ok" })]
    expect((await t.action(internal.stripe.refund, { workspaceId: ws })).chargeId).toBe("ch_ok")
  })

  it("can refund part of a payment and end the subscription in the same step", async () => {
    const { t, ws } = await setup()
    await subscribe(t)
    charges = [charge()]
    const out = await t.action(internal.stripe.refund, { workspaceId: ws, amount: 1000, reason: "duplicate", cancelSubscription: true })
    expect(out).toMatchObject({ amount: 1000, subscriptionCancelled: true })
    expect(charges[0].amount_refunded).toBe(1000)
    expect(subs.sub_1.status).toBe("canceled")
  })

  it("running the same refund twice sends the money once", async () => {
    const { t, ws } = await setup()
    charges = [charge()]
    const a = await t.action(internal.stripe.refund, { workspaceId: ws, amount: 1000 })
    const b = await t.action(internal.stripe.refund, { workspaceId: ws, amount: 1000 })
    expect(b.refundId).toBe(a.refundId)
    expect(refunds).toHaveLength(1)
    expect(charges[0].amount_refunded).toBe(1000)
    expect(await rows(t)).toHaveLength(1)

    // a deliberate second refund of the same amount needs its own request id
    const c = await t.action(internal.stripe.refund, { workspaceId: ws, amount: 1000, requestId: "second" })
    expect(c.refundId).not.toBe(a.refundId)
    expect(charges[0].amount_refunded).toBe(2000)
  })

  it("refuses a refund that is too large, not a whole number, already complete or on someone else's payment", async () => {
    const { t, ws } = await setup()
    charges = [charge({ amount_refunded: 2000 }), charge({ id: "ch_done", amount_refunded: 2900 }), charge({ id: "ch_theirs", customer: "cus_other" })]
    await expect(t.action(internal.stripe.refund, { workspaceId: ws, amount: 901 })).rejects.toThrow(/Only 900 is left/)
    await expect(t.action(internal.stripe.refund, { workspaceId: ws, amount: 10.5 })).rejects.toThrow(/whole number/)
    await expect(t.action(internal.stripe.refund, { workspaceId: ws, amount: 0 })).rejects.toThrow(/whole number/)
    await expect(t.action(internal.stripe.refund, { workspaceId: ws, chargeId: "ch_done" })).rejects.toThrow(/already been refunded in full/)
    await expect(t.action(internal.stripe.refund, { workspaceId: ws, chargeId: "ch_theirs" })).rejects.toThrow(/different workspace/)
    expect(refunds).toHaveLength(0)
  })

  it("refuses when the workspace has never paid or has no successful payment", async () => {
    const { t, ws } = await setup()
    const fresh = await t.run(async (ctx) => {
      const u = await ctx.db.insert("users", { name: "New" })
      return ctx.db.insert("workspaces", { name: "Fresh", userId: u, joinCode: "ZZZ999", plan: "free" })
    })
    await expect(t.action(internal.stripe.refund, { workspaceId: fresh })).rejects.toThrow(/never paid/)
    charges = [charge({ paid: false, status: "failed" })]
    await expect(t.action(internal.stripe.refund, { workspaceId: ws })).rejects.toThrow(/No successful payment/)
    expect(calls.filter((c) => c.method === "POST")).toHaveLength(0)
  })
})

describe("billing screen data", () => {
  it("shows refunds and an open dispute to the owner only, newest first, without Stripe ids", async () => {
    const { t, ws, owner, teammate } = await setup()
    charges = [charge({ amount_refunded: 500 })]
    refunds = [refundOf({ id: "re_a", amount: 500 })]
    disputes = [{ id: "dp_1", charge: "ch_1", amount: 2900, currency: "usd", status: "under_review", reason: "general", created: 1_800_000_900 }]
    await post(t, "charge.refunded", { id: "ch_1" })
    await post(t, "charge.dispute.created", { id: "dp_1" })

    const mine = await t.withIdentity({ subject: `${owner}|session` }).query(api.billing.get, { workspaceId: ws })
    expect(mine?.disputeOpen).toBe(true)
    expect(mine?.adjustments.map((a) => [a.kind, a.amount, a.currency, a.status])).toEqual([["dispute", 2900, "usd", "under_review"], ["refund", 500, "usd", "succeeded"]])
    expect(JSON.stringify(mine)).not.toMatch(/re_a|dp_1|ch_1|cus_1/)

    const theirs = await t.withIdentity({ subject: `${teammate}|session` }).query(api.billing.get, { workspaceId: ws })
    expect(theirs).toMatchObject({ isOwner: false, adjustments: [], disputeOpen: false })

    disputes[0].status = "won"
    await post(t, "charge.dispute.closed", { id: "dp_1" })
    expect((await t.withIdentity({ subject: `${owner}|session` }).query(api.billing.get, { workspaceId: ws }))?.disputeOpen).toBe(false)
  })
})
