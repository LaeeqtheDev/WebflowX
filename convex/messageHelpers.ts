import { QueryCtx, MutationCtx } from "./_generated/server";
import { Id, Doc } from "./_generated/dataModel";
import { ConvexError } from "convex/values";
import { canAccessChannel, hasPermission, assert2fa } from "./permissions";
import { snippetOf } from "./validate";
import { release } from "./files";
import { notify } from "./notifications";

// Helpers shared by the message queries and mutations (mentions, populating rows, cascade delete).
// @mentions are stored in the message body as text ops with attributes.mention = memberId
export const extractMentionIds = (body: string): string[] => {
    try {
        const parsed = JSON.parse(body);
        const ops: unknown[] = Array.isArray(parsed) ? parsed : (parsed?.ops ?? []);
        const ids = new Set<string>();
        for (const op of ops) {
            const id = (op as { attributes?: { mention?: unknown } })?.attributes?.mention;
            if (typeof id === "string" && id) ids.add(id);
        }
        return Array.from(ids).slice(0, 20);
    } catch {
        return [];
    }
};

export const notifyMentions = async (
    ctx: MutationCtx,
    opts: {
        workspaceId: Id<"workspaces">;
        senderId: Id<"members">;
        messageId: Id<"messages">;
        channelId?: Id<"channels">;
        body: string;
        alreadyNotified: Set<string>;
    }
) => {
    // DMs already notify the other person; mentions are for channels and channel threads
    if (!opts.channelId) return;
    const channel = await ctx.db.get(opts.channelId);
    const workspace = await ctx.db.get(opts.workspaceId);
    if (!channel || !workspace) return;
    const ids = extractMentionIds(opts.body);

    // @everyone / @channel: ping everyone who can open this channel (only for roles allowed to)
    if (ids.includes("everyone")) {
        const sender = await ctx.db.get(opts.senderId);
        if (sender && hasPermission(workspace, sender, "mentionEveryone")) {
            const everyone = await ctx.db
                .query("members")
                .withIndex("byWorkspaceId", (q) => q.eq("workspaceId", opts.workspaceId))
                .take(500);
            for (const target of everyone) {
                if (target._id === opts.senderId || opts.alreadyNotified.has(target._id)) continue;
                if (!canAccessChannel(workspace, target, channel)) continue;
                opts.alreadyNotified.add(target._id);
                await notify(ctx, {
                    workspaceId: opts.workspaceId,
                    recipientId: target._id,
                    senderId: opts.senderId,
                    type: "mention",
                    messageId: opts.messageId,
                    channelId: opts.channelId,
                    body: snippetOf(opts.body),
                    read: false,
                }, { email: false }); // @everyone: in-app only, no mass email
            }
        }
    }

    for (const raw of ids) {
        if (raw === "everyone") continue;
        const id = ctx.db.normalizeId("members", raw);
        if (!id || id === opts.senderId || opts.alreadyNotified.has(id)) continue;
        const target = await ctx.db.get(id);
        if (!target || target.workspaceId !== opts.workspaceId) continue;
        if (!canAccessChannel(workspace, target, channel)) continue; // can't see the channel, so no ping
        opts.alreadyNotified.add(id);
        await notify(ctx, {
            workspaceId: opts.workspaceId,
            recipientId: id,
            senderId: opts.senderId,
            type: "mention",
            messageId: opts.messageId,
            channelId: opts.channelId,
            body: opts.body,
            read: false,
        });
    }
};

export const populateUser = (ctx: QueryCtx, userId: Id<"users">) => {
    return ctx.db.get(userId);
};

export const populateMember = (ctx: QueryCtx, memberId: Id<"members">) => {
    return ctx.db.get(memberId);
};

export const populateReactions = (ctx: QueryCtx, messageId: Id<"messages">) => {
    return ctx.db
        .query("reactions")
        .withIndex("by_message_id", (q) => q.eq("messageId", messageId))
        .collect();
};

