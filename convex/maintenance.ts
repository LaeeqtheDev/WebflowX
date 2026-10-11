import { internalMutation } from "./_generated/server"
import { internal } from "./_generated/api"
import { v } from "convex/values"

/**
 * One-off: sign every user out everywhere.
 *
 * Deletes every sign-in session, its refresh tokens and the two-factor "passed" markers, so every browser
 * and installed app has to sign in again. Run it once after the move to webflowx.northfoundry.co:
 *
 *   npx convex run maintenance:signEveryoneOut
 *
 * It works through 200 sessions at a time and schedules itself again until none are left.
 */
export const signEveryoneOut = internalMutation({
    args: {},
    handler: async (ctx) => {
        const sessions = await ctx.db.query("authSessions").take(200)
        for (const s of sessions) {
            const tokens = await ctx.db.query("authRefreshTokens").withIndex("sessionId", (q) => q.eq("sessionId", s._id)).collect()
            for (const t of tokens) await ctx.db.delete(t._id)
            const marks = await ctx.db.query("twoFactorSessions").withIndex("by_session_id", (q) => q.eq("sessionId", s._id)).collect()
            for (const m of marks) await ctx.db.delete(m._id)
            await ctx.db.delete(s._id)
        }
        if (sessions.length === 200) await ctx.scheduler.runAfter(0, internal.maintenance.signEveryoneOut, {})
        return sessions.length
    },
})

/**
 * One-off after deploying the thread-summary fields: store each thread's reply count and last reply on its parent
 * message, so message lists stop reading replies. Safe to run again.
 *
 *   npx convex run maintenance:backfillThreads
 *
 * Works through 100 messages at a time and schedules itself again until none are left.
 */
export const backfillThreads = internalMutation({
    args: { cursor: v.optional(v.string()) },
    handler: async (ctx, args) => {
        const page = await ctx.db.query("messages").paginate({ numItems: 100, cursor: args.cursor ?? null });
        for (const m of page.page) {
            if (m.parentMessagesId || m.threadCount !== undefined) continue;
            const last = await ctx.db.query("messages").withIndex("by_parent_message_id", (q) => q.eq("parentMessagesId", m._id)).order("desc").first();
            if (!last) continue;
            const rows = await ctx.db.query("messages").withIndex("by_parent_message_id", (q) => q.eq("parentMessagesId", m._id)).take(2000);
            await ctx.db.patch(m._id, { threadCount: rows.length, threadLastAt: last._creationTime, threadLastMemberId: last.memberId });
        }
        if (!page.isDone) await ctx.scheduler.runAfter(0, internal.maintenance.backfillThreads, { cursor: page.continueCursor });
        return page.page.length;
    },
});
