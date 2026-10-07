import { mutation, query, internalMutation } from "./_generated/server";
import { internal } from "./_generated/api";
import { v, ConvexError } from "convex/values";
import { Id } from "./_generated/dataModel";
import { auth } from "./auth";
import { checkLimit } from "./limits"
import { deleteMessageCascade } from "./messages"
import { canAccessChannel, requireActor, requirePermission, hasPermission } from "./permissions"
import { logAudit } from "./audit"
import { MAX, text } from "./validate"
import { throttle } from "./rateLimit"

const cleanName = (raw: string) => {
    const name = raw.trim().replace(/\s+/g, "-").toLowerCase().replace(/[^a-z0-9\-_À-￿]/g, "")
    if (!name) throw new ConvexError("Give the channel a name")
    if (name.length > 60) throw new ConvexError("Channel names can be at most 60 characters")
    return name
}

// Channels the caller is allowed to see (locked channels are hidden from everyone else).
export const get = query({
    args: {
        workspaceId: v.id("workspaces")
    },
    handler: async (ctx, args) => {
        const userId = await auth.getUserId(ctx);
        if (!userId) return [];

        const member = await ctx.db
            .query("members")
            .withIndex("byWorkspaceId_user_id", (q) =>
                q.eq("workspaceId", args.workspaceId).eq("userId", userId)).unique()
        if (!member) return [];
        const workspace = await ctx.db.get(args.workspaceId)
        if (!workspace) return [];

        const channels = await ctx.db.query("channels")
            .withIndex("byWorkspaceId", (q) =>
                q.eq("workspaceId", args.workspaceId))
            .take(500)

        return channels.filter((c) => canAccessChannel(workspace, member, c))
    }
})

export const create = mutation({
    args: {
        name: v.string(),
        workspaceId: v.id("workspaces"),
        isPrivate: v.optional(v.boolean()),
        // for locked channels: who else is let in (you are always added)
        memberIds: v.optional(v.array(v.id("members"))),
        // announcement channel: everyone reads, only allowed roles post
        readOnly: v.optional(v.boolean()),
    },
    handler: async (ctx, args) => {
        const { member, userId } = await requirePermission(ctx, args.workspaceId, "createChannels", "You don't have permission to create channels")
        await throttle(ctx, userId, "channel-create", 20, 60 * 60_000, "creating channels")

        const parseName = cleanName(args.name)

        const existingChannels = await ctx.db
            .query("channels")
            .withIndex("byWorkspaceId", (q) => q.eq("workspaceId", args.workspaceId))
            .take(1000)

        if (existingChannels.some((c) => c.name === parseName)) {
            throw new ConvexError("A channel with that name already exists")
        }

        const { allowed, limit, plan } = await checkLimit(
            ctx, args.workspaceId, "channels", existingChannels.length
        )

        if (!allowed) {
            throw new ConvexError(`LIMIT_REACHED:channels:${limit}:${plan}`)
        }

        let memberIds: Id<"members">[] | undefined
        if (args.isPrivate) {
            const ids = new Set<Id<"members">>([member._id])
            for (const id of (args.memberIds ?? []).slice(0, 500)) {
                const m = await ctx.db.get(id)
                if (m && m.workspaceId === args.workspaceId) ids.add(id)
            }
            memberIds = Array.from(ids)
        }

        const channelId = await ctx.db.insert("channels", {
            name: parseName,
            workspaceId: args.workspaceId,
            isPrivate: args.isPrivate ? true : undefined,
            memberIds,
            readOnly: args.readOnly ? true : undefined,
        })
        await logAudit(ctx, args.workspaceId, member._id, args.isPrivate ? "channel.create_private" : "channel.create", `#${parseName}`)
        return channelId;
    }
})

export const getById = query({
    args: {
        id: v.id("channels")
    },
    handler: async (ctx, args) => {
        const userId = await auth.getUserId(ctx);
        if (!userId) return null;

        const channel = await ctx.db.get(args.id);
        if (!channel) return null;

        const member = await ctx.db
            .query("members")
            .withIndex("byWorkspaceId_user_id", (q) =>
                q.eq("workspaceId", channel.workspaceId).eq("userId", userId)).unique()
        if (!member) return null;
        const workspace = await ctx.db.get(channel.workspaceId)
        if (!workspace || !canAccessChannel(workspace, member, channel)) return null;
        return channel;
    }
})

export const update = mutation({
    args: {
        id: v.id("channels"),
        name: v.optional(v.string()),
        description: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const channel = await ctx.db.get(args.id);
        if (!channel) throw new ConvexError("Channel not found");
        const { member } = await requirePermission(ctx, channel.workspaceId, "manageChannels", "You don't have permission to edit channels")

        const patch: { name?: string; description?: string } = {}
        if (args.name !== undefined) {
            const name = cleanName(args.name)
            const clash = await ctx.db
                .query("channels")
                .withIndex("byWorkspaceId", (q) => q.eq("workspaceId", channel.workspaceId))
                .filter((q) => q.and(q.eq(q.field("name"), name), q.neq(q.field("_id"), args.id)))
                .first()
            if (clash) throw new ConvexError("A channel with that name already exists")
            patch.name = name
        }
        if (args.description !== undefined) patch.description = text(args.description, MAX.channelDescription, "Description")

        await ctx.db.patch(args.id, patch)
        await logAudit(ctx, channel.workspaceId, member._id, "channel.update", `#${patch.name ?? channel.name}`)
        return args.id
    }
})

