import { v } from "convex/values";
import { mutation, query, QueryCtx } from "./_generated/server";
import { auth } from "./auth";
import { Id } from "./_generated/dataModel";
import { paginationOptsValidator } from "convex/server";



const populateUser = (ctx: QueryCtx, userId: Id<"users">) => {
     return ctx.db.get(userId)

}

const populateMember = (ctx: QueryCtx, memberId: Id<"members">) => {
    return ctx.db.get(memberId)
}

const populateReactions = (ctx: QueryCtx, messageId: Id<"messages">) => {
    return ctx.db
    .query("reactions")
    .withIndex("by_message_id", (q)=> q.eq("messageId",messageId)).collect()

}

const populateThread = async (ctx: QueryCtx, messageId: Id<"messages">) => {
    const messages = await ctx.db
    .query("messages").withIndex("by_parent_message_id", (q)=> 
    q.eq("parentMessagesId", messageId)).collect()

    if(messages.length === 0){
        return {
            count: 0,
            Image: undefined,
            timestamp: 0,
        }
    }

    const lastMessage = messages[messages.length -1];
    const lastMessageMember = await populateMember(ctx, lastMessage.memberId)

    if(!lastMessageMember){
        return{
            count: 0,
            image: undefined,
            timestamp: 0,
        }
    }

    const lastMessageUser = await populateUser(ctx, lastMessageMember.userId)

    return{
        count: messages.length,
        image: lastMessageUser?.image,
        timestamp: lastMessage._creationTime,
    }
}

export const getMember = async(
    ctx: QueryCtx,
    workspaceId: Id<"workspaces">,
    userId: Id<"users">
) => {
    return ctx.db.query("members")
    .withIndex("byWorkspaceId_user_id", (q)=> 
    q.eq("workspaceId", workspaceId).eq("userId", userId)).unique()
}


export const get = query({
    args: {
        channelId: v.optional(v.id("channels")),
        conversationId: v.optional(v.id("conversations")),
        parentMessageId: v.optional(v.id("messages")),
        paginationOptions: paginationOptsValidator
    },
    handler:async (ctx, args) => {
        const userId = await auth.getUserId(ctx)

        if(!userId){
            throw new Error("Unauthorized")
        }

        let _conversationId= await args.conversationId;

        if(!args.channelId && args.channelId && args.parentMessageId){
            const parentMessage = await ctx.db.get(args.parentMessageId);

            if(!parentMessage){
                throw new Error("Parent Message not found")
                _conversationId = parentMessage?.conversationId
            }

            const results = await ctx.db
            .query("messages")
            .withIndex("by_channel_id_parent_message_id_conversation_id", (q)=> 
            q.eq("channelId", args.channelId)
            .eq("parentMessagesId",args.parentMessageId)
            .eq("conversationId", _conversationId)
            ).order("desc").paginate(args.paginationOptions)
            return results;
        }
        
    }
})

export const create = mutation({
    args: {
        body: v.string(),
        image: v.optional(v.id("_storage")),
        workspaceId: v.id("workspaces"),
        channelId: v.optional(v.id("channels")),
        conversationId: v.optional(v.id("conversations")),
        parentMessageId: v.optional(v.id("messages"))
    },
    handler: async (ctx, args) => {
        const userId = await auth.getUserId(ctx);
        
        if(!userId){
            throw new Error("Unauthorized")
        }

        const member = await getMember(ctx, args.workspaceId, userId)

        if(!member){
            throw new Error("Unauthorized")
        }


        let _conversationId= args.conversationId

        if(!args.conversationId && !args.channelId && args.parentMessageId){
            const parentMessage = await ctx.db.get(args.parentMessageId)

            if(!parentMessage) {
                throw new Error("Parent Message not found")
            }

            _conversationId = parentMessage.conversationId
        } 

        const messageId = await ctx.db.insert("messages",{
            memberId: member._id,
            body: args.body,
            image: args.image,
            channelId: args.channelId,
            workspaceId: args.workspaceId,
            conversationId: _conversationId,
            parentMessagesId: args.parentMessageId,
            updatedAt: Date.now(),
        })

        return messageId;
    }
})