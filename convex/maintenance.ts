import { internalMutation } from "./_generated/server"
import { internal } from "./_generated/api"

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