// Lock / unlock a channel and choose who is in it.
export const setAccess = mutation({
    args: {
        id: v.id("channels"),
        isPrivate: v.boolean(),
        memberIds: v.optional(v.array(v.id("members"))),
    },
    handler: async (ctx, args) => {
        const channel = await ctx.db.get(args.id);
        if (!channel) throw new ConvexError("Channel not found");
        const { member } = await requirePermission(ctx, channel.workspaceId, "manageChannels", "You don't have permission to lock channels")

        let memberIds: Id<"members">[] | undefined
        if (args.isPrivate) {
            const ids = new Set<Id<"members">>((args.memberIds ?? channel.memberIds ?? []).slice(0, 500))
            ids.add(member._id)
            const valid: Id<"members">[] = []
            for (const id of ids) {
                const m = await ctx.db.get(id)
                if (m && m.workspaceId === channel.workspaceId) valid.push(id)
            }
            memberIds = valid
        }
        await ctx.db.patch(args.id, { isPrivate: args.isPrivate ? true : undefined, memberIds })
        await logAudit(ctx, channel.workspaceId, member._id, args.isPrivate ? "channel.lock" : "channel.unlock", `#${channel.name}`)
        return args.id
    }
})

// Choose which guests can open this channel. Guests can open nothing else.
export const setGuests = mutation({
    args: { id: v.id("channels"), guestIds: v.array(v.id("members")) },
    handler: async (ctx, args) => {
        const channel = await ctx.db.get(args.id);
        if (!channel) throw new ConvexError("Channel not found");
        const { member } = await requirePermission(ctx, channel.workspaceId, "manageChannels", "You don't have permission to change who can open this channel")
        const valid: Id<"members">[] = []
        for (const id of new Set(args.guestIds.slice(0, 200))) {
            const m = await ctx.db.get(id)
            if (m && m.workspaceId === channel.workspaceId && m.role === "guest") valid.push(id)
        }
        await ctx.db.patch(args.id, { guestIds: valid })
        await logAudit(ctx, channel.workspaceId, member._id, "channel.guests", `#${channel.name}: ${valid.length} guest${valid.length === 1 ? "" : "s"}`)
        return args.id
    }
})

// Turn announcement mode on or off: everyone can read, only roles with "post in read-only channels" can write.
export const setReadOnly = mutation({
    args: { id: v.id("channels"), readOnly: v.boolean() },
    handler: async (ctx, args) => {
        const channel = await ctx.db.get(args.id);
        if (!channel) throw new ConvexError("Channel not found");
        const { member } = await requirePermission(ctx, channel.workspaceId, "manageChannels", "You don't have permission to change channels")
        await ctx.db.patch(args.id, { readOnly: args.readOnly ? true : undefined })
        await logAudit(ctx, channel.workspaceId, member._id, args.readOnly ? "channel.readonly_on" : "channel.readonly_off", `#${channel.name}`)
        return args.id
    }
})

// People who can open a locked channel by being added to it (for the channel settings screen).
export const getMembers = query({
    args: { id: v.id("channels") },
    handler: async (ctx, args) => {
        const channel = await ctx.db.get(args.id)
        if (!channel) return []
        const { member, workspace } = await requireActor(ctx, channel.workspaceId)
        if (!canAccessChannel(workspace, member, channel)) return []
        const out = []
        for (const id of channel.memberIds ?? []) {
            const m = await ctx.db.get(id)
            const u = m ? await ctx.db.get(m.userId) : null
            if (m && u) out.push({ ...m, user: u })
        }
        return out
    }
})

// Deleting a channel with a lot of history can't fit in one transaction. The channel disappears right away
// (nobody can open it any more) and its messages are cleaned up in small batches in the background.
export const remove = mutation({
    args: {
        id: v.id("channels"),
    },
    handler: async (ctx, args) => {
        const channel = await ctx.db.get(args.id);
        if (!channel) throw new ConvexError("Channel not found");
        const { member, workspace } = await requireActor(ctx, channel.workspaceId)
        if (!hasPermission(workspace, member, "manageChannels")) throw new ConvexError("You don't have permission to delete channels")

        await ctx.db.delete(args.id)
        await ctx.scheduler.runAfter(0, internal.channels.purgeMessages, { channelId: args.id })
        await logAudit(ctx, channel.workspaceId, member._id, "channel.delete", `#${channel.name}`)
        return args.id
    }
})

export const purgeMessages = internalMutation({
    args: { channelId: v.id("channels") },
    handler: async (ctx, args) => {
        const BATCH = 50
        const messages = await ctx.db
            .query("messages")
            .withIndex("by_channel_id", (q) => q.eq("channelId", args.channelId))
            .take(BATCH)
        // top-level messages cascade to their replies; replies already removed by an earlier cascade are skipped
        for (const message of messages) {
            const stillThere = await ctx.db.get(message._id)
            if (stillThere) await deleteMessageCascade(ctx, stillThere)
        }
        if (messages.length === BATCH) {
            await ctx.scheduler.runAfter(0, internal.channels.purgeMessages, { channelId: args.channelId })
        }
    },
})
