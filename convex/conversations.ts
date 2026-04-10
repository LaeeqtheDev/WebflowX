import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { auth } from "./auth";

export const CreateOrGet = mutation({
    args: {
        memberId: v.id("members"),
        workspaceId: v.id("workspaces")
    },
    handler: async (ctx,args) => {
        const userId = await auth.getUserId(ctx);

        if(!userId){
            throw new Error("Unauthorized");
        }

        const currentMember = await ctx.db.query("members")
        .withIndex("byWorkspaceId_user_id", (q) => 
        q.eq("workspaceId",args.workspaceId).eq("userId", userId),
        ).unique()

        const otherMember = await ctx.db.get(args.memberId)

        if(!currentMember || !otherMember){
            throw new Error("Member not found");
        }

        const existingConversation = await ctx.db.query("conversations")
        .filter((q) => q.eq(q.field("workspaceId"), args.workspaceId))
        .filter((q) => 
        q.or(
            q.and(
                q.eq(q.field("memberOneId"), currentMember._id),
                q.eq(q.field("memberTwoId"), otherMember._id),
            ),
            q.and(
                q.eq(q.field("memberOneId"), otherMember._id),
                q.eq(q.field("memberTwoId"), currentMember._id),
            )
        )
        ).unique()

        if(existingConversation){
        return existingConversation._id
    }

    const conversationId = await ctx.db.insert("conversations", {
        workspaceId: args.workspaceId,
        memberOneId: currentMember._id,
        memberTwoId: otherMember._id,
        
    })

    // const conversation = await ctx.db.get(conversationId)

    // if(!conversation){
    //     throw new Error("Conversation not found after creation");
    // }
    return conversationId;
    

    }
})



export const getAll = query({
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

        const conversations = await ctx.db
            .query("conversations")
            .withIndex("byWorkspaceId", (q) => q.eq("workspaceId", args.workspaceId))
            .collect()

        // Only return conversations this member is part of
        const myConversations = conversations.filter(c =>
            c.memberOneId === member._id || c.memberTwoId === member._id
        )

        return await Promise.all(myConversations.map(async (conv) => {
            // Get the other member
            const otherMemberId = conv.memberOneId === member._id
                ? conv.memberTwoId
                : conv.memberOneId

            const otherMember = await ctx.db.get(otherMemberId)
            const otherUser = otherMember ? await ctx.db.get(otherMember.userId) : null

            // Get last message
            const messages = await ctx.db
                .query("messages")
                .withIndex("by_conversation_id", (q) => q.eq("conversationId", conv._id))
                .order("desc")
                .take(1)

            const lastMessage = messages[0] ?? null

            // Get unread count from notifications
            const unreadNotifs = await ctx.db
                .query("notifications")
                .withIndex("by_recipient_read", (q) =>
                    q.eq("recipientId", member._id).eq("read", false)
                )
                .filter((q) =>
                    q.and(
                        q.eq(q.field("type"), "dm_received"),
                        q.eq(q.field("conversationId"), conv._id)
                    )
                )
                .collect()

            return {
                ...conv,
                otherMember: otherMember ? { ...otherMember, user: otherUser } : null,
                lastMessage,
                unreadCount: unreadNotifs.length,
            }
        }))
    }
})