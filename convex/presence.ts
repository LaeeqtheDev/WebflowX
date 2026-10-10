import { v } from "convex/values"
import { mutation, query } from "./_generated/server"
import { auth } from "./auth"

// Called every minute while the app is open and visible. Writes at most once per 50 seconds.
export const heartbeat = mutation({
    args: {},
    handler: async (ctx) => {
        const userId = await auth.getUserId(ctx)
        if (!userId) return null
        const now = Date.now()
        const row = await ctx.db.query("presence").withIndex("by_user_id", (q) => q.eq("userId", userId)).unique()
        if (!row) await ctx.db.insert("presence", { userId, lastSeen: now })
        else if (now - row.lastSeen > 50_000) await ctx.db.patch(row._id, { lastSeen: now })
        return null
    },
})

// When each member of the workspace was last active. The page decides who counts as online
// (seen in the last ~2.5 minutes) so the list stays right without the server re-running.
export const list = query({
    args: { workspaceId: v.id("workspaces") },
    handler: async (ctx, args) => {
        const userId = await auth.getUserId(ctx)
        if (!userId) return []
        const me = await ctx.db
            .query("members")
            .withIndex("byWorkspaceId_user_id", (q) => q.eq("workspaceId", args.workspaceId).eq("userId", userId))
            .unique()
        if (!me || me.role === "guest") return []
        const members = await ctx.db
            .query("members")
            .withIndex("byWorkspaceId", (q) => q.eq("workspaceId", args.workspaceId))
            .take(300)
        const out: { memberId: (typeof members)[number]["_id"]; lastSeen: number }[] = []
        for (const m of members) {
            const p = await ctx.db.query("presence").withIndex("by_user_id", (q) => q.eq("userId", m.userId)).unique()
            if (p) out.push({ memberId: m._id, lastSeen: p.lastSeen })
        }
        return out
    },
})
