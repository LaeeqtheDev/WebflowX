// ONE-OFF TOOL for resetting the demo deployment down to a single workspace and a single user.
// Everything here is an internal function: it cannot be called from the app or the browser, only from
// `npx convex run` or the dashboard's Functions panel. Do not use it on a deployment holding real customer data.
//
// Order: preview (read-only) -> wipe (needs the word DELETE) -> rename.
import { v, ConvexError } from "convex/values"
import { internal } from "./_generated/api"
import { internalMutation, internalQuery } from "./_generated/server"

const MAX_USERS = 200

export const preview = internalQuery({
    args: { keepWorkspaceId: v.id("workspaces"), keepUserId: v.id("users") },
    handler: async (ctx, args) => {
        const keepWorkspace = await ctx.db.get(args.keepWorkspaceId)
        const keepUser = await ctx.db.get(args.keepUserId)
        if (!keepWorkspace) throw new ConvexError("keepWorkspaceId does not exist")
        if (!keepUser) throw new ConvexError("keepUserId does not exist")

        const workspaces = await ctx.db.query("workspaces").take(500)
        const deleteWorkspaces = []
        for (const w of workspaces) {
            if (w._id === args.keepWorkspaceId) continue
            const owner = await ctx.db.get(w.userId)
            const members = await ctx.db.query("members").withIndex("byWorkspaceId", (q) => q.eq("workspaceId", w._id)).take(1000)
            deleteWorkspaces.push({ id: w._id, name: w.name, plan: w.plan ?? "free", owner: owner?.email ?? null, members: members.length })
        }

        const users = await ctx.db.query("users").take(MAX_USERS + 1)
        const deleteUsers = users
            .filter((u) => u._id !== args.keepUserId)
            .map((u) => ({ id: u._id, email: u.email ?? null, name: u.name ?? null }))

        const keptMembers = await ctx.db.query("members").withIndex("byWorkspaceId", (q) => q.eq("workspaceId", args.keepWorkspaceId)).take(1000)
        const removeFromKept = []
        for (const m of keptMembers) {
            if (m.userId === args.keepUserId) continue
            const u = await ctx.db.get(m.userId)
            removeFromKept.push({ memberId: m._id, email: u?.email ?? null })
        }

        return {
            keeping: { workspace: keepWorkspace.name, ownerIsKeptUser: keepWorkspace.userId === args.keepUserId, user: keepUser.email ?? null },
            willDeleteWorkspaces: deleteWorkspaces,
            willDeleteUsers: deleteUsers,
            willRemoveFromKeptWorkspace: removeFromKept,
            tooManyUsersForOneRun: users.length > MAX_USERS,
        }
    },
})

export const wipe = internalMutation({
    args: {
        keepWorkspaceId: v.id("workspaces"),
        keepUserId: v.id("users"),
        confirm: v.literal("DELETE"),
    },
    handler: async (ctx, args) => {
        const keepWorkspace = await ctx.db.get(args.keepWorkspaceId)
        if (!keepWorkspace) throw new ConvexError("keepWorkspaceId does not exist")
        if (keepWorkspace.userId !== args.keepUserId) throw new ConvexError("The kept user must own the kept workspace")

        // 1. every other workspace: cut off access, then the existing purge removes the data in batches
        const workspaces = await ctx.db.query("workspaces").take(500)
        let workspacesQueued = 0
        for (const w of workspaces) {
            if (w._id === args.keepWorkspaceId) continue
            await ctx.db.patch(w._id, { invitesDisabled: true })
            const members = await ctx.db.query("members").withIndex("byWorkspaceId", (q) => q.eq("workspaceId", w._id)).take(500)
            for (const m of members) await ctx.db.delete(m._id)
            await ctx.scheduler.runAfter(0, internal.workspaces.purge, { id: w._id })
            workspacesQueued++
        }

        // 2. the kept workspace: remove everyone except the kept user, with their messages and the rest
        const keptMembers = await ctx.db.query("members").withIndex("byWorkspaceId", (q) => q.eq("workspaceId", args.keepWorkspaceId)).take(1000)
        let membersRemoved = 0
        for (const m of keptMembers) {
            if (m.userId === args.keepUserId) continue
            await ctx.db.delete(m._id)
            await ctx.scheduler.runAfter(0, internal.members.cleanupRemoved, { memberId: m._id, workspaceId: args.keepWorkspaceId })
            membersRemoved++
        }

        // 3. every other user, with their sign-in records
        const users = await ctx.db.query("users").take(MAX_USERS + 1)
        if (users.length > MAX_USERS) throw new ConvexError("More than 200 users: run again after this batch")
        let usersDeleted = 0
        for (const u of users) {
            if (u._id === args.keepUserId) continue

            const accounts = await ctx.db.query("authAccounts").withIndex("userIdAndProvider", (q) => q.eq("userId", u._id)).take(50)
            for (const a of accounts) {
                const codes = await ctx.db.query("authVerificationCodes").withIndex("accountId", (q) => q.eq("accountId", a._id)).take(50)
                for (const c of codes) await ctx.db.delete(c._id)
                await ctx.db.delete(a._id)
            }
            const sessions = await ctx.db.query("authSessions").withIndex("userId", (q) => q.eq("userId", u._id)).take(100)
            for (const s of sessions) {
                const tokens = await ctx.db.query("authRefreshTokens").withIndex("sessionId", (q) => q.eq("sessionId", s._id)).take(100)
                for (const t of tokens) await ctx.db.delete(t._id)
                await ctx.db.delete(s._id)
            }
            for (const row of await ctx.db.query("pushSubscriptions").withIndex("by_user_id", (q) => q.eq("userId", u._id)).take(100)) await ctx.db.delete(row._id)
            for (const row of await ctx.db.query("twoFactorSessions").withIndex("by_user_id", (q) => q.eq("userId", u._id)).take(100)) await ctx.db.delete(row._id)
            for (const row of await ctx.db.query("twoFactor").withIndex("by_user_id", (q) => q.eq("userId", u._id)).take(10)) await ctx.db.delete(row._id)
            for (const row of await ctx.db.query("presence").withIndex("by_user_id", (q) => q.eq("userId", u._id)).take(10)) await ctx.db.delete(row._id)
            for (const row of await ctx.db.query("calendarFeeds").withIndex("by_user_id", (q) => q.eq("userId", u._id)).take(10)) await ctx.db.delete(row._id)

            await ctx.db.delete(u._id)
            usersDeleted++
        }

        return { workspacesQueuedForPurge: workspacesQueued, membersRemovedFromKept: membersRemoved, usersDeleted }
    },
})

export const rename = internalMutation({
    args: {
        workspaceId: v.id("workspaces"),
        name: v.string(),
        description: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const ws = await ctx.db.get(args.workspaceId)
        if (!ws) throw new ConvexError("Workspace not found")
        await ctx.db.patch(args.workspaceId, {
            name: args.name,
            ...(args.description !== undefined ? { description: args.description } : {}),
        })
        return { id: args.workspaceId, name: args.name }
    },
})
