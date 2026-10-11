import { v, ConvexError } from "convex/values"
import { action, internalAction, type ActionCtx } from "./_generated/server"
import { internal } from "./_generated/api"
import { auth } from "./auth"
import { siteUrl } from "./emailLayout"
import { hmacHex } from "./integrations"
import { priceEnv } from "./billing"

// Talks to Stripe's REST API directly (form-encoded), so there is no SDK to keep in step with.
type Params = Record<string, string | number | boolean | undefined>
type Method = "GET" | "POST" | "DELETE"
type StripeError = { error?: { message?: string } }
const stripeFetch = async <T>(path: string, params?: Params, method: Method = "POST", idempotencyKey?: string) => {
    const key = process.env.STRIPE_SECRET_KEY
    if (!key) throw new ConvexError("Billing isn't set up yet. Please contact support@northfoundry.co")
    const body = new URLSearchParams()
    for (const [k, val] of Object.entries(params ?? {})) if (val !== undefined) body.set(k, String(val))
    const res = await fetch(`https://api.stripe.com${path}${method !== "POST" && body.size ? `?${body}` : ""}`, {
        method,
        headers: {
            Authorization: `Bearer ${key}`,
            ...(method === "POST" ? { "Content-Type": "application/x-www-form-urlencoded" } : {}),
            // Stripe replays the first answer for a repeated key, so a retried request can't act twice
            ...(idempotencyKey ? { "Idempotency-Key": idempotencyKey } : {}),
        },
        body: method === "POST" ? body : undefined,
    })
    return { ok: res.ok, status: res.status, json: (await res.json()) as T & StripeError }
}

const stripeCall = async <T>(path: string, params?: Params, method: Method = "POST", idempotencyKey?: string): Promise<T> => {
    const { ok, status, json } = await stripeFetch<T>(path, params, method, idempotencyKey)
    if (!ok) {
        console.error("Stripe error", path, status, json.error?.message)
        throw new ConvexError("Couldn't reach the payment provider. Please try again in a moment.")
    }
    return json
}

// Ends a subscription now. Stripe then sends customer.subscription.deleted and the webhook moves the workspace to
// Free. A subscription that is already gone (404) counts as done, so this is safe to repeat.
const cancelSubscription = async (subscriptionId: string) => {
    const { ok, status, json } = await stripeFetch(`/v1/subscriptions/${subscriptionId}`, undefined, "DELETE")
    if (!ok && status !== 404) {
        console.error("Stripe error", "cancel subscription", status, json.error?.message)
        throw new ConvexError("Couldn't reach the payment provider. Please try again in a moment.")
    }
}

const requireUser = async (ctx: Parameters<typeof auth.getUserId>[0]) => {
    const userId = await auth.getUserId(ctx)
    if (!userId) throw new ConvexError("Please sign in again")
    return userId
}

const back = (workspaceId: string, extra = "") => `${siteUrl()}/dashboard/workspace/${workspaceId}${extra}`

