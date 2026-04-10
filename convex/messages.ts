import { v } from "convex/values";
import { mutation, query, QueryCtx } from "./_generated/server";
import { auth } from "./auth";
import { Id, Doc } from "./_generated/dataModel";
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
        .withIndex("by_message_id", (q) => q.eq("messageId", messageId)).collect()
}

const populateThread = async (ctx: QueryCtx, messageId: Id<"messages">) => {
    const messages = await ctx.db
        .query("messages").withIndex("by_parent_message_id", (q) =>
            q.eq("parentMessagesId", messageId)).collect()

    if (messages.length === 0) {
        return { count: 0, Image: undefined, timestamp: 0, name: "" }
    }

    const lastMessage = messages[messages.length - 1];
    const lastMessageMember = await populateMember(ctx, lastMessage.memberId)

    if (!lastMessageMember) {
        return { count: 0, image: undefined, timestamp: 0, name: "" }
    }

    const lastMessageUser = await populateUser(ctx, lastMessageMember.userId)

    return {
        count: messages.length,
        image: lastMessageUser?.image,
        timestamp: lastMessage._creationTime,
        name: lastMessageUser?.name
    }
}

export const getMember = async (
    ctx: QueryCtx,
    workspaceId: Id<"workspaces">,
    userId: Id<"users">
) => {
    return ctx.db.query("members")
        .withIndex("byWorkspaceId_user_id", (q) =>
            q.eq("workspaceId", workspaceId).eq("userId", userId)).unique()
}

