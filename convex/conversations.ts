import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { auth } from "./auth";
import { ConvexError } from "convex/values";

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

        if(!currentMember || !otherMember || otherMember.workspaceId !== args.workspaceId){
            throw new Error("Member not found");
        }
        if (currentMember.role === "guest" || otherMember.role === "guest") {
            throw new ConvexError("Guests can't use direct messages");
        }

        const existingConversation =
            (await ctx.db.query("conversations")
                .withIndex("by_member_one", (q) => q.eq("memberOneId", currentMember._id))
                .filter((q) => q.eq(q.field("memberTwoId"), otherMember._id))
                .first()) ??
            (await ctx.db.query("conversations")
                .withIndex("by_member_one", (q) => q.eq("memberOneId", otherMember._id))
                .filter((q) => q.eq(q.field("memberTwoId"), currentMember._id))
                .first())

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

        if (!member || member.role === "guest") return []

        // only this member's conversations, found through their own indexes (not by scanning the workspace)
        const [asOne, asTwo] = await Promise.all([
            ctx.db.query("conversations").withIndex("by_member_one", (q) => q.eq("memberOneId", member._id)).take(200),
            ctx.db.query("conversations").withIndex("by_member_two", (q) => q.eq("memberTwoId", member._id)).take(200),
        ])
        const seen = new Set<string>()
        const myConversations = [...asOne, ...asTwo].filter((c) => {
            if (c.workspaceId !== args.workspaceId || seen.has(c._id)) return false
            seen.add(c._id)
            return true
        })

        // unread DM counts in one query, grouped here (instead of one query per conversation)
        const unreadDms = await ctx.db
            .query("notifications")
            .withIndex("by_recipient_read", (q) => q.eq("recipientId", member._id).eq("read", false))
            .take(1000)
        const unreadByConversation = new Map<string, number>()
        for (const n of unreadDms) {
            if (n.type === "dm_received" && n.conversationId) {
                unreadByConversation.set(n.conversationId, (unreadByConversation.get(n.conversationId) ?? 0) + 1)
            }
        }

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

            return {
                ...conv,
                otherMember: otherMember ? { ...otherMember, user: otherUser } : null,
                lastMessage,
                unreadCount: unreadByConversation.get(conv._id) ?? 0,
            }
        }))
    }
})