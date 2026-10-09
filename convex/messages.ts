import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { auth } from "./auth";
import { Id, Doc } from "./_generated/dataModel";
import { paginationOptsValidator, PaginationResult } from "convex/server";
import { ConvexError } from "convex/values";
import { canViewChannel, can, canAccessChannel, hasPermission, assert2fa } from "./permissions";
import { claim } from "./files";
import { assertDeltaBody, snippetOf } from "./validate";
import { throttle } from "./rateLimit";
import { notify } from "./notifications";
import { emit } from "./integrations";
import { historyCutoff } from "./limits";

import {
  extractMentionIds, notifyMentions, populateUser, populateMember, populateReactions, populateThread, getMember, deleteMessageCascade,
} from "./messageHelpers";

export { getMember, deleteMessageCascade };

export const get = query({
    args: {
        channelId: v.optional(v.id("channels")),
        conversationId: v.optional(v.id("conversations")),
        parentMessageId: v.optional(v.id("messages")),
        paginationOpts: paginationOptsValidator,
    },
    handler: async (ctx, args) => {
        const userId = await auth.getUserId(ctx);
        if (!userId) throw new Error("Unauthorized");

        let _conversationId = args.conversationId;

        if (!args.conversationId && !args.channelId && args.parentMessageId) {
            const parentMessage = await ctx.db.get(args.parentMessageId);
            if (!parentMessage) throw new Error("Parent Message not found");
            _conversationId = parentMessage.conversationId;
        }

        // Access control: caller must belong to the workspace that owns the channel / conversation / thread
        let ownerWorkspaceId: Id<"workspaces"> | undefined;
        let conversationForCheck: Doc<"conversations"> | null = null;
        if (args.channelId) {
            const channel = await ctx.db.get(args.channelId);
            ownerWorkspaceId = channel?.workspaceId;
        } else if (_conversationId) {
            conversationForCheck = await ctx.db.get(_conversationId);
            ownerWorkspaceId = conversationForCheck?.workspaceId;
        } else if (args.parentMessageId) {
            const parent = await ctx.db.get(args.parentMessageId);
            ownerWorkspaceId = parent?.workspaceId;
        }
        let allowed = false;
        if (ownerWorkspaceId) {
            const viewer = await getMember(ctx, ownerWorkspaceId, userId);
            allowed =
                !!viewer &&
                (!conversationForCheck ||
                    (viewer.role !== "guest" &&
                        (conversationForCheck.memberOneId === viewer._id ||
                            conversationForCheck.memberTwoId === viewer._id)));
        }

        // locked channels (and threads inside them) are only readable by people with access
        if (allowed) {
            let channelForAccess = args.channelId;
            if (!channelForAccess && args.parentMessageId) {
                channelForAccess = (await ctx.db.get(args.parentMessageId))?.channelId;
            }
            if (channelForAccess && !(await canViewChannel(ctx, channelForAccess, userId))) allowed = false;
        }

        const memberMemo = new Map<string, Promise<Doc<"members"> | null>>();
        const userMemo = new Map<string, Promise<Doc<"users"> | null>>();
        const authorOf = (id: Id<"members">) => {
            if (!memberMemo.has(id)) memberMemo.set(id, populateMember(ctx, id));
            return memberMemo.get(id)!;
        };
        const userOf = (id: Id<"users">) => {
            if (!userMemo.has(id)) userMemo.set(id, populateUser(ctx, id));
            return userMemo.get(id)!;
        };

        // Free workspaces only see the last 90 days
        const cutoff = allowed && ownerWorkspaceId ? historyCutoff((await ctx.db.get(ownerWorkspaceId))?.plan) : null;

        let listing = ctx.db
            .query("messages")
            .withIndex("by_channel_id_parent_message_id_conversation_id", (q) =>
                q
                    .eq("channelId", args.channelId)
                    .eq("parentMessagesId", args.parentMessageId)
                    .eq("conversationId", _conversationId)
            )
            .order("desc");
        if (cutoff !== null) listing = listing.filter((q) => q.gte(q.field("_creationTime"), cutoff));

        const results: PaginationResult<Doc<"messages">> = allowed
            ? await listing.paginate(args.paginationOpts)
            : { page: [], isDone: true, continueCursor: "" };

        return {
            ...results,
            page: (
                await Promise.all(
                    results.page.map(async (message) => {
                        // one author usually wrote many of the messages on screen: look each up once
                        const member = await authorOf(message.memberId);
                        const user = member
                            ? await userOf(member.userId)
                            : null;

                        if (!member || !user) return null;

                        const reactions = await populateReactions(ctx, message._id);
                        const thread = await populateThread(ctx, message._id);
                        const image = message.image
                            ? await ctx.storage.getUrl(message.image)
                            : undefined;

                        // Get file URL if exists
                        const fileUrl = message.file
                            ? await ctx.storage.getUrl(message.file)
                            : undefined;

                        const reactionsWithCount = reactions.map((reaction) => ({
                            ...reaction,
                            count: reactions.filter((r) => r.value === reaction.value)
                                .length,
                        }));

                        const dedupedReactions = reactionsWithCount.reduce(
                            (acc, reaction) => {
                                const existingReaction = acc.find(
                                    (r) => r.value === reaction.value
                                );
                                if (existingReaction) {
                                    existingReaction.memberIds = Array.from(
                                        new Set([
                                            ...existingReaction.memberIds,
                                            reaction.memberId,
                                        ])
                                    );
                                } else {
                                    acc.push({ ...reaction, memberIds: [reaction.memberId] });
                                }
                                return acc;
                            },
                            [] as (Doc<"reactions"> & {
                                count: number;
                                memberIds: Id<"members">[];
                            })[]
                        );

                        return {
                            ...message,
                            image,
                            file: fileUrl,
                            fileName: message.fileName,
                            fileType: message.fileType,
                            fileSize: message.fileSize,
                            member,
                            // integrations post under their own name
                            user: message.integrationName ? { ...user, name: message.integrationName, image: undefined } : user,
                            reactions: dedupedReactions.map(
                                ({ memberId, ...rest }) => rest
                            ),
                            threadCount: thread.count,
                            threadImage: thread.image,
                            threadName: thread.name,
                            threadTimestamp: thread.timestamp,
                        };
                    })
                )
            ).filter((message) => message !== null),
        };
    },
});

