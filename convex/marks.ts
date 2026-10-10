import { v, ConvexError } from "convex/values"
import { mutation, query, QueryCtx, MutationCtx } from "./_generated/server"
import { Doc, Id } from "./_generated/dataModel"
import { auth } from "./auth"
import { canViewChannel, assert2fa } from "./permissions"
import { snippetOf } from "./validate"
import { throttle } from "./rateLimit"
import { authorLabel, memberLabel } from "./messageHelpers"

const MAX_PINS_PER_ROOM = 50
const MAX_SAVED = 300

// The caller's membership, if they are allowed to see this message (channel access, or part of the DM).
async function memberFor(ctx: QueryCtx | MutationCtx, userId: Id<"users">, message: Doc<"messages">) {
    const member = await ctx.db
        .query("members")
        .withIndex("byWorkspaceId_user_id", (q) => q.eq("workspaceId", message.workspaceId).eq("userId", userId))
        .unique()
        if (member) await assert2fa(ctx, member)
    if (!member) return null
    if (message.channelId && !(await canViewChannel(ctx, message.channelId, userId))) return null
    if (message.conversationId) {
        const conv = await ctx.db.get(message.conversationId)
        if (!conv || (member.role === "guest" || (conv.memberOneId !== member._id && conv.memberTwoId !== member._id))) return null
    }
    return member
}

// Pin or unpin. Anyone who can open the channel (or is in the DM) can do it.
export const togglePin = mutation({
    args: { messageId: v.id("messages") },
    handler: async (ctx, args) => {
        const userId = await auth.getUserId(ctx)
        if (!userId) throw new ConvexError("Please sign in")
        const message = await ctx.db.get(args.messageId)
        if (!message) throw new ConvexError("That message no longer exists")
        const member = await memberFor(ctx, userId, message)
        if (!member) throw new ConvexError("You can't do that here")
        // a thread reply lives inside its parent, so pin the parent message instead
        if (message.parentMessagesId) throw new ConvexError("Pin the main message, not a reply")

        const existing = await ctx.db.query("pins").withIndex("by_message_id", (q) => q.eq("messageId", args.messageId)).first()
        if (existing) {
            await ctx.db.delete(existing._id)
            return { pinned: false }
        }
        await throttle(ctx, userId, "pin", 30, 60_000, "pinning")
        const room = message.channelId
            ? await ctx.db.query("pins").withIndex("by_channel_id", (q) => q.eq("channelId", message.channelId)).take(MAX_PINS_PER_ROOM + 1)
            : await ctx.db.query("pins").withIndex("by_conversation_id", (q) => q.eq("conversationId", message.conversationId)).take(MAX_PINS_PER_ROOM + 1)
        if (room.length >= MAX_PINS_PER_ROOM) throw new ConvexError(`You can pin up to ${MAX_PINS_PER_ROOM} messages here. Unpin one first.`)
        await ctx.db.insert("pins", {
            workspaceId: message.workspaceId,
            channelId: message.channelId,
            conversationId: message.conversationId,
            messageId: message._id,
            pinnedBy: member._id,
        })
        return { pinned: true }
    },
})

// Save for later (private to you) or remove from the list.
export const toggleSave = mutation({
    args: { messageId: v.id("messages") },
    handler: async (ctx, args) => {
        const userId = await auth.getUserId(ctx)
        if (!userId) throw new ConvexError("Please sign in")
        const message = await ctx.db.get(args.messageId)
        if (!message) throw new ConvexError("That message no longer exists")
        const member = await memberFor(ctx, userId, message)
        if (!member) throw new ConvexError("You can't do that here")

        const existing = await ctx.db
            .query("savedMessages")
            .withIndex("by_member_message", (q) => q.eq("memberId", member._id).eq("messageId", args.messageId))
            .first()
        if (existing) {
            await ctx.db.delete(existing._id)
            return { saved: false }
        }
        await throttle(ctx, userId, "save", 60, 60_000, "saving messages")
        const mine = await ctx.db.query("savedMessages").withIndex("by_member_id", (q) => q.eq("memberId", member._id)).take(MAX_SAVED + 1)
        if (mine.length >= MAX_SAVED) throw new ConvexError(`You can save up to ${MAX_SAVED} messages. Remove some first.`)
        await ctx.db.insert("savedMessages", { workspaceId: message.workspaceId, memberId: member._id, messageId: message._id })
        return { saved: true }
    },
})

