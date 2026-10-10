// @vitest-environment edge-runtime
/// <reference types="vite/client" />
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { convexTest } from "convex-test"
import schema from "../convex/schema"
import type { Id } from "../convex/_generated/dataModel"

const modules = import.meta.glob("../convex/**/*.ts")
const SECRET = "whsec_test"
const PRICES = { STRIPE_PRICE_STARTUP_MONTH: "price_s_m", STRIPE_PRICE_GROWTH_MONTH: "price_g_m", STRIPE_PRICE_GROWTH_YEAR: "price_g_y", STRIPE_PRICE_ENTERPRISE_MONTH: "price_e_m" }

const hex = (buf: ArrayBuffer) => [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("")
const sign = async (body: string, t = Math.floor(Date.now() / 1000)) => {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(SECRET), { name: "HMAC", hash: "SHA-256" }, false, ["sign"])
  return `t=${t},v1=${hex(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(`${t}.${body}`)))}`
}

type SubState = { id: string; customer: string; status: string; price: string; cancel?: boolean; periodEnd?: number; trialEnd?: number; ws?: string }
let stripeState: Record<string, SubState> = {}

const setup = async () => {
  const t = convexTest(schema, modules)
  const ws = await t.run(async (ctx) => {
    const owner = await ctx.db.insert("users", { name: "Owner" })
    return ctx.db.insert("workspaces", { name: "Acme", userId: owner, joinCode: "ABC123", plan: "free", stripeCustomerId: "cus_1" })
  })
  return { t, ws }
}

const post = async (t: ReturnType<typeof convexTest>, type: string, subId: string, id = `evt_${Math.random()}`, extra: Record<string, unknown> = {}) => {
  const body = JSON.stringify({ id, type, data: { object: { id: subId, ...extra } } })
  const res = await t.fetch("/stripe/webhook", { method: "POST", headers: { "stripe-signature": await sign(body) }, body })
  return { status: res.status, id }
}
const workspace = (t: ReturnType<typeof convexTest>, ws: Id<"workspaces">) => t.run((ctx) => ctx.db.get(ws))