export const get = query({
    args: {
        channelId: v.optional(v.id("channels")),
        conversationId: v.optional(v.id("conversations")),
        parentMessageId: v.optional(v.id("messages")),
        paginationOpts: paginationOptsValidator
    },
    handler: async (ctx, args) => {
        const userId = await auth.getUserId(ctx)
        if (!userId) throw new Error("Unauthorized")

        let _conversationId = args.conversationId;

        if (!args.conversationId && !args.channelId && args.parentMessageId) {
            const parentMessage = await ctx.db.get(args.parentMessageId)
            if (!parentMessage) throw new Error("Parent Message not found")
            _conversationId = parentMessage.conversationId
        }

        const results = await ctx.db
            .query("messages")
            .withIndex("by_channel_id_parent_message_id_conversation_id", (q) =>
                q.eq("channelId", args.channelId)
                    .eq("parentMessagesId", args.parentMessageId)
                    .eq("conversationId", _conversationId)
            ).order("desc").paginate(args.paginationOpts)

        return {
            ...results,
            page: (
                await Promise.all(
                    results.page.map(async (message) => {
                        const member = await populateMember(ctx, message.memberId)
                        const user = member ? await populateUser(ctx, member.userId) : null;

                        if (!member || !user) return null

                        const reactions = await populateReactions(ctx, message._id);
                        const thread = await populateThread(ctx, message._id)
                        const image = message.image ? await ctx.storage.getUrl(message.image) : undefined

                        const reactionsWithCount = reactions.map((reaction) => ({
                            ...reaction,
                            count: reactions.filter((r) => r.value === reaction.value).length
                        }));

                        const dudupedReactions = reactionsWithCount.reduce(
                            (acc, reaction) => {
                                const existingReaction = acc.find((r) => r.value === reaction.value);
                                if (existingReaction) {
                                    existingReaction.memberIds = Array.from(
                                        new Set([...existingReaction.memberIds, reaction.memberId])
                                    )
                                } else {
                                    acc.push({ ...reaction, memberIds: [reaction.memberId] })
                                }
                                return acc;
                            },
                            [] as (Doc<"reactions"> & { count: number; memberIds: Id<"members">[] })[]
                        );

                        return {
                            ...message,
                            image,
                            member,
                            user,
                            reactions: dudupedReactions.map(({ memberId, ...rest }) => rest),
                            threadCount: thread.count,
                            threadImage: thread.Image,
                            threadName: thread.name,
                            threadTimestamp: thread.timestamp,
                        }
                    })
                )
            ).filter((message) => message !== null)
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
        if (!userId) throw new Error("Unauthorized")

        const member = await getMember(ctx, args.workspaceId, userId)
        if (!member) throw new Error("Unauthorized")

        let _conversationId = args.conversationId

        if (!args.conversationId && !args.channelId && args.parentMessageId) {
            const parentMessage = await ctx.db.get(args.parentMessageId)
            if (!parentMessage) throw new Error("Parent Message not found")
            _conversationId = parentMessage.conversationId
        }

        const messageId = await ctx.db.insert("messages", {
            memberId: member._id,
            body: args.body,
            image: args.image,
            channelId: args.channelId,
            workspaceId: args.workspaceId,
            conversationId: _conversationId,
            parentMessagesId: args.parentMessageId,
        })

        console.log("=== MESSAGE CREATED ===")
        console.log("messageId:", messageId)
        console.log("parentMessageId:", args.parentMessageId)
        console.log("member._id:", member._id)
        console.log("channelId:", args.channelId)
        console.log("conversationId:", _conversationId)

        // Thread reply notification
        if (args.parentMessageId) {
            const parentMessage = await ctx.db.get(args.parentMessageId)
            console.log("=== THREAD REPLY CHECK ===")
            console.log("parentMessage found:", !!parentMessage)
            console.log("parentMessage.memberId:", parentMessage?.memberId)
            console.log("sender member._id:", member._id)
            console.log("same member?", parentMessage?.memberId === member._id)

            if (parentMessage && parentMessage.memberId !== member._id) {
                const notifId = await ctx.db.insert("notifications", {
                    workspaceId: args.workspaceId,
                    recipientId: parentMessage.memberId,
                    senderId: member._id,
                    type: "thread_reply",
                    messageId,
                    channelId: args.channelId,
                    conversationId: _conversationId,
                    body: args.body,
                    read: false,
                })
                console.log("Thread reply notification created:", notifId)
            } else {
                console.log("Thread reply notification SKIPPED - same member or no parent")
            }
        }

        // DM notification
        if (_conversationId && !args.parentMessageId) {
            const conversation = await ctx.db.get(_conversationId)
            console.log("=== DM CHECK ===")
            console.log("conversation found:", !!conversation)

            if (conversation) {
                const recipientId = conversation.memberOneId === member._id
                    ? conversation.memberTwoId
                    : conversation.memberOneId

                console.log("recipientId:", recipientId)
                console.log("same as sender?", recipientId === member._id)

                if (recipientId !== member._id) {
                    const notifId = await ctx.db.insert("notifications", {
                        workspaceId: args.workspaceId,
                        recipientId,
                        senderId: member._id,
                        type: "dm_received",
                        messageId,
                        conversationId: _conversationId,
                        body: args.body,
                        read: false,
                    })
                    console.log("DM notification created:", notifId)
                }
            }
        }

        return messageId;
    }
})

export const update = mutation({
    args: {
        id: v.id("messages"),
        body: v.string(),
    },
    handler: async (ctx, args) => {
        const userId = await auth.getUserId(ctx);
        if (!userId) throw new Error("Unauthorized")

        const message = await ctx.db.get(args.id);
        if (!message) throw new Error("Message not found")

        const member = await getMember(ctx, message.workspaceId, userId)
        if (!member || member._id !== message.memberId) throw new Error("Unauthorized")

        await ctx.db.patch(args.id, { body: args.body, updatedAt: Date.now() })
        return args.id;
    }
})

export const remove = mutation({
    args: { id: v.id("messages") },
    handler: async (ctx, args) => {
        const userId = await auth.getUserId(ctx);
        if (!userId) throw new Error("Unauthorized")

        const message = await ctx.db.get(args.id);
        if (!message) throw new Error("Message not found")

        const member = await getMember(ctx, message.workspaceId, userId)
        if (!member || member._id !== message.memberId) throw new Error("Unauthorized")

        await ctx.db.delete(args.id)
        return args.id;
    }
})

export const getById = query({
    args: { id: v.id("messages") },
    handler: async (ctx, args) => {
        const userId = await auth.getUserId(ctx)
        if (!userId) return null

        const message = await ctx.db.get(args.id)
        if (!message) return null

        const currentMember = await getMember(ctx, message.workspaceId, userId)
        if (!currentMember) return null

        const member = await populateMember(ctx, message.memberId)
        if (!member) return null;

        const user = await populateUser(ctx, member.userId)
        if (!user) return null

        const reactions = await populateReactions(ctx, message._id)

        const reactionsWithCount = reactions.map((reaction) => ({
            ...reaction,
            count: reactions.filter((r) => r.value === reaction.value).length
        }));

        const dudupedReactions = reactionsWithCount.reduce(
            (acc, reaction) => {
                const existingReaction = acc.find((r) => r.value === reaction.value);
                if (existingReaction) {
                    existingReaction.memberIds = Array.from(
                        new Set([...existingReaction.memberIds, reaction.memberId])
                    )
                } else {
                    acc.push({ ...reaction, memberIds: [reaction.memberId] })
                }
                return acc;
            },
            [] as (Doc<"reactions"> & { count: number; memberIds: Id<"members">[] })[]
        );

        return {
            ...message,
            image: message.image ? await ctx.storage.getUrl(message.image) : undefined,
            user,
            member,
            reactions: dudupedReactions.map(({ memberId, ...rest }) => rest)
        }
    }
})

export const search = query({
    args: {
        workspaceId: v.id("workspaces"),
        query: v.string(),
    },
    handler: async (ctx, args) => {
        const userId = await auth.getUserId(ctx)
        if (!userId) return []

        const member = await ctx.db
            .query("members")
            .withIndex("byWorkspaceId_user_id", (q) =>
                q.eq("workspaceId", args.workspaceId).eq("userId", userId)
            ).unique()

        if (!member) return []

        return await ctx.db
            .query("messages")
            .withSearchIndex("search_body", (q) =>
                q.search("body", args.query).eq("workspaceId", args.workspaceId)
            )
            .take(10)
    }
})