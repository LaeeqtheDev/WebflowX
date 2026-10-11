import { v, ConvexError } from "convex/values"
import { query, internalQuery, internalMutation } from "./_generated/server"
import { auth } from "./auth"
import type { Plan } from "./limits"

const PAID = ["startup", "growth", "enterprise"] as const
export type PaidPlan = (typeof PAID)[number]

export const priceEnv = (plan: PaidPlan, interval: "month" | "year") => process.env[`STRIPE_PRICE_${plan.toUpperCase()}_${interval === "month" ? "MONTH" : "YEAR"}`]

// Which plan a Stripe price belongs to, from the STRIPE_PRICE_* settings.
const planForPrice = (priceId: string): { plan: PaidPlan; interval: "month" | "year" } | null => {
    for (const plan of PAID) for (const interval of ["month", "year"] as const) {
        if (priceEnv(plan, interval) === priceId) return { plan, interval }
    }
    return null
}

// Stripe dispute statuses that are still being decided.
const DISPUTE_OPEN = ["needs_response", "under_review", "warning_needs_response", "warning_under_review"]

// What the Plans & billing screen needs. Never returns keys or price ids.
export const get = query({
    args: { workspaceId: v.id("workspaces") },
    handler: async (ctx, args) => {
        const userId = await auth.getUserId(ctx)
        if (!userId) return null
        const member = await ctx.db
            .query("members")
            .withIndex("byWorkspaceId_user_id", (q) => q.eq("workspaceId", args.workspaceId).eq("userId", userId))
            .unique()
        if (!member || member.role === "guest") return null
        const w = await ctx.db.get(args.workspaceId)
        if (!w) return null
        const configured = !!process.env.STRIPE_SECRET_KEY && PAID.every((p) => !!priceEnv(p, "month"))
        // refunds and disputes are shown to the owner only
        const adjustments = w.userId !== userId ? [] : await ctx.db
            .query("billingAdjustments")
            .withIndex("by_workspace", (q) => q.eq("workspaceId", args.workspaceId))
            .order("desc")
            .take(20)
        return {
            adjustments: adjustments.map((a) => ({ id: a._id, kind: a.kind, amount: a.amount, currency: a.currency, status: a.status, createdAt: a.createdAt })),
            disputeOpen: adjustments.some((a) => a.kind === "dispute" && DISPUTE_OPEN.includes(a.status)),
            isOwner: w.userId === userId,
            configured,
            annualAvailable: configured && PAID.every((p) => !!priceEnv(p, "year")),
            trialDays: Number(process.env.STRIPE_TRIAL_DAYS ?? 14) || 0,
            canTrial: !w.stripeSubscriptionId && !w.billingStatus,
            hasCustomer: !!w.stripeCustomerId,
            status: w.billingStatus ?? null,
            interval: w.billingInterval ?? null,
            periodEnd: w.billingPeriodEnd ?? null,
            trialEnd: w.billingTrialEnd ?? null,
            cancelAtPeriodEnd: w.cancelAtPeriodEnd ?? false,
        }
    },
})

// Used by the checkout and portal actions: only the owner may manage billing.
export const ownerContext = internalQuery({
    args: { workspaceId: v.id("workspaces"), userId: v.id("users") },
    handler: async (ctx, args) => {
        const w = await ctx.db.get(args.workspaceId)
        if (!w || w.userId !== args.userId) throw new ConvexError("Only the workspace owner can manage billing")
        const user = await ctx.db.get(args.userId)
        return {
            name: w.name,
            email: user?.email ?? null,
            customerId: w.stripeCustomerId ?? null,
            subscriptionId: w.stripeSubscriptionId ?? null,
            status: w.billingStatus ?? null,
            everSubscribed: !!w.billingStatus || !!w.stripeSubscriptionId,
            plan: (w.plan ?? "free") as Plan,
        }
    },
})

export const saveCustomer = internalMutation({
    args: { workspaceId: v.id("workspaces"), customerId: v.string() },
    handler: async (ctx, args) => {
        await ctx.db.patch(args.workspaceId, { stripeCustomerId: args.customerId })
    },
})

