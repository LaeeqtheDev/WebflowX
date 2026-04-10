import { v } from "convex/values"
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

        const [
            members,
            channels,
            allNotes,
            docs,
            meetings,
        ] = await Promise.all([
            ctx.db.query("members")
                .withIndex("byWorkspaceId", (q) => q.eq("workspaceId", args.workspaceId))
                .collect(),
            ctx.db.query("channels")
                .withIndex("byWorkspaceId", (q) => q.eq("workspaceId", args.workspaceId))
                .collect(),
            ctx.db.query("notes")
                .withIndex("by_workspace_id", (q) => q.eq("workspaceId", args.workspaceId))
                .collect(),
            ctx.db.query("docs")
                .withIndex("by_workspace_id", (q) => q.eq("workspaceId", args.workspaceId))
                .collect(),
            // Only count meetings from this month
            ctx.db.query("meetings")
                .withIndex("by_workspace_id", (q) => q.eq("workspaceId", args.workspaceId))
                .filter((q) => q.gte(q.field("startedAt"), startOfMonth))
                .collect(),
        ])

        const personalNotes = allNotes.filter(
            n => n.type === "personal" && n.authorId === member._id
        )
        const workspaceNotes = allNotes.filter(n => n.type === "workspace")

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

        const member = await ctx.db
            .query("members")
            .withIndex("byWorkspaceId_user_id", (q) =>
                q.eq("workspaceId", args.workspaceId).eq("userId", userId)
            ).unique()

        if (!member || member.role !== "admin") throw new Error("Only admins can upgrade plan")

        await ctx.db.patch(args.workspaceId, { plan: args.plan })
        return args.workspaceId
    }
})