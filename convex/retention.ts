import { internalMutation } from "./_generated/server"
import { internal } from "./_generated/api"
import { release } from "./files"

const BATCH = 200

// Messages and reactions from people who left are erased once their retention time is up
// (Free plan: 90 days after they left; paid plans keep them, so they never get a retainUntil).
export const purgeExpired = internalMutation({
    args: {},
    handler: async (ctx) => {
        const now = Date.now()
        let more = false

        const messages = await ctx.db.query("messages").withIndex("by_retain_until", (q) => q.gt("retainUntil", 0).lt("retainUntil", now)).take(BATCH)
        for (const m of messages) {
            for (const fileId of [m.image, m.file]) if (fileId) await release(ctx, fileId)
            const reactions = await ctx.db.query("reactions").withIndex("by_message_id", (q) => q.eq("messageId", m._id)).take(500)
            for (const r of reactions) await ctx.db.delete(r._id)
            await ctx.db.delete(m._id)
        }
        if (messages.length === BATCH) more = true

        const reactions = await ctx.db.query("reactions").withIndex("by_retain_until", (q) => q.gt("retainUntil", 0).lt("retainUntil", now)).take(BATCH)
        for (const r of reactions) await ctx.db.delete(r._id)
        if (reactions.length === BATCH) more = true

        if (more) await ctx.scheduler.runAfter(0, internal.retention.purgeExpired, {})
    },
})
