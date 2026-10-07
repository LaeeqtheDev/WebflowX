import { v, ConvexError } from "convex/values"
import { mutation, query, internalMutation } from "./_generated/server"
import { auth } from "./auth"
import { canAccessChannel } from "./permissions"
import { consume } from "./rateLimit"
import { deltaToText } from "./validate"

const MAX_DEVICES = 10

// The browser needs the public key to subscribe. Null means push isn't set up on this deployment.
export const config = query({
    args: {},
    handler: async () => ({ publicKey: process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY ? process.env.VAPID_PUBLIC_KEY : null }),
})

// How many of my devices are subscribed (the page also checks its own browser).
export const mine = query({
    args: {},
    handler: async (ctx) => {
        const userId = await auth.getUserId(ctx)
        if (!userId) return { devices: 0 }
        const subs = await ctx.db.query("pushSubscriptions").withIndex("by_user_id", (q) => q.eq("userId", userId)).take(MAX_DEVICES + 1)
        return { devices: subs.length }
    },
})

export const subscribe = mutation({
    args: { endpoint: v.string(), p256dh: v.string(), authKey: v.string() },
    handler: async (ctx, args) => {
        const userId = await auth.getUserId(ctx)
        if (!userId) throw new ConvexError("Please sign in")
        if (!/^https:\/\//.test(args.endpoint) || args.endpoint.length > 1000 || args.p256dh.length > 200 || args.authKey.length > 100) {
            throw new ConvexError("That browser sent an invalid subscription")
        }
        if (!(await consume(ctx, `push-sub:${userId}`, 20, 60 * 60_000))) throw new ConvexError("Too many attempts. Try again later.")

        const existing = await ctx.db.query("pushSubscriptions").withIndex("by_endpoint", (q) => q.eq("endpoint", args.endpoint)).first()
        if (existing) {
            await ctx.db.patch(existing._id, { userId, p256dh: args.p256dh, authKey: args.authKey })
        } else {
            const mineSubs = await ctx.db.query("pushSubscriptions").withIndex("by_user_id", (q) => q.eq("userId", userId)).take(MAX_DEVICES + 1)
            // keep the newest devices; drop the oldest beyond the cap
            if (mineSubs.length >= MAX_DEVICES) await ctx.db.delete(mineSubs[0]._id)
            await ctx.db.insert("pushSubscriptions", { userId, endpoint: args.endpoint, p256dh: args.p256dh, authKey: args.authKey })
        }
        await ctx.db.patch(userId, { pushNotifications: true })
        return null
    },
})

export const unsubscribe = mutation({
    args: { endpoint: v.optional(v.string()) },
    handler: async (ctx, args) => {
        const userId = await auth.getUserId(ctx)
        if (!userId) throw new ConvexError("Please sign in")
        if (args.endpoint) {
            const sub = await ctx.db.query("pushSubscriptions").withIndex("by_endpoint", (q) => q.eq("endpoint", args.endpoint!)).first()
            if (sub && sub.userId === userId) await ctx.db.delete(sub._id)
        }
        return null
    },
})

const clip = (s: string, n: number) => (s.length > n ? s.slice(0, n - 1).trimEnd() + "…" : s)

// Decides whether this notification should buzz the person's devices and builds the message.
export const prepare = internalMutation({
    args: { notificationId: v.id("notifications") },
    handler: async (ctx, args) => {
        const n = await ctx.db.get(args.notificationId)
        if (!n || n.read) return null
        const recipient = await ctx.db.get(n.recipientId)
        if (!recipient) return null
        const user = await ctx.db.get(recipient.userId)
        if (!user || user.pushNotifications === false) return null

        // they are looking at the app right now; the in-app badge is enough
        const presence = await ctx.db.query("presence").withIndex("by_user_id", (q) => q.eq("userId", user._id)).unique()
        if (presence && Date.now() - presence.lastSeen < 45_000) return null

        const subs = await ctx.db.query("pushSubscriptions").withIndex("by_user_id", (q) => q.eq("userId", user._id)).take(MAX_DEVICES)
        if (subs.length === 0) return null

        const workspace = await ctx.db.get(n.workspaceId)
        if (!workspace) return null
        let liveBody = n.body
        if (n.messageId) {
            const m = await ctx.db.get(n.messageId)
            if (!m) return null
            liveBody = m.body
        }
        if (n.taskId && !(await ctx.db.get(n.taskId))) return null
        const channel = n.channelId ? await ctx.db.get(n.channelId) : null
        if (channel && !canAccessChannel(workspace, recipient, channel)) return null

        if (!(await consume(ctx, `push:${user._id}`, 30, 60 * 60_000))) return null

        const sender = await ctx.db.get(n.senderId)
        const senderUser = sender ? await ctx.db.get(sender.userId) : null
        const name = senderUser?.name ?? "Someone"
        const where = channel ? ` in #${channel.name}` : ""
        const isMessage = n.type === "mention" || n.type === "dm_received" || n.type === "thread_reply"
        const text = clip(isMessage ? deltaToText(liveBody ?? "") : (liveBody ?? ""), 140)
        const base = `/dashboard/workspace/${n.workspaceId}`

        let title: string, url: string
        switch (n.type) {
            case "mention": title = `${name} mentioned you${where}`; url = channel ? `${base}/channel/${channel._id}` : base; break
            case "dm_received": title = name; url = `${base}/member/${n.senderId}`; break
            case "thread_reply": title = `${name} replied${where}`; url = channel ? `${base}/channel/${channel._id}` : `${base}/member/${n.senderId}`; break
            case "task_assigned": title = `${name} assigned you a task`; url = `${base}/tasks`; break
            case "task_comment": title = `${name} commented on your task`; url = `${base}/tasks`; break
            case "task_due": title = "Task due soon"; url = `${base}/tasks`; break
            default: return null
        }
        return {
            subs: subs.map((s) => ({ endpoint: s.endpoint, p256dh: s.p256dh, authKey: s.authKey })),
            payload: JSON.stringify({ title: clip(title, 80), body: text || workspace.name, url, tag: `${n.type}:${n.channelId ?? n.conversationId ?? n.taskId ?? n.senderId}` }),
        }
    },
})

// A device that unsubscribed or was uninstalled answers 404/410; forget it.
export const removeEndpoints = internalMutation({
    args: { endpoints: v.array(v.string()) },
    handler: async (ctx, args) => {
        for (const endpoint of args.endpoints) {
            const sub = await ctx.db.query("pushSubscriptions").withIndex("by_endpoint", (q) => q.eq("endpoint", endpoint)).first()
            if (sub) await ctx.db.delete(sub._id)
        }
    },
})
