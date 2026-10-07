import { v } from "convex/values"
import { query } from "./_generated/server"
import { Doc, Id } from "./_generated/dataModel"
import { auth } from "./auth"
import { canAccessChannel, assert2fa } from "./permissions"

const EMPTY = { myThreads: [], participatedThreads: [] }

// Threads the caller started or joined. Works from the caller's own recent messages instead of
// scanning every message in the workspace, so it stays fast however big the workspace gets.
export const get = query({
    args: { workspaceId: v.id("workspaces") },
    handler: async (ctx, args) => {
        const userId = await auth.getUserId(ctx)
        if (!userId) return EMPTY

        const member = await ctx.db
            .query("members")
            .withIndex("byWorkspaceId_user_id", (q) =>
                q.eq("workspaceId", args.workspaceId).eq("userId", userId)
            ).unique()
        if (member) await assert2fa(ctx, member)
        if (!member || member.role === "guest") return EMPTY
        const workspace = await ctx.db.get(args.workspaceId)
        if (!workspace) return EMPTY

        // my 400 most recent messages (channel posts and replies)
        const mine = await ctx.db
            .query("messages")
            .withIndex("by_member_id", (q) => q.eq("memberId", member._id))
            .order("desc")
            .take(400)

        const candidates = new Map<Id<"messages">, { repliedByMe: boolean }>()
        for (const m of mine) {
            if (!m.channelId || m.conversationId) continue
            if (m.parentMessagesId) {
                candidates.set(m.parentMessagesId, { repliedByMe: true })
            } else if (!candidates.has(m._id)) {
                candidates.set(m._id, { repliedByMe: false })
            }
        }

        const rows = []
        for (const [parentId, info] of Array.from(candidates).slice(0, 120)) {
            const msg: Doc<"messages"> | null = await ctx.db.get(parentId)
            if (!msg || msg.workspaceId !== args.workspaceId || !msg.channelId || msg.parentMessagesId || msg.conversationId) continue

            const replies = await ctx.db
                .query("messages")
                .withIndex("by_parent_message_id", (q) => q.eq("parentMessagesId", msg._id))
                .order("desc")
                .take(100)
            if (replies.length === 0) continue

            const channel = await ctx.db.get(msg.channelId)
            if (channel && !canAccessChannel(workspace, member, channel)) continue

            const msgMember = await ctx.db.get(msg.memberId)
            const msgUser = msgMember ? await ctx.db.get(msgMember.userId) : null
            const lastReply = replies[0]
            const lastReplyMember = await ctx.db.get(lastReply.memberId)
            const lastReplyUser = lastReplyMember ? await ctx.db.get(lastReplyMember.userId) : null

            rows.push({
                ...msg,
                replyCount: replies.length,
                lastReplyAt: lastReply._creationTime,
                lastReplyUser: lastReplyUser?.name ?? "Someone",
                author: { member: msgMember, user: msgUser },
                channel,
                isMyThread: msg.memberId === member._id,
                memberReplied: info.repliedByMe,
            })
        }

        rows.sort((a, b) => b.lastReplyAt - a.lastReplyAt)
        return {
            // Threads I started that have replies
            myThreads: rows.filter((t) => t.isMyThread),
            // Threads I replied to but didn't start
            participatedThreads: rows.filter((t) => !t.isMyThread && t.memberReplied),
        }
    }
})