// Applies the current state of a Stripe subscription to the workspace. Called by the webhook with a freshly fetched
// subscription, so out-of-order or repeated events always end in the right place.
export const applySubscription = internalMutation({
    args: {
        eventId: v.string(),
        workspaceId: v.optional(v.string()),
        customerId: v.string(),
        subscriptionId: v.string(),
        status: v.string(),
        priceId: v.optional(v.string()),
        periodEnd: v.optional(v.number()),
        trialEnd: v.optional(v.number()),
        cancelAtPeriodEnd: v.boolean(),
    },
    handler: async (ctx, args) => {
        const seen = await ctx.db.query("stripeEvents").withIndex("by_event_id", (q) => q.eq("eventId", args.eventId)).first()
        if (seen) return "duplicate"

        const hinted = args.workspaceId ? ctx.db.normalizeId("workspaces", args.workspaceId) : null
        let w = hinted ? await ctx.db.get(hinted) : null
        if (!w) w = await ctx.db.query("workspaces").withIndex("by_stripe_customer", (q) => q.eq("stripeCustomerId", args.customerId)).first()
        if (!w) return "no-workspace"

        const live = ["active", "trialing", "past_due"].includes(args.status)
        const ended = ["canceled", "unpaid", "incomplete_expired", "paused"].includes(args.status)
        // a different, older subscription ending must not downgrade a workspace that has moved to a new one
        if (ended && w.stripeSubscriptionId && w.stripeSubscriptionId !== args.subscriptionId) {
            await ctx.db.insert("stripeEvents", { eventId: args.eventId })
            return "stale"
        }

        const patch: Record<string, unknown> = { stripeCustomerId: args.customerId, billingStatus: args.status }
        if (live) {
            const hit = args.priceId ? planForPrice(args.priceId) : null
            if (hit) {
                patch.plan = hit.plan
                patch.billingInterval = hit.interval
            }
            patch.stripeSubscriptionId = args.subscriptionId
            patch.billingPeriodEnd = args.periodEnd
            patch.billingTrialEnd = args.status === "trialing" ? args.trialEnd : undefined
            patch.cancelAtPeriodEnd = args.cancelAtPeriodEnd
        } else if (ended) {
            // back to Free. Existing content is kept, only creating beyond the Free limits is blocked.
            patch.plan = "free"
            patch.stripeSubscriptionId = undefined
            patch.billingPeriodEnd = undefined
            patch.billingTrialEnd = undefined
            patch.cancelAtPeriodEnd = false
            patch.billingInterval = undefined
        }
        await ctx.db.patch(w._id, patch)
        await ctx.db.insert("stripeEvents", { eventId: args.eventId })
        return "ok"
    },
})

// ---- refunds and disputes ----

// Used by the refund action, which only the operator can run, so there is no ownership check here.
export const stripeIds = internalQuery({
    args: { workspaceId: v.id("workspaces") },
    handler: async (ctx, args) => {
        const w = await ctx.db.get(args.workspaceId)
        if (!w) throw new ConvexError("Workspace not found")
        return { customerId: w.stripeCustomerId ?? null, subscriptionId: w.stripeSubscriptionId ?? null }
    },
})

// Before a lost dispute ends a subscription: what we already hold for that dispute and which subscription is live.
export const disputeContext = internalQuery({
    args: { customerId: v.string(), disputeId: v.string() },
    handler: async (ctx, args) => {
        const known = await ctx.db.query("billingAdjustments").withIndex("by_stripe_id", (q) => q.eq("stripeId", args.disputeId)).first()
        const w = await ctx.db.query("workspaces").withIndex("by_stripe_customer", (q) => q.eq("stripeCustomerId", args.customerId)).first()
        return { status: known?.status ?? null, subscriptionId: w?.stripeSubscriptionId ?? null }
    },
})

// Stores the current state of refunds or disputes on one customer's payments. Like applySubscription it is given
// freshly fetched objects, so repeated or out-of-order events only ever bring a row up to date.
export const applyAdjustments = internalMutation({
    args: {
        eventId: v.optional(v.string()),
        customerId: v.string(),
        items: v.array(v.object({
            kind: v.union(v.literal("refund"), v.literal("dispute")),
            stripeId: v.string(),
            chargeId: v.string(),
            amount: v.number(),
            currency: v.string(),
            status: v.string(),
            reason: v.optional(v.string()),
            createdAt: v.number(),
        })),
    },
    handler: async (ctx, args) => {
        const eventId = args.eventId
        if (eventId) {
            const seen = await ctx.db.query("stripeEvents").withIndex("by_event_id", (q) => q.eq("eventId", eventId)).first()
            if (seen) return "duplicate"
        }
        const w = await ctx.db.query("workspaces").withIndex("by_stripe_customer", (q) => q.eq("stripeCustomerId", args.customerId)).first()
        if (!w) return "no-workspace"

        for (const item of args.items) {
            const known = await ctx.db.query("billingAdjustments").withIndex("by_stripe_id", (q) => q.eq("stripeId", item.stripeId)).first()
            if (known) await ctx.db.patch(known._id, { amount: item.amount, status: item.status, reason: item.reason })
            else await ctx.db.insert("billingAdjustments", { workspaceId: w._id, ...item })
        }
        if (eventId) await ctx.db.insert("stripeEvents", { eventId })
        return "ok"
    },
})