// Starts a Stripe Checkout for a plan and returns the page to send the owner to.
export const createCheckout = action({
    args: {
        workspaceId: v.id("workspaces"),
        plan: v.union(v.literal("startup"), v.literal("growth"), v.literal("enterprise")),
        interval: v.union(v.literal("month"), v.literal("year")),
    },
    handler: async (ctx, args): Promise<{ url: string }> => {
        const userId = await requireUser(ctx)
        const info = await ctx.runQuery(internal.billing.ownerContext, { workspaceId: args.workspaceId, userId })
        if (info.subscriptionId && ["active", "trialing", "past_due"].includes(info.status ?? "")) {
            throw new ConvexError("This workspace already has a subscription. Use Manage billing to change it.")
        }
        const price = priceEnv(args.plan, args.interval)
        if (!price) throw new ConvexError("Billing isn't set up yet. Please contact support@northfoundry.co")

        let customerId = info.customerId
        if (!customerId) {
            const c = await stripeCall<{ id: string }>("/v1/customers", {
                name: info.name,
                email: info.email ?? undefined,
                "metadata[workspaceId]": args.workspaceId,
            })
            customerId = c.id
            await ctx.runMutation(internal.billing.saveCustomer, { workspaceId: args.workspaceId, customerId })
        }

        const trialDays = Number(process.env.STRIPE_TRIAL_DAYS ?? 14) || 0
        const trial = !info.everSubscribed && trialDays > 0
        const session = await stripeCall<{ url: string }>("/v1/checkout/sessions", {
            mode: "subscription",
            customer: customerId,
            "line_items[0][price]": price,
            "line_items[0][quantity]": 1,
            client_reference_id: args.workspaceId,
            "metadata[workspaceId]": args.workspaceId,
            "subscription_data[metadata][workspaceId]": args.workspaceId,
            allow_promotion_codes: true,
            // Stripe Managed Payments (merchant of record: Stripe handles sales tax/VAT, fraud and disputes)
            ...(process.env.STRIPE_MANAGED_PAYMENTS === "true" ? { "managed_payments[enabled]": true } : {}),
            success_url: back(args.workspaceId, "?billing=success"),
            cancel_url: back(args.workspaceId, "?billing=cancelled"),
            ...(trial
                ? {
                    "subscription_data[trial_period_days]": trialDays,
                    payment_method_collection: "if_required",
                    "subscription_data[trial_settings][end_behavior][missing_payment_method]": "cancel",
                }
                : {}),
        })
        return { url: session.url }
    },
})

// The Stripe-hosted page where the owner updates the card, switches plan, downloads invoices or cancels.
export const createPortal = action({
    args: { workspaceId: v.id("workspaces") },
    handler: async (ctx, args): Promise<{ url: string }> => {
        const userId = await requireUser(ctx)
        const info = await ctx.runQuery(internal.billing.ownerContext, { workspaceId: args.workspaceId, userId })
        if (!info.customerId) throw new ConvexError("There is no billing account for this workspace yet")
        const s = await stripeCall<{ url: string }>("/v1/billing_portal/sessions", {
            customer: info.customerId,
            return_url: back(args.workspaceId),
        })
        return { url: s.url }
    },
})

// ---- webhook ----

type Sub = {
    id: string
    customer: string
    status: string
    cancel_at_period_end?: boolean
    cancel_at?: number | null
    trial_end?: number | null
    current_period_end?: number
    metadata?: { workspaceId?: string }
    items?: { data?: { current_period_end?: number; price?: { id?: string } }[] }
}

type StripeEvent = {
    id: string
    type: string
    data: { object: { id: string; subscription?: string | null; charge?: string | null; payment_intent?: string | null; metadata?: { workspaceId?: string } } }
}
type Charge = { id: string; customer: string | null; amount: number; amount_refunded: number; currency: string; paid: boolean; status: string }
type Refund = { id: string; charge: string | null; amount: number; currency: string; status: string | null; reason: string | null; created: number }
type Dispute = { id: string; charge: string; amount: number; currency: string; status: string; reason: string | null; created: number }

const refundRow = (r: Refund, chargeId: string) => ({
    kind: "refund" as const,
    stripeId: r.id,
    chargeId,
    amount: r.amount,
    currency: r.currency,
    status: r.status ?? "pending",
    reason: r.reason ?? undefined,
    createdAt: r.created * 1000,
})

const safeEqual = (a: string, b: string) => {
    if (a.length !== b.length) return false
    let d = 0
    for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i)
    return d === 0
}

const verify = async (body: string, header: string, secret: string) => {
    const parts = header.split(",").map((p) => p.split("=") as [string, string])
    const t = parts.find(([k]) => k === "t")?.[1]
    const sigs = parts.filter(([k]) => k === "v1").map(([, val]) => val)
    if (!t || sigs.length === 0) return false
    if (Math.abs(Date.now() / 1000 - Number(t)) > 300) return false
    const expected = await hmacHex(secret, `${t}.${body}`)
    return sigs.some((s) => safeEqual(s, expected))
}