export const create = mutation({
    args: {
        body: v.string(),
        image: v.optional(v.id("_storage")),
        file: v.optional(v.id("_storage")),
        fileName: v.optional(v.string()),
        imageName: v.optional(v.string()),
        fileType: v.optional(v.string()),
        fileSize: v.optional(v.number()),
        workspaceId: v.id("workspaces"),
        channelId: v.optional(v.id("channels")),
        conversationId: v.optional(v.id("conversations")),
        parentMessageId: v.optional(v.id("messages")),
    },
    handler: async (ctx, args) => {
        const userId = await auth.getUserId(ctx);
        if (!userId) throw new Error("Unauthorized");

        const member = await getMember(ctx, args.workspaceId, userId);
        if (!member) throw new Error("Unauthorized");

        assertDeltaBody(args.body);
        await throttle(ctx, userId, "msg", 20, 10_000, "sending messages");

        let channelId = args.channelId;
        let _conversationId = args.conversationId;

        // A reply always lives exactly where its parent lives. Whatever channel / conversation the
        // client sent is ignored, so a reply can't be planted in (or read from) a place the sender can't see.
        if (args.parentMessageId) {
            const parent = await ctx.db.get(args.parentMessageId);
            if (!parent || parent.workspaceId !== args.workspaceId)
                throw new Error("Parent Message not found");
            channelId = parent.channelId;
            _conversationId = parent.conversationId;
        }

        // The target must live in this workspace, and DMs only accept their two participants
        if (channelId) {
            const channel = await ctx.db.get(channelId);
            if (!channel || channel.workspaceId !== args.workspaceId)
                throw new Error("Channel not found");
        }
        if (_conversationId) {
            const conv = await ctx.db.get(_conversationId);
            if (!conv || conv.workspaceId !== args.workspaceId)
                throw new Error("Conversation not found");
            if (member.role === "guest" || (conv.memberOneId !== member._id && conv.memberTwoId !== member._id))
                throw new Error("Unauthorized");
        }
        if (!channelId && !_conversationId) throw new Error("Nothing to post to");
        if (channelId && !(await canViewChannel(ctx, channelId, userId))) {
            throw new ConvexError("You don't have access to this channel");
        }

        // announcement channels: only roles allowed to post can start a message (replies in threads are open)
        if (channelId && !args.parentMessageId) {
            const ch = await ctx.db.get(channelId);
            const ws = await ctx.db.get(args.workspaceId);
            if (ch?.readOnly && ws && !hasPermission(ws, member, "postInReadOnly")) {
                throw new ConvexError("This is a read-only channel. Only admins and allowed roles can post here.");
            }
        }

        // attachments must be files this member uploaded to this workspace (type, size and storage cap were checked on upload)
        let fileName = args.fileName, fileType = args.fileType, fileSize = args.fileSize;
        if (args.image) await claim(ctx, args.image, args.workspaceId, userId);
        const imageName = args.image && args.imageName ? args.imageName.replace(/[\u0000-\u001f]/g, "").trim().slice(0, 200) || undefined : undefined;
        if (args.file) {
            const row = await claim(ctx, args.file, args.workspaceId, userId);
            fileType = row.contentType;
            fileSize = row.size;
            fileName = (fileName ?? "file").slice(0, 200);
        } else {
            fileName = undefined; fileType = undefined; fileSize = undefined;
        }

        const messageId = await ctx.db.insert("messages", {
            memberId: member._id,
            body: args.body,
            image: args.image,
            file: args.file,
            fileName,
            imageName,
            fileType,
            fileSize,
            channelId,
            workspaceId: args.workspaceId,
            conversationId: _conversationId,
            parentMessagesId: args.parentMessageId,
        });

        // the Files page lists these
        if (args.image) {
            const row = await ctx.db.query("files").withIndex("by_storage_id", (q) => q.eq("storageId", args.image!)).unique();
            await ctx.db.insert("attachments", {
                workspaceId: args.workspaceId, messageId, memberId: member._id, channelId, conversationId: _conversationId,
                kind: "image", name: imageName ?? "Image", contentType: row?.contentType ?? "image/png", size: row?.size ?? 0, storageId: args.image,
            });
        }
        if (args.file) {
            await ctx.db.insert("attachments", {
                workspaceId: args.workspaceId, messageId, memberId: member._id, channelId, conversationId: _conversationId,
                kind: "file", name: fileName ?? "file", contentType: fileType ?? "application/octet-stream", size: fileSize ?? 0, storageId: args.file,
            });
        }

        const alreadyNotified = new Set<string>();

        // Thread reply notification
        if (args.parentMessageId) {
            const parentMessage = await ctx.db.get(args.parentMessageId);

            if (parentMessage && parentMessage.memberId !== member._id) {
                alreadyNotified.add(parentMessage.memberId);
                const notifId = await notify(ctx, {
                    workspaceId: args.workspaceId,
                    recipientId: parentMessage.memberId,
                    senderId: member._id,
                    type: "thread_reply",
                    messageId,
                    channelId,
                    conversationId: _conversationId,
                    body: args.body,
                    read: false,
                });
            } else {
                console.log(
                    "Thread reply notification SKIPPED - same member or no parent"
                );
            }
        }

        // DM notification
        if (_conversationId && !args.parentMessageId) {
            const conversation = await ctx.db.get(_conversationId);

            if (conversation) {
                const recipientId =
                    conversation.memberOneId === member._id
                        ? conversation.memberTwoId
                        : conversation.memberOneId;


                if (recipientId !== member._id) {
                    const notifId = await notify(ctx, {
                        workspaceId: args.workspaceId,
                        recipientId,
                        senderId: member._id,
                        type: "dm_received",
                        messageId,
                        conversationId: _conversationId,
                        body: args.body,
                        read: false,
                    });
                }
            }
        }

        await notifyMentions(ctx, {
            workspaceId: args.workspaceId,
            senderId: member._id,
            messageId,
            channelId,
            body: args.body,
            alreadyNotified,
        });

        // outgoing webhooks (locked channels only reach hooks an admin opted in)
        if (channelId) {
            const ch = await ctx.db.get(channelId);
            if (ch) {
                await emit(ctx, args.workspaceId, "message.created", async () => ({
                    id: messageId,
                    channelId,
                    channel: ch.name,
                    author: (await ctx.db.get(userId))?.name ?? null,
                    text: snippetOf(args.body, 2000),
                    threadParentId: args.parentMessageId ?? null,
                }), { fromPrivate: !!ch.isPrivate });
            }
        }

        return messageId;
    },
});

