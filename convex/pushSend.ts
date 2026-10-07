"use node"
import { v } from "convex/values"
import { internalAction } from "./_generated/server"
import { internal } from "./_generated/api"
import webpush from "web-push"

// Sends one notification to every device the person has subscribed. Quietly does nothing when push isn't configured.
export const send = internalAction({
    args: { notificationId: v.id("notifications") },
    handler: async (ctx, args): Promise<void> => {
        const pub = process.env.VAPID_PUBLIC_KEY
        const priv = process.env.VAPID_PRIVATE_KEY
        if (!pub || !priv) return
        const p = await ctx.runMutation(internal.push.prepare, { notificationId: args.notificationId })
        if (!p) return

        webpush.setVapidDetails("mailto:support@northfoundry.co", pub, priv)
        const dead: string[] = []
        await Promise.all(
            p.subs.map(async (s) => {
                try {
                    await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.authKey } }, p.payload, { TTL: 3600, urgency: "normal" })
                } catch (err) {
                    const code = (err as { statusCode?: number }).statusCode
                    if (code === 404 || code === 410) dead.push(s.endpoint)
                }
            })
        )
        if (dead.length) await ctx.runMutation(internal.push.removeEndpoints, { endpoints: dead })
    },
})