export const handleWebhook = internalAction({
    args: { body: v.string(), signature: v.string() },
    handler: async (ctx, args): Promise<"ok" | "bad-signature"> => {
        const secret = process.env.STRIPE_WEBHOOK_SECRET
        if (!secret || !(await verify(args.body, args.signature, secret))) return "bad-signature"

        const event = JSON.parse(args.body) as StripeEvent
        const obj = event.data.object
        if (event.type === "charge.refunded" || event.type.startsWith("refund.")) return await syncRefunds(ctx, event)
        if (event.type.startsWith("charge.dispute.")) return await syncDispute(ctx, event)

        let subId: string | null = null
        if (event.type === "checkout.session.completed") subId = obj.subscription ?? null
        else if (event.type.startsWith("customer.subscription.")) subId = obj.id
        if (!subId) return "ok"

        // Always read the subscription's current state from Stripe instead of trusting the event's snapshot
        const sub = await stripeCall<Sub>(`/v1/subscriptions/${subId}`, undefined, "GET")
        const item = sub.items?.data?.[0]
        await ctx.runMutation(internal.billing.applySubscription, {
            eventId: event.id,
            workspaceId: sub.metadata?.workspaceId ?? obj.metadata?.workspaceId,
            customerId: sub.customer,
            subscriptionId: sub.id,
            status: sub.status,
            priceId: item?.price?.id,
            periodEnd: (sub.current_period_end ?? item?.current_period_end) ? (sub.current_period_end ?? item?.current_period_end)! * 1000 : undefined,
            trialEnd: sub.trial_end ? sub.trial_end * 1000 : undefined,
            cancelAtPeriodEnd: !!sub.cancel_at_period_end || !!sub.cancel_at,
        })
        return "ok"
    },
})

// ---- refunds and disputes ----

// A refund can start in three places: the refund action below, the Stripe Dashboard, or Stripe's own support desk
// (with Managed Payments, Stripe may refund a customer without asking). All three reach us as the same events, so
// this is the one place a refund is recorded: read every refund on the charge from Stripe and store its state.
const syncRefunds = async (ctx: ActionCtx, event: StripeEvent): Promise<"ok"> => {
    const obj = event.data.object
    let chargeId = event.type === "charge.refunded" ? obj.id : (obj.charge ?? null)
    if (!chargeId && obj.payment_intent) {
        chargeId = (await stripeCall<{ latest_charge: string | null }>(`/v1/payment_intents/${obj.payment_intent}`, undefined, "GET")).latest_charge
    }
    if (!chargeId) return "ok"

    const charge = await stripeCall<Charge>(`/v1/charges/${chargeId}`, undefined, "GET")
    if (!charge.customer) return "ok"
    const refunds = await stripeCall<{ data: Refund[] }>("/v1/refunds", { charge: chargeId, limit: 100 }, "GET")
    await ctx.runMutation(internal.billing.applyAdjustments, {
        eventId: event.id,
        customerId: charge.customer,
        items: refunds.data.map((r) => refundRow(r, charge.id)),
    })
    return "ok"
}

// A dispute (chargeback) is opened by the customer's bank. We keep its state for the owner to see, and when one is
// lost the money has gone back to the customer, so the subscription it paid for ends.
const syncDispute = async (ctx: ActionCtx, event: StripeEvent): Promise<"ok"> => {
    const dispute = await stripeCall<Dispute>(`/v1/disputes/${event.data.object.id}`, undefined, "GET")
    const charge = await stripeCall<Charge>(`/v1/charges/${dispute.charge}`, undefined, "GET")
    if (!charge.customer) return "ok"

    if (dispute.status === "lost") {
        // Cancel before recording. If the cancel fails, the event is not marked handled and Stripe sends it again.
        const known = await ctx.runQuery(internal.billing.disputeContext, { customerId: charge.customer, disputeId: dispute.id })
        if (known.status !== "lost" && known.subscriptionId) await cancelSubscription(known.subscriptionId)
    }
    await ctx.runMutation(internal.billing.applyAdjustments, {
        eventId: event.id,
        customerId: charge.customer,
        items: [{
            kind: "dispute" as const,
            stripeId: dispute.id,
            chargeId: charge.id,
            amount: dispute.amount,
            currency: dispute.currency,
            status: dispute.status,
            reason: dispute.reason ?? undefined,
            createdAt: dispute.created * 1000,
        }],
    })
    return "ok"
}