export const update = mutation({
    args: {
        id: v.id("messages"),
        body: v.string(),
    },
    handler: async (ctx, args) => {
        const userId = await auth.getUserId(ctx);
        if (!userId) throw new Error("Unauthorized");

        const message = await ctx.db.get(args.id);
        if (!message) throw new Error("Message not found");

        const member = await getMember(ctx, message.workspaceId, userId);
        if (!member || member._id !== message.memberId)
            throw new Error("Unauthorized");

        assertDeltaBody(args.body);
        await throttle(ctx, userId, "msg-edit", 30, 60_000, "editing messages");
        await ctx.db.patch(args.id, { body: args.body, updatedAt: Date.now() });

        // people newly @mentioned by this edit get notified (not the ones already mentioned before)
        await notifyMentions(ctx, {
            workspaceId: message.workspaceId,
            senderId: member._id,
            messageId: args.id,
            channelId: message.channelId,
            body: args.body,
            alreadyNotified: new Set(extractMentionIds(message.body)),
        });
        return args.id;
    },
});

export const remove = mutation({
    args: { id: v.id("messages") },
    handler: async (ctx, args) => {
        const userId = await auth.getUserId(ctx);
        if (!userId) throw new Error("Unauthorized");

        const message = await ctx.db.get(args.id);
        if (!message) throw new Error("Message not found");

        const member = await getMember(ctx, message.workspaceId, userId);
        if (!member) throw new Error("Unauthorized");
        // your own messages, or anyone's channel message if your role may delete others' messages (never DMs)
        const isAuthor = member._id === message.memberId;
        const isModerating =
            !isAuthor && !message.conversationId && (await can(ctx, member, "deleteMessages"));
        if (!isAuthor && !isModerating) throw new Error("Unauthorized");

        await deleteMessageCascade(ctx, message);
        return args.id;
    },
});

