import { v, ConvexError } from "convex/values"
import { action, internalAction } from "./_generated/server"
import { internal } from "./_generated/api"
import { auth } from "./auth"
import { siteUrl } from "./emailLayout"
import { hmacHex } from "./integrations"
import { priceEnv } from "./billing"

// Talks to Stripe's REST API directly (form-encoded), so there is no SDK to keep in step with.
type Params = Record<string, string | number | boolean | undefined>
const stripeCall = async <T>(path: string, params?: Params, method: "GET" | "POST" = "POST"): Promise<T> => {
    const key = process.env.STRIPE_SECRET_KEY
    if (!key) throw new ConvexError("Billing isn't set up yet. Please contact support@northfoundry.co")
    const body = new URLSearchParams()
    for (const [k, val] of Object.entries(params ?? {})) if (val !== undefined) body.set(k, String(val))
    const res = await fetch(`https://api.stripe.com${path}${method === "GET" && body.size ? `?${body}` : ""}`, {
        method,
        headers: { Authorization: `Bearer ${key}`, ...(method === "POST" ? { "Content-Type": "application/x-www-form-urlencoded" } : {}) },
        body: method === "POST" ? body : undefined,
    })
    const json = (await res.json()) as T & { error?: { message?: string } }
    if (!res.ok) {
        console.error("Stripe error", path, res.status, json.error?.message)
        throw new ConvexError("Couldn't reach the payment provider. Please try again in a moment.")
    }
    return json
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

        const event = JSON.parse(args.body) as { id: string; type: string; data: { object: { id: string; subscription?: string | null; metadata?: { workspaceId?: string } } } }
        const obj = event.data.object
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