export const populateThread = async (ctx: QueryCtx, messageId: Id<"messages">) => {
    // newest reply first; the count is capped so a huge thread can't make every list load slow
    const recent = await ctx.db
        .query("messages")
        .withIndex("by_parent_message_id", (q) =>
            q.eq("parentMessagesId", messageId)
        )
        .order("desc")
        .take(200);

    if (recent.length === 0) {
        return { count: 0, image: undefined, timestamp: 0, name: "" };
    }

    const lastMessage = recent[0];
    const lastMessageMember = await populateMember(ctx, lastMessage.memberId);

    if (!lastMessageMember) {
        const former = formerAuthor(lastMessage);
        if (!former) return { count: 0, image: undefined, timestamp: 0, name: "" };
        return { count: recent.length, image: former.user.image, timestamp: lastMessage._creationTime, name: former.user.name };
    }

    const lastMessageUser = await populateUser(ctx, lastMessageMember.userId);

    return {
        count: recent.length,
        image: lastMessageUser?.image,
        timestamp: lastMessage._creationTime,
        name: lastMessageUser?.name,
    };
};

export const getMember = async (
    ctx: QueryCtx,
    workspaceId: Id<"workspaces">,
    userId: Id<"users">
) => {
    const member = await ctx.db
        .query("members")
        .withIndex("byWorkspaceId_user_id", (q) =>
            q.eq("workspaceId", workspaceId).eq("userId", userId)
        )
        .unique();
    if (member) await assert2fa(ctx, member);
    return member;
};

// Deletes a message together with its reactions, thread replies and stored files.
export const deleteMessageCascade = async (
    ctx: MutationCtx,
    message: Doc<"messages">
) => {
    const replies = await ctx.db
        .query("messages")
        .withIndex("by_parent_message_id", (q) =>
            q.eq("parentMessagesId", message._id)
        )
        .take(500);
    for (const reply of replies) {
        await deleteMessageCascade(ctx, reply);
    }

    const reactions = await ctx.db
        .query("reactions")
        .withIndex("by_message_id", (q) => q.eq("messageId", message._id))
        .take(500);
    for (const reaction of reactions) await ctx.db.delete(reaction._id);

    // pins and saved copies of this message go with it
    const pins = await ctx.db.query("pins").withIndex("by_message_id", (q) => q.eq("messageId", message._id)).take(500);
    for (const pin of pins) await ctx.db.delete(pin._id);
    const saves = await ctx.db.query("savedMessages").withIndex("by_message_id", (q) => q.eq("messageId", message._id)).take(500);
    for (const save of saves) await ctx.db.delete(save._id);
    const attached = await ctx.db.query("attachments").withIndex("by_message_id", (q) => q.eq("messageId", message._id)).take(500);
    for (const a of attached) await ctx.db.delete(a._id);

    for (const fileId of [message.image, message.file]) {
        if (fileId) await release(ctx, fileId);
    }

    await ctx.db.delete(message._id);
};

// A message whose author has left: show it under the name and photo they had, marked as a former member.
export const formerAuthor = (message: Doc<"messages">) => {
    if (!message.removedAuthor) return null;
    const member = { _id: message.memberId, _creationTime: message._creationTime, workspaceId: message.workspaceId, userId: "" as Id<"users">, role: "member" as const } as Doc<"members">;
    const user = { _id: "" as Id<"users">, _creationTime: message._creationTime, name: `${message.removedAuthor.name} (former member)`, image: message.removedAuthor.image } as Doc<"users">;
    return { member, user };
};

// The name and photo to show for whoever wrote a message, wherever it is listed (saved, pinned, threads, search).
// Someone who has left shows under the name they had, marked as a former member; never "Unknown".
export const authorLabel = async (ctx: QueryCtx, message: Doc<"messages">) => {
    const member = await ctx.db.get(message.memberId);
    const user = member ? await ctx.db.get(member.userId) : null;
    if (user) return { name: user.name ?? "Member", image: user.image, former: false };
    const former = formerAuthor(message);
    return { name: former?.user.name ?? "Former member", image: former?.user.image, former: true };
};

// Same, for someone who did something other than write the message (pinned it, replied last).
export const memberLabel = async (ctx: QueryCtx, memberId: Id<"members">) => {
    const member = await ctx.db.get(memberId);
    const user = member ? await ctx.db.get(member.userId) : null;
    return user ? (user.name ?? "Member") : "Former member";
};
