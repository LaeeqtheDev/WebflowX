import { v } from "convex/values"
import { mutation, query, internalMutation } from "./_generated/server"
import { auth } from "./auth"
import { canViewChannel } from "./permissions"
import { consume } from "./rateLimit"

const TTL_MS = 6_000

// The sender's browser calls this while they type (at most every 3 seconds).
export const ping = mutation({
    args: {
        workspaceId: v.id("workspaces"),
        channelId: v.optional(v.id("channels")),
        conversationId: v.optional(v.id("conversations")),
    },
    handler: async (ctx, args) => {
        const userId = await auth.getUserId(ctx)
        if (!userId) return null
        if (!args.channelId === !args.conversationId) return null // exactly one

        const me = await ctx.db
            .query("members")
            .withIndex("byWorkspaceId_user_id", (q) => q.eq("workspaceId", args.workspaceId).eq("userId", userId))
            .unique()
        if (!me) return null

        if (args.channelId) {
            const ch = await ctx.db.get(args.channelId)
            if (!ch || ch.workspaceId !== args.workspaceId || !(await canViewChannel(ctx, args.channelId, userId))) return null
        } else {
            const conv = await ctx.db.get(args.conversationId!)
            if (!conv || conv.workspaceId !== args.workspaceId) return null
            if (me.role === "guest" || (conv.memberOneId !== me._id && conv.memberTwoId !== me._id)) return null
        }

        // a stuck client can't flood the table
        if (!(await consume(ctx, `typing:${userId}`, 40, 60_000))) return null

        const until = Date.now() + TTL_MS
        const rows = args.channelId
            ? await ctx.db.query("typing").withIndex("by_channel_id", (q) => q.eq("channelId", args.channelId)).take(100)
            : await ctx.db.query("typing").withIndex("by_conversation_id", (q) => q.eq("conversationId", args.conversationId)).take(10)
        const mine = rows.find((r) => r.memberId === me._id)
        if (mine) await ctx.db.patch(mine._id, { until })
        else {
            await ctx.db.insert("typing", {
                workspaceId: args.workspaceId,
                channelId: args.channelId,
                conversationId: args.conversationId,
                memberId: me._id,
                until,
            })
        }
        return null
    },
})

// Who else is typing here. `until` lets the page hide a name the moment it expires.
export const list = query({
    args: {
        channelId: v.optional(v.id("channels")),
        conversationId: v.optional(v.id("conversations")),
    },
    handler: async (ctx, args) => {
        const userId = await auth.getUserId(ctx)
        if (!userId) return []
        if (!args.channelId === !args.conversationId) return []

        let workspaceId
        if (args.channelId) {
            if (!(await canViewChannel(ctx, args.channelId, userId))) return []
            workspaceId = (await ctx.db.get(args.channelId))?.workspaceId
        } else {
            workspaceId = (await ctx.db.get(args.conversationId!))?.workspaceId
        }
        if (!workspaceId) return []
        const me = await ctx.db
            .query("members")
            .withIndex("byWorkspaceId_user_id", (q) => q.eq("workspaceId", workspaceId).eq("userId", userId))
            .unique()
        if (!me) return []
        if (args.conversationId) {
            const conv = await ctx.db.get(args.conversationId)
            if (!conv || (me.role === "guest" || (conv.memberOneId !== me._id && conv.memberTwoId !== me._id))) return []
        }

        const rows = args.channelId
            ? await ctx.db.query("typing").withIndex("by_channel_id", (q) => q.eq("channelId", args.channelId)).take(50)
            : await ctx.db.query("typing").withIndex("by_conversation_id", (q) => q.eq("conversationId", args.conversationId)).take(10)
        const now = Date.now()
        const out: { memberId: string; name: string; until: number }[] = []
        for (const r of rows) {
            if (r.memberId === me._id || r.until <= now) continue
            const m = await ctx.db.get(r.memberId)
            const u = m ? await ctx.db.get(m.userId) : null
            out.push({ memberId: r.memberId, name: u?.name?.split(" ")[0] ?? "Someone", until: r.until })
        }
        return out
    },
})

// Old markers are removed hourly.
export const prune = internalMutation({
    args: {},
    handler: async (ctx) => {
        const rows = await ctx.db.query("typing").withIndex("by_until", (q) => q.lt("until", Date.now() - 60_000)).take(500)
        for (const r of rows) await ctx.db.delete(r._id)
    },
})
