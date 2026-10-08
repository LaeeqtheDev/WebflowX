import { v, ConvexError } from "convex/values"
import { query, mutation } from "./_generated/server"
import { auth } from "./auth"
import { PLANS, getPlan } from "./limits"
import { countLiveDocs } from "./docs"

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

        if (!member || member.role === "guest") return null

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
        const docsLive = await countLiveDocs(ctx, args.workspaceId, capFor(limits.docs))
        const dbRowCount = (await ctx.db.query("dbCounts").withIndex("by_key", (q) => q.eq("key", `ws:${args.workspaceId}`)).unique())?.count ?? 0
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
                docs: { current: docsLive, limit: limits.docs },
                dbRows: { current: dbRowCount, limit: limits.dbRows },
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
