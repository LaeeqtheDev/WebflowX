import { v } from "convex/values"
import { notify } from "./notifications"
import { Id } from "./_generated/dataModel"
import { mutation, QueryCtx } from "./_generated/server"
import { auth } from "./auth"
import { canViewChannel } from "./permissions"
import { throttle } from "./rateLimit"

export const getMember = async (
    ctx: QueryCtx,
    workspaceId: Id<"workspaces">,
    userId: Id<"users">
) => {
    return ctx.db.query("members")
        .withIndex("byWorkspaceId_user_id", (q) =>
            q.eq("workspaceId", workspaceId).eq("userId", userId)).unique()
}

export const toggle = mutation({
    args: {
        messageId: v.id("messages"),
        value: v.string(),
    },
    handler: async (ctx, args) => {
        const userId = await auth.getUserId(ctx);
        if (!userId) throw new Error("Unauthorized")

        const message = await ctx.db.get(args.messageId)
        if (!message) throw new Error("Message not found")

        const member = await getMember(ctx, message.workspaceId, userId);
        if (!member) throw new Error("Unauthorized")

        if (args.value.length === 0 || args.value.length > 32) throw new Error("Invalid reaction")
        await throttle(ctx, userId, "react", 120, 60_000, "reacting")
        if (message.channelId && !(await canViewChannel(ctx, message.channelId, userId))) throw new Error("Unauthorized")
        if (message.conversationId) {
            const conv = await ctx.db.get(message.conversationId)
            if (!conv || (member.role === "guest" || (conv.memberOneId !== member._id && conv.memberTwoId !== member._id))) throw new Error("Unauthorized")
        }

        const existingReaction = await ctx.db
            .query("reactions")
            .withIndex("by_message_id", (q) => q.eq("messageId", args.messageId))
            .filter((q) =>
                q.and(
                    q.eq(q.field("memberId"), member._id),
                    q.eq(q.field("value"), args.value)
                )
            )
            .first()

        if (existingReaction) {
            await ctx.db.delete(existingReaction._id)
            return existingReaction._id;
        } else {
            const newReactionId = await ctx.db.insert("reactions", {
                value: args.value,
                memberId: member._id,
                messageId: message._id,
                workspaceId: message.workspaceId
            })

            // 👇 Notify message author
            if (message.memberId !== member._id) {
                await notify(ctx, {
                    workspaceId: message.workspaceId,
                    recipientId: message.memberId,
                    senderId: member._id,
                    type: "reaction",
                    messageId: args.messageId,
                    channelId: message.channelId,
                    body: args.value,
                    read: false,
                })
            }

            return newReactionId;
        }
    }
})