// Ids used to light up the pin / save buttons: everything pinned in this workspace and what you saved.
export const mine = query({
    args: { workspaceId: v.id("workspaces") },
    handler: async (ctx, args) => {
        const userId = await auth.getUserId(ctx)
        if (!userId) return { pinned: [] as Id<"messages">[], saved: [] as Id<"messages">[] }
        const member = await ctx.db
            .query("members")
            .withIndex("byWorkspaceId_user_id", (q) => q.eq("workspaceId", args.workspaceId).eq("userId", userId))
            .unique()
        if (member) await assert2fa(ctx, member)
        if (!member) return { pinned: [], saved: [] }
        const [pins, saved] = await Promise.all([
            ctx.db.query("pins").withIndex("by_workspace_id", (q) => q.eq("workspaceId", args.workspaceId)).take(500),
            ctx.db.query("savedMessages").withIndex("by_member_id", (q) => q.eq("memberId", member._id)).take(MAX_SAVED),
        ])
        return { pinned: pins.map((p) => p.messageId), saved: saved.map((s) => s.messageId) }
    },
})

async function describe(ctx: QueryCtx, message: Doc<"messages">) {
    const author = await authorLabel(ctx, message)
    let where = ""
    if (message.channelId) {
        const ch = await ctx.db.get(message.channelId)
        where = ch ? `#${ch.name}` : ""
    } else if (message.conversationId) {
        where = "Direct message"
    }
    return {
        messageId: message._id,
        body: snippetOf(message.body, 400),
        authorName: author.name,
        authorImage: author.image,
        createdAt: message._creationTime,
        channelId: message.channelId,
        conversationId: message.conversationId,
        parentMessageId: message.parentMessagesId,
        where,
    }
}

// Pinned messages for one channel or DM.
export const pinned = query({
    args: { channelId: v.optional(v.id("channels")), conversationId: v.optional(v.id("conversations")) },
    handler: async (ctx, args) => {
        const userId = await auth.getUserId(ctx)
        if (!userId || !args.channelId === !args.conversationId) return []
        const rows = args.channelId
            ? await ctx.db.query("pins").withIndex("by_channel_id", (q) => q.eq("channelId", args.channelId)).order("desc").take(MAX_PINS_PER_ROOM)
            : await ctx.db.query("pins").withIndex("by_conversation_id", (q) => q.eq("conversationId", args.conversationId)).order("desc").take(MAX_PINS_PER_ROOM)
        const out = []
        for (const p of rows) {
            const message = await ctx.db.get(p.messageId)
            if (!message) continue
            // the same access check as reading the message
            if (!(await memberFor(ctx, userId, message))) return []
            out.push({ ...(await describe(ctx, message)), pinnedByName: await memberLabel(ctx, p.pinnedBy) })
        }
        return out
    },
})

// Your saved messages in this workspace, newest saved first. Messages you can no longer open are left out.
export const savedList = query({
    args: { workspaceId: v.id("workspaces") },
    handler: async (ctx, args) => {
        const userId = await auth.getUserId(ctx)
        if (!userId) return []
        const member = await ctx.db
            .query("members")
            .withIndex("byWorkspaceId_user_id", (q) => q.eq("workspaceId", args.workspaceId).eq("userId", userId))
            .unique()
        if (member) await assert2fa(ctx, member)
        if (!member) return []
        const rows = await ctx.db.query("savedMessages").withIndex("by_member_id", (q) => q.eq("memberId", member._id)).order("desc").take(MAX_SAVED)
        const out = []
        for (const r of rows) {
            if (r.workspaceId !== args.workspaceId) continue
            const message = await ctx.db.get(r.messageId)
            if (!message || !(await memberFor(ctx, userId, message))) continue
            const d = await describe(ctx, message)
            let otherMemberId: Id<"members"> | undefined
            if (message.conversationId) {
                const conv = await ctx.db.get(message.conversationId)
                if (conv) otherMemberId = conv.memberOneId === member._id ? conv.memberTwoId : conv.memberOneId
            }
            out.push({ ...d, memberId: otherMemberId })
        }
        return out
    },
})