export const getById = query({
    args: { id: v.id("messages") },
    handler: async (ctx, args) => {
        const userId = await auth.getUserId(ctx);
        if (!userId) return null;

        const message = await ctx.db.get(args.id);
        if (!message) return null;

        const currentMember = await getMember(ctx, message.workspaceId, userId);
        if (!currentMember) return null;
        if (message.channelId && !(await canViewChannel(ctx, message.channelId, userId))) return null;
        if (message.conversationId) {
            const conv = await ctx.db.get(message.conversationId);
            if (!conv || (currentMember.role === "guest" || (conv.memberOneId !== currentMember._id && conv.memberTwoId !== currentMember._id))) return null;
        }

        const member = await populateMember(ctx, message.memberId);
        if (!member) return null;

        const user = await populateUser(ctx, member.userId);
        if (!user) return null;

        const reactions = await populateReactions(ctx, message._id);

        // Get file URL if exists
        const fileUrl = message.file
            ? await ctx.storage.getUrl(message.file)
            : undefined;

        const reactionsWithCount = reactions.map((reaction) => ({
            ...reaction,
            count: reactions.filter((r) => r.value === reaction.value).length,
        }));

        const dedupedReactions = reactionsWithCount.reduce(
            (acc, reaction) => {
                const existingReaction = acc.find(
                    (r) => r.value === reaction.value
                );
                if (existingReaction) {
                    existingReaction.memberIds = Array.from(
                        new Set([...existingReaction.memberIds, reaction.memberId])
                    );
                } else {
                    acc.push({ ...reaction, memberIds: [reaction.memberId] });
                }
                return acc;
            },
            [] as (Doc<"reactions"> & { count: number; memberIds: Id<"members">[] })[]
        );

        return {
            ...message,
            image: message.image
                ? await ctx.storage.getUrl(message.image)
                : undefined,
            file: fileUrl,
            fileName: message.fileName,
            fileType: message.fileType,
            fileSize: message.fileSize,
            user,
            member,
            reactions: dedupedReactions.map(({ memberId, ...rest }) => rest),
        };
    },
});

export const search = query({
    args: {
        workspaceId: v.id("workspaces"),
        query: v.string(),
    },
    handler: async (ctx, args) => {
        const userId = await auth.getUserId(ctx);
        if (!userId) return [];

        const member = await ctx.db
            .query("members")
            .withIndex("byWorkspaceId_user_id", (q) =>
                q.eq("workspaceId", args.workspaceId).eq("userId", userId)
            )
            .unique()
        if (member) await assert2fa(ctx, member);

        if (!member) return [];

        const workspace = await ctx.db.get(args.workspaceId);
        if (!workspace) return [];

        const found = await ctx.db
            .query("messages")
            .withSearchIndex("search_body", (q) =>
                q.search("body", args.query).eq("workspaceId", args.workspaceId)
            )
            .take(40);
        const searchCutoff = historyCutoff(workspace.plan);

        // never leak locked channels or other people's DMs through search
        const channelOk = new Map<string, boolean>();
        const convOk = new Map<string, boolean>();
        const visible: typeof found = [];
        for (const m of found) {
            if (searchCutoff !== null && m._creationTime < searchCutoff) continue;
            if (m.conversationId) {
                let ok = convOk.get(m.conversationId);
                if (ok === undefined) {
                    const conv = await ctx.db.get(m.conversationId);
                    ok = !!conv && member.role !== "guest" && (conv.memberOneId === member._id || conv.memberTwoId === member._id);
                    convOk.set(m.conversationId, ok);
                }
                if (!ok) continue;
            } else if (m.channelId) {
                let ok = channelOk.get(m.channelId);
                if (ok === undefined) {
                    const ch = await ctx.db.get(m.channelId);
                    ok = !!ch && canAccessChannel(workspace, member, ch);
                    channelOk.set(m.channelId, ok);
                }
                if (!ok) continue;
            }
            visible.push(m);
            if (visible.length >= 10) break;
        }
        return visible;
    },
});