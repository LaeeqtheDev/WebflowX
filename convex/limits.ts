import { QueryCtx } from "./_generated/server"
import { Id } from "./_generated/dataModel"

export type Plan = "free" | "startup" | "growth" | "enterprise"

export const PLANS = {
    free: {
        name: "Free",
        price: 0,
        workspaces: 1,
        members: 10,
        channels: 5,
        personalNotes: 10,
        workspaceNotes: 20,
        docs: 10,
        meetings: 5,
        aiSummaries: 2,
    },
    startup: {
        name: "Startup",
        price: 19,
        workspaces: 3,
        members: 25,
        channels: 20,
        personalNotes: 50,
        workspaceNotes: 100,
        docs: 50,
        meetings: 20,
        aiSummaries: 10,
    },
    growth: {
        name: "Growth",
        price: 49,
        workspaces: 10,
        members: 100,
        channels: 50,
        personalNotes: -1, // unlimited
        workspaceNotes: -1,
        docs: 200,
        meetings: 50,
        aiSummaries: 30,
    },
    enterprise: {
        name: "Enterprise",
        price: 149,
        workspaces: -1,
        members: -1,
        channels: -1,
        personalNotes: -1,
        workspaceNotes: -1,
        docs: -1,
        meetings: -1,
        aiSummaries: -1,
    },
}

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