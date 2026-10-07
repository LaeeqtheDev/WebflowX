import { v, ConvexError } from "convex/values"
import { query, mutation } from "./_generated/server"
import { auth } from "./auth"
import { PLANS, getPlan } from "./limits"

export const get = query({
    args: { workspaceId: v.id("workspaces") },
    handler: async (ctx, args) => {
        const userId = await auth.getUserId(ctx)
        if (!userId) return null

        const member = await ctx.db
            .query("members")
            .withIndex("byWorkspaceId_user_id", (q) =>
                q.eq("workspaceId", args.workspaceId).eq("userId", userId)
            ).unique()

        if (!member) return null

        const workspace = await ctx.db.get(args.workspaceId)
        if (!workspace) return null

        const plan = getPlan(workspace.plan)
        const limits = PLANS[plan]

        // Start of current month for meeting reset
        const now = new Date()
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime()

        // Each count reads at most (plan limit + 1) rows, so this stays cheap on huge workspaces.
        // Unlimited plans show up to 1,000 and stop counting there.
        const capFor = (limit: number) => (limit === -1 ? 1000 : limit + 1)
        const members = await ctx.db.query("members")
            .withIndex("byWorkspaceId", (q) => q.eq("workspaceId", args.workspaceId))
            .take(capFor(limits.members))
        const channels = await ctx.db.query("channels")
            .withIndex("byWorkspaceId", (q) => q.eq("workspaceId", args.workspaceId))
            .take(capFor(limits.channels))
        const personalNotes = await ctx.db.query("notes")
            .withIndex("by_author_id_type", (q) => q.eq("authorId", member._id).eq("type", "personal"))
            .take(capFor(limits.personalNotes))
        const workspaceNotes = await ctx.db.query("notes")
            .withIndex("by_workspace_id_type", (q) => q.eq("workspaceId", args.workspaceId).eq("type", "workspace"))
            .take(capFor(limits.workspaceNotes))
        const docs = await ctx.db.query("docs")
            .withIndex("by_workspace_id", (q) => q.eq("workspaceId", args.workspaceId))
            .take(capFor(limits.docs))
        // newest first, so stopping at the cap still counts this month's meetings correctly
        const recentMeetings = await ctx.db.query("meetings")
            .withIndex("by_workspace_id", (q) => q.eq("workspaceId", args.workspaceId))
            .order("desc")
            .take(capFor(limits.meetings))
        const meetings = recentMeetings.filter((m) => m.startedAt >= startOfMonth)
        const aiSummaries = await ctx.db.query("aiSummaryLog")
            .withIndex("by_workspace_id", (q) =>
                q.eq("workspaceId", args.workspaceId).gte("_creationTime", startOfMonth)
            )
            .take(capFor(limits.aiSummaries))
        const ownedWorkspaces = await ctx.db.query("workspaces")
            .withIndex("by_user_id", (q) => q.eq("userId", userId))
            .take(100)

        // Workspace allowance follows the best plan among the workspaces this user owns
        const bestWorkspaceLimit = ownedWorkspaces.reduce((best, w) => {
            const limit = PLANS[getPlan(w.plan)].workspaces
            if (best === -1 || limit === -1) return -1
            return Math.max(best, limit)
        }, 0)

        return {
            plan,
            planDetails: limits,
            workspace: {
                name: workspace.name,
                plan: workspace.plan ?? "free",
            },
            usage: {
                members: { current: members.length, limit: limits.members },
                channels: { current: channels.length, limit: limits.channels },
                personalNotes: { current: personalNotes.length, limit: limits.personalNotes },
                workspaceNotes: { current: workspaceNotes.length, limit: limits.workspaceNotes },
                docs: { current: docs.length, limit: limits.docs },
                meetings: { current: meetings.length, limit: limits.meetings },
                aiSummaries: { current: aiSummaries.length, limit: limits.aiSummaries },
                // megabytes of uploaded files
                storage: { current: Math.round(((workspace.storageBytes ?? 0) / (1024 * 1024)) * 10) / 10, limit: limits.storageMb },
                workspaces: {
                    current: ownedWorkspaces.length,
                    limit: ownedWorkspaces.length === 0 ? limits.workspaces : bestWorkspaceLimit,
                },
            }
        }
    }
})

export const upgradePlan = mutation({
    args: {
        workspaceId: v.id("workspaces"),
        plan: v.union(
            v.literal("free"),
            v.literal("startup"),
            v.literal("growth"),
            v.literal("enterprise")
        )
    },
    handler: async (ctx, args) => {
        const userId = await auth.getUserId(ctx)
        if (!userId) throw new Error("Unauthorized")

        // Only the workspace owner may change the plan. (Billing is not wired up yet: when Stripe is added,
        // replace this with an internal mutation called from the Stripe webhook.)
        const workspace = await ctx.db.get(args.workspaceId)
        if (!workspace || workspace.userId !== userId) throw new ConvexError("Only the workspace owner can change the plan")

        await ctx.db.patch(args.workspaceId, { plan: args.plan })
        return args.workspaceId
    }
})