describe("stripe webhook", () => {
  beforeEach(() => {
    stripeState = {}
    process.env.STRIPE_SECRET_KEY = "sk_test"
    process.env.STRIPE_WEBHOOK_SECRET = SECRET
    Object.assign(process.env, PRICES)
    vi.stubGlobal("fetch", vi.fn(async (url: string) => {
      const id = String(url).split("/v1/subscriptions/")[1]
      const s = stripeState[id]
      if (!s) return new Response(JSON.stringify({ error: { message: "missing" } }), { status: 404 })
      return new Response(JSON.stringify({
        id: s.id, customer: s.customer, status: s.status, cancel_at_period_end: !!s.cancel, trial_end: s.trialEnd ?? null,
        metadata: s.ws ? { workspaceId: s.ws } : {},
        items: { data: [{ current_period_end: s.periodEnd ?? 1_900_000_000, price: { id: s.price } }] },
      }), { status: 200 })
    }))
  })
  afterEach(() => { vi.unstubAllGlobals() })

  it("rejects a bad signature, a stale timestamp and a missing secret", async () => {
    const { t } = await setup()
    const body = JSON.stringify({ id: "evt_x", type: "customer.subscription.created", data: { object: { id: "sub_1" } } })
    expect((await t.fetch("/stripe/webhook", { method: "POST", headers: { "stripe-signature": "t=1,v1=abc" }, body })).status).toBe(400)
    const old = Math.floor(Date.now() / 1000) - 3600
    expect((await t.fetch("/stripe/webhook", { method: "POST", headers: { "stripe-signature": await sign(body, old) }, body })).status).toBe(400)
    delete process.env.STRIPE_WEBHOOK_SECRET
    expect((await t.fetch("/stripe/webhook", { method: "POST", headers: { "stripe-signature": await sign(body) }, body })).status).toBe(400)
  })

  it("subscription created: moves the workspace onto the paid plan", async () => {
    const { t, ws } = await setup()
    stripeState.sub_1 = { id: "sub_1", customer: "cus_1", status: "active", price: "price_g_y", ws }
    expect((await post(t, "customer.subscription.created", "sub_1")).status).toBe(200)
    const w = await workspace(t, ws)
    expect(w).toMatchObject({ plan: "growth", billingInterval: "year", billingStatus: "active", stripeSubscriptionId: "sub_1", cancelAtPeriodEnd: false })
    expect(w?.billingPeriodEnd).toBe(1_900_000_000 * 1000)
  })

  it("checkout completed: reads the subscription it points to, and records a trial end", async () => {
    const { t, ws } = await setup()
    stripeState.sub_t = { id: "sub_t", customer: "cus_1", status: "trialing", price: "price_s_m", trialEnd: 1_800_000_000, ws }
    await post(t, "checkout.session.completed", "cs_1", "evt_cs", { subscription: "sub_t" })
    expect(await workspace(t, ws)).toMatchObject({ plan: "startup", billingStatus: "trialing", billingTrialEnd: 1_800_000_000 * 1000 })
  })

  it("subscription updated: a plan change and a scheduled cancellation both land", async () => {
    const { t, ws } = await setup()
    stripeState.sub_1 = { id: "sub_1", customer: "cus_1", status: "active", price: "price_s_m", ws }
    await post(t, "customer.subscription.created", "sub_1")
    stripeState.sub_1 = { ...stripeState.sub_1, price: "price_e_m", cancel: true }
    await post(t, "customer.subscription.updated", "sub_1")
    expect(await workspace(t, ws)).toMatchObject({ plan: "enterprise", billingInterval: "month", cancelAtPeriodEnd: true, billingStatus: "active" })
  })

  it("payment failed: past_due keeps the plan, and the invoice event alone changes nothing", async () => {
    const { t, ws } = await setup()
    stripeState.sub_1 = { id: "sub_1", customer: "cus_1", status: "active", price: "price_g_m", ws }
    await post(t, "customer.subscription.created", "sub_1")
    expect((await post(t, "invoice.payment_failed", "in_1")).status).toBe(200)
    expect(await workspace(t, ws)).toMatchObject({ plan: "growth", billingStatus: "active" })
    stripeState.sub_1 = { ...stripeState.sub_1, status: "past_due" }
    await post(t, "customer.subscription.updated", "sub_1")
    expect(await workspace(t, ws)).toMatchObject({ plan: "growth", billingStatus: "past_due", stripeSubscriptionId: "sub_1" })
  })

  it("subscription canceled: back to Free, subscription cleared", async () => {
    const { t, ws } = await setup()
    stripeState.sub_1 = { id: "sub_1", customer: "cus_1", status: "active", price: "price_g_m", ws }
    await post(t, "customer.subscription.created", "sub_1")
    stripeState.sub_1 = { ...stripeState.sub_1, status: "canceled" }
    await post(t, "customer.subscription.deleted", "sub_1")
    const w = await workspace(t, ws)
    expect(w).toMatchObject({ plan: "free", billingStatus: "canceled", cancelAtPeriodEnd: false })
    expect(w?.stripeSubscriptionId).toBeUndefined()
  })

  it("ignores a repeated event id and an older subscription ending after an upgrade", async () => {
    const { t, ws } = await setup()
    stripeState.sub_new = { id: "sub_new", customer: "cus_1", status: "active", price: "price_g_m", ws }
    const first = await post(t, "customer.subscription.created", "sub_new", "evt_same")
    stripeState.sub_new = { ...stripeState.sub_new, price: "price_e_m" }
    await post(t, "customer.subscription.updated", "sub_new", first.id)
    expect((await workspace(t, ws))?.plan).toBe("growth")

    stripeState.sub_old = { id: "sub_old", customer: "cus_1", status: "canceled", price: "price_s_m", ws }
    await post(t, "customer.subscription.deleted", "sub_old")
    expect(await workspace(t, ws)).toMatchObject({ plan: "growth", stripeSubscriptionId: "sub_new" })
  })

  it("finds the workspace by Stripe customer when the subscription carries no workspace id", async () => {
    const { t, ws } = await setup()
    stripeState.sub_1 = { id: "sub_1", customer: "cus_1", status: "active", price: "price_s_m" }
    await post(t, "customer.subscription.created", "sub_1")
    expect((await workspace(t, ws))?.plan).toBe("startup")
  })
})
