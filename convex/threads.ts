import { v } from "convex/values"
import { query } from "./_generated/server"
import { auth } from "./auth"

export const get = query({
    args: { workspaceId: v.id("workspaces") },
    handler: async (ctx, args) => {
        const userId = await auth.getUserId(ctx)
        if (!userId) return { myThreads: [], participatedThreads: [] }

        const member = await ctx.db
            .query("members")
            .withIndex("byWorkspaceId_user_id", (q) =>
                q.eq("workspaceId", args.workspaceId).eq("userId", userId)
            ).unique()

        if (!member) return { myThreads: [], participatedThreads: [] }

        // All channel messages (no DMs, no thread replies) that have at least one reply
        const allParentMessages = await ctx.db
            .query("messages")
            .withIndex("byWorkspaceId", (q) => q.eq("workspaceId", args.workspaceId))
            .filter((q) =>
                q.and(
                    q.neq(q.field("channelId"), undefined),
                    q.eq(q.field("parentMessagesId"), undefined),
                    q.eq(q.field("conversationId"), undefined)
                )
            )
            .order("desc")
            .collect()

        // For each parent message, get replies
        const threadsWithReplies = await Promise.all(
            allParentMessages.map(async (msg) => {
                const replies = await ctx.db
                    .query("messages")
                    .withIndex("by_parent_message_id", (q) => q.eq("parentMessagesId", msg._id))
                    .collect()

                if (replies.length === 0) return null

                const msgMember = await ctx.db.get(msg.memberId)
                const msgUser = msgMember ? await ctx.db.get(msgMember.userId) : null

                const channel = msg.channelId ? await ctx.db.get(msg.channelId) : null

                const lastReply = replies[replies.length - 1]
                const lastReplyMember = await ctx.db.get(lastReply.memberId)
                const lastReplyUser = lastReplyMember ? await ctx.db.get(lastReplyMember.userId) : null

                // Check if current member participated (replied)
                const memberReplied = replies.some(r => r.memberId === member._id)
                const isMyThread = msg.memberId === member._id

                return {
                    ...msg,
                    replyCount: replies.length,
                    lastReplyAt: lastReply._creationTime,
                    lastReplyUser: lastReplyUser?.name ?? "Someone",
                    author: { member: msgMember, user: msgUser },
                    channel,
                    isMyThread,
                    memberReplied,
                }
            })
        )

        const validThreads = threadsWithReplies.filter(Boolean) as NonNullable<typeof threadsWithReplies[0]>[]

        return {
            // Threads I started that have replies
            myThreads: validThreads.filter(t => t.isMyThread),
            // Threads I replied to but didn't start
            participatedThreads: validThreads.filter(t => !t.isMyThread && t.memberReplied),
        }
    }
})