// Refunds a workspace's payment. This is an operator tool, not something customers can call: run it from the Convex
// dashboard or with `npx convex run stripe:refund '{"workspaceId":"..."}'`. See docs/OPERATIONS.md.
export const refund = internalAction({
    args: {
        workspaceId: v.id("workspaces"),
        // in the currency's smallest unit (2900 = $29.00). Leave out to refund everything not yet refunded.
        amount: v.optional(v.number()),
        // leave out to refund the most recent payment
        chargeId: v.optional(v.string()),
        reason: v.optional(v.union(v.literal("requested_by_customer"), v.literal("duplicate"), v.literal("fraudulent"))),
        // also end the subscription now, moving the workspace to Free
        cancelSubscription: v.optional(v.boolean()),
        // only needed to send a second refund of the same amount on the same payment within 24 hours
        requestId: v.optional(v.string()),
    },
    handler: async (ctx, args): Promise<{ refundId: string; chargeId: string; amount: number; currency: string; status: string; subscriptionCancelled: boolean }> => {
        const ids = await ctx.runQuery(internal.billing.stripeIds, { workspaceId: args.workspaceId })
        if (!ids.customerId) throw new ConvexError("This workspace has never paid, so there is nothing to refund")
        const customerId = ids.customerId

        let charge: Charge | undefined
        if (args.chargeId) {
            charge = await stripeCall<Charge>(`/v1/charges/${args.chargeId}`, undefined, "GET")
            if (charge.customer !== customerId) throw new ConvexError("That payment belongs to a different workspace")
        } else {
            const recent = await stripeCall<{ data: Charge[] }>("/v1/charges", { customer: customerId, limit: 20 }, "GET")
            charge = recent.data.find((c) => c.paid && c.status === "succeeded" && c.amount > c.amount_refunded)
        }
        if (!charge || !charge.paid || charge.status !== "succeeded") throw new ConvexError("No successful payment to refund")

        const left = charge.amount - charge.amount_refunded
        if (left <= 0) throw new ConvexError("That payment has already been refunded in full")
        const amount = args.amount ?? left
        if (!Number.isInteger(amount) || amount <= 0) throw new ConvexError("The amount must be a whole number of the smallest currency unit, for example 2900 for $29.00")
        if (amount > left) throw new ConvexError(`Only ${left} is left to refund on that payment`)

        // One key per payment and amount: running this twice by mistake, or retrying after a timeout, returns the
        // first refund instead of sending the money twice.
        const refunded = await stripeCall<Refund>("/v1/refunds", {
            charge: charge.id,
            amount,
            reason: args.reason ?? "requested_by_customer",
            "metadata[workspaceId]": args.workspaceId,
            "metadata[source]": "webflowx",
        }, "POST", `wfx-refund-${charge.id}-${amount}-${args.requestId ?? "1"}`)

        // Show it straight away. The webhook then keeps the status current (pending, succeeded or failed).
        await ctx.runMutation(internal.billing.applyAdjustments, { customerId, items: [refundRow(refunded, charge.id)] })

        const cancel = !!args.cancelSubscription && !!ids.subscriptionId
        if (cancel) await cancelSubscription(ids.subscriptionId!)
        return { refundId: refunded.id, chargeId: charge.id, amount: refunded.amount, currency: refunded.currency, status: refunded.status ?? "pending", subscriptionCancelled: cancel }
    },
})
