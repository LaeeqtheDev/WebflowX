import { v } from "convex/values"
import { query } from "./_generated/server"
import { auth } from "./auth"

export const get = query({
    args: { workspaceId: v.id("workspaces") },
    handler: async (ctx, args) => {
        const userId = await auth.getUserId(ctx)
        if (!userId) return []

        const member = await ctx.db
            .query("members")
            .withIndex("byWorkspaceId_user_id", (q) =>
                q.eq("workspaceId", args.workspaceId).eq("userId", userId)
            ).unique()

        if (!member) return []

        // Only channel messages, no DMs, no thread replies
        const messages = await ctx.db
            .query("messages")
            .withIndex("by_member_id", (q) => q.eq("memberId", member._id))
            .order("desc")
            .collect()

        const channelMessages = messages.filter(m =>
            m.channelId !== undefined &&
            m.conversationId === undefined &&
            m.parentMessagesId === undefined
        )

        return await Promise.all(channelMessages.map(async (msg) => {
            const channel = msg.channelId ? await ctx.db.get(msg.channelId) : null
            const image = msg.image ? await ctx.storage.getUrl(msg.image) : undefined
            return { ...msg, channel, image }
        }))
    }
})