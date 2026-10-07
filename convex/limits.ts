import { QueryCtx } from "./_generated/server"
import { Id } from "./_generated/dataModel"

export type Plan = "free" | "startup" | "growth" | "enterprise"

export const PLANS = {
    free: {
        name: "Free",
        price: 0,
        workspaces: 1,
        members: 10,
        guests: 0,
        channels: 5,
        personalNotes: 10,
        workspaceNotes: 20,
        docs: 10,
        meetings: 5,
        aiSummaries: 2,
        apiKeys: 0,
        incomingHooks: 0,
        outgoingHooks: 0,
        githubHooks: 0,
        storageMb: 250,
    },
    startup: {
        name: "Startup",
        price: 29,
        workspaces: 3,
        members: 25,
        guests: 5,
        channels: 20,
        personalNotes: 50,
        workspaceNotes: 100,
        docs: 50,
        meetings: 20,
        aiSummaries: 10,
        apiKeys: 3,
        incomingHooks: 5,
        outgoingHooks: 0,
        githubHooks: 0,
        storageMb: 5_000,
    },
    growth: {
        name: "Growth",
        price: 79,
        workspaces: 10,
        members: 100,
        guests: 25,
        channels: 50,
        personalNotes: -1, // unlimited
        workspaceNotes: -1,
        docs: 200,
        meetings: 50,
        aiSummaries: 30,
        apiKeys: 10,
        incomingHooks: 20,
        outgoingHooks: 10,
        githubHooks: 5,
        storageMb: 50_000,
    },
    enterprise: {
        name: "Enterprise",
        price: 249,
        workspaces: -1,
        members: -1,
        guests: -1,
        channels: -1,
        personalNotes: -1,
        workspaceNotes: -1,
        docs: -1,
        meetings: 200,   // meetings and AI summaries cost real money per use, so even Enterprise has a (generous) cap
        aiSummaries: 150,
        apiKeys: -1,
        incomingHooks: -1,
        outgoingHooks: -1,
        githubHooks: -1,
        storageMb: 1_000_000, // 1 TB fair use
    },
}

// Free workspaces keep (but only show) the last 90 days of messages. Upgrading brings the rest back.
export const HISTORY_DAYS_FREE = 90
export const historyCutoff = (plan?: string): number | null =>
    getPlan(plan) === "free" ? Date.now() - HISTORY_DAYS_FREE * 24 * 60 * 60 * 1000 : null

export const getPlan = (plan?: string): Plan => {
    if (plan === "startup" || plan === "growth" || plan === "enterprise") return plan
    return "free"
}

export const checkLimit = async (
    ctx: QueryCtx,
    workspaceId: Id<"workspaces">,
    feature: keyof typeof PLANS["free"],
    currentCount: number
): Promise<{ allowed: boolean; limit: number; plan: Plan }> => {
    const workspace = await ctx.db.get(workspaceId)
    const plan = getPlan(workspace?.plan)
    const limit = PLANS[plan][feature] as number

    if (limit === -1) return { allowed: true, limit: -1, plan }

    return {
        allowed: currentCount < limit,
        limit,
        plan
    }
}

// Like checkLimit, but only reads as many rows as the plan could possibly allow (never the whole table).
// `count(cap)` must return how many rows exist, reading at most `cap` of them.
export const checkLimitLazy = async (
    ctx: QueryCtx,
    workspaceId: Id<"workspaces">,
    feature: keyof typeof PLANS["free"],
    count: (cap: number) => Promise<number>
): Promise<{ allowed: boolean; limit: number; plan: Plan }> => {
    const workspace = await ctx.db.get(workspaceId)
    const plan = getPlan(workspace?.plan)
    const limit = PLANS[plan][feature] as number
    if (limit === -1) return { allowed: true, limit: -1, plan }
    const n = await count(limit)
    return { allowed: n < limit, limit, plan }
}
