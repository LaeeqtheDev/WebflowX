import { v, ConvexError } from "convex/values"
import { mutation, internalMutation, MutationCtx } from "./_generated/server"
import { auth } from "./auth"

// Fixed-window limiter stored in the database, so it holds across every server instance.
// Returns false (and writes nothing) once the limit is hit.
export async function consume(ctx: MutationCtx, key: string, max: number, windowMs: number): Promise<boolean> {
    const now = Date.now()
    const row = await ctx.db
        .query("rateLimits")
        .withIndex("by_key", (q) => q.eq("key", key))
        .unique()

    if (!row) {
        await ctx.db.insert("rateLimits", { key, windowStart: now, count: 1 })
        return true
    }
    if (now - row.windowStart >= windowMs) {
        await ctx.db.patch(row._id, { windowStart: now, count: 1 })
        return true
    }
    if (row.count >= max) return false
    await ctx.db.patch(row._id, { count: row.count + 1 })
    return true
}

// Limits for the Next.js API routes. The caller can only spend their own quota.
const BUCKETS: Record<string, { max: number; windowMs: number }> = {
    "ai-summary": { max: 10, windowMs: 60_000 },
    "ai-editor": { max: 20, windowMs: 60_000 },
    deepgram: { max: 10, windowMs: 60_000 },
    livekit: { max: 20, windowMs: 60_000 },
    moderate: { max: 60, windowMs: 60_000 },
}

export const hit = mutation({
    args: { bucket: v.string() },
    handler: async (ctx, args) => {
        const userId = await auth.getUserId(ctx)
        if (!userId) throw new ConvexError("Unauthorized")
        const cfg = BUCKETS[args.bucket]
        if (!cfg) throw new ConvexError("Unknown bucket")
        return await consume(ctx, `${args.bucket}:${userId}`, cfg.max, cfg.windowMs)
    },
})


// Throws a friendly error when a signed-in user is doing something too often (spam / abuse guard).
export async function throttle(
    ctx: MutationCtx,
    userId: string,
    bucket: string,
    max: number,
    windowMs: number,
    what = "doing that"
): Promise<void> {
    if (!(await consume(ctx, `${bucket}:${userId}`, max, windowMs))) {
        throw new ConvexError(`You're ${what} too quickly. Please wait a moment and try again.`)
    }
}

// Limiter rows are only useful while their window is open; drop the old ones so the table doesn't grow forever.
export const prune = internalMutation({
    args: {},
    handler: async (ctx) => {
        const cutoff = Date.now() - 24 * 60 * 60 * 1000
        const rows = await ctx.db.query("rateLimits").take(500)
        let removed = 0
        for (const row of rows) {
            if (row.windowStart < cutoff) {
                await ctx.db.delete(row._id)
                removed++
            }
        }
        return removed
    },
})
