import { v, ConvexError } from "convex/values";
import { mutation, query } from './_generated/server';
import { auth } from './auth';
import { checkLimit, getPlan, PLANS } from './limits';

const generateCode = () => {
    const alphabet = "0123456789abcdefghijklmnopqrstuvwxyz"
    const bytes = new Uint8Array(6)
    crypto.getRandomValues(bytes)
    return Array.from(bytes, (b) => alphabet[b % alphabet.length]).join("")
}

export const create = mutation({
    args: {
        name: v.string(),
    },
    handler: async (ctx, args) => {
        const userId = await auth.getUserId(ctx);
        if (!userId) throw new Error("Unauthorized");

        // Workspace limit: counted per owner, using the best plan among the workspaces they own
        const owned = await ctx.db
            .query("workspaces")
            .withIndex("by_user_id", (q) => q.eq("userId", userId))
            .collect()
        if (owned.length > 0) {
            const bestLimit = owned.reduce((best, w) => {
                const limit = PLANS[getPlan(w.plan)].workspaces
                if (best === -1 || limit === -1) return -1
                return Math.max(best, limit)
            }, 0)
            if (bestLimit !== -1 && owned.length >= bestLimit) {
                const topPlan = owned
                    .map((w) => getPlan(w.plan))
                    .sort((a, b) => PLANS[b].price - PLANS[a].price)[0]
                throw new ConvexError(`LIMIT_REACHED:workspaces:${bestLimit}:${topPlan}`)
            }
        }

        const joinCode = generateCode()

        const workSpaceId = await ctx.db.insert("workspaces", {
            name: args.name,
            userId,
            joinCode
        })

        await ctx.db.insert("members", {
            userId,
            workspaceId: workSpaceId,
            role: 'admin'
        })

        await ctx.db.insert("channels", {
            name: "general",
            workspaceId: workSpaceId
        })

        return workSpaceId;
    }
})

export const get = query({
    args: {},
    handler: async (ctx) => {
        const userId = await auth.getUserId(ctx);
        if (!userId) return [];

        const members = await ctx.db.query("members")
            .withIndex("byUserId", q => q.eq("userId", userId)).collect();

        const workSpaceIds = members.map((member) => member.workspaceId)
        const workspaces = []

        for (const workspaceId of workSpaceIds) {
            const workspace = await ctx.db.get(workspaceId)
            if (workspace) workspaces.push(workspace)
        }
        return workspaces;
    }
})

export const getById = query({
    args: { id: v.id("workspaces") },
    handler: async (ctx, args) => {
        const userId = await auth.getUserId(ctx);
        if (!userId) throw new Error("Unauthorized");

        const member = await ctx.db
            .query("members")
            .withIndex("byWorkspaceId_user_id", (q) =>
                q.eq("workspaceId", args.id).eq("userId", userId)
            ).unique();

        if (!member) return null

        return await ctx.db.get(args.id)
    }
})

export const update = mutation({
    args: {
        id: v.id("workspaces"),
        name: v.string()
    },
    handler: async (ctx, args) => {
        const userId = await auth.getUserId(ctx);
        if (!userId) throw new Error("Unauthorized");

        const member = await ctx.db
            .query("members")
            .withIndex("byWorkspaceId_user_id", (q) =>
                q.eq("workspaceId", args.id).eq("userId", userId)
            ).unique()

        if (!member || member.role !== "admin") throw new Error("Unauthorized");

        await ctx.db.patch(args.id, { name: args.name })
        return args.id;
    }
})

export const remove = mutation({
    args: { id: v.id("workspaces") },
    handler: async (ctx, args) => {
        const userId = await auth.getUserId(ctx);
        if (!userId) throw new Error("Unauthorized");

        const member = await ctx.db
            .query("members")
            .withIndex("byWorkspaceId_user_id", (q) =>
                q.eq("workspaceId", args.id).eq("userId", userId)
            ).unique()

        if (!member || member.role !== "admin") throw new Error("Unauthorized");

        const [members, channels, conversations, messages, reactions] = await Promise.all([
            ctx.db.query("members").withIndex("byWorkspaceId", (q) => q.eq("workspaceId", args.id)).collect(),
            ctx.db.query("channels").withIndex("byWorkspaceId", (q) => q.eq("workspaceId", args.id)).collect(),
            ctx.db.query("conversations").withIndex("byWorkspaceId", (q) => q.eq("workspaceId", args.id)).collect(),
            ctx.db.query("messages").withIndex("byWorkspaceId", (q) => q.eq("workspaceId", args.id)).collect(),
            ctx.db.query("reactions").withIndex("byWorkspaceId", (q) => q.eq("workspaceId", args.id)).collect(),
        ])

        const [tasks, sprints, notes, docs, meetings] = await Promise.all([
            ctx.db.query("tasks").withIndex("by_workspace_id", (q) => q.eq("workspaceId", args.id)).collect(),
            ctx.db.query("sprints").withIndex("by_workspace_id", (q) => q.eq("workspaceId", args.id)).collect(),
            ctx.db.query("notes").withIndex("by_workspace_id", (q) => q.eq("workspaceId", args.id)).collect(),
            ctx.db.query("docs").withIndex("by_workspace_id", (q) => q.eq("workspaceId", args.id)).collect(),
            ctx.db.query("meetings").withIndex("by_workspace_id", (q) => q.eq("workspaceId", args.id)).collect(),
        ])

        for (const task of tasks) {
            const comments = await ctx.db
                .query("taskComments")
                .withIndex("by_task_id", (q) => q.eq("taskId", task._id))
                .collect()
            for (const c of comments) await ctx.db.delete(c._id)
            await ctx.db.delete(task._id)
        }
        for (const sprint of sprints) await ctx.db.delete(sprint._id)
        for (const note of notes) await ctx.db.delete(note._id)
        for (const doc of docs) await ctx.db.delete(doc._id)
        for (const meeting of meetings) await ctx.db.delete(meeting._id)

        for (const m of members) {
            const notifications = await ctx.db
                .query("notifications")
                .withIndex("by_recipient", (q) => q.eq("recipientId", m._id))
                .collect()
            for (const n of notifications) await ctx.db.delete(n._id)
        }

        for (const member of members) await ctx.db.delete(member._id)
        for (const channel of channels) await ctx.db.delete(channel._id)
        for (const conversation of conversations) await ctx.db.delete(conversation._id)
        for (const message of messages) {
            for (const fileId of [message.image, message.file]) {
                if (fileId) {
                    try { await ctx.storage.delete(fileId) } catch { /* already gone */ }
                }
            }
            await ctx.db.delete(message._id)
        }
        for (const reaction of reactions) await ctx.db.delete(reaction._id)

        await ctx.db.delete(args.id)
        return args.id;
    }
})

export const newJoinCode = mutation({
    args: {
        workspaceId: v.id("workspaces"),
        // optional: code stops working after this many days (omit for no expiry)
        expiresInDays: v.optional(v.number()),
    },
    handler: async (ctx, args) => {
        const userId = await auth.getUserId(ctx);
        if (!userId) throw new Error("Unauthorized");

        const member = await ctx.db
            .query("members")
            .withIndex("byWorkspaceId_user_id", (q) =>
                q.eq("workspaceId", args.workspaceId).eq("userId", userId)
            ).unique()

        if (!member || member.role !== "admin") throw new Error("Unauthorized");

        const joinCode = generateCode()
        const days = args.expiresInDays && args.expiresInDays > 0 ? Math.min(args.expiresInDays, 365) : undefined
        await ctx.db.patch(args.workspaceId, {
            joinCode,
            joinCodeExpiresAt: days ? Date.now() + days * 24 * 60 * 60 * 1000 : undefined,
        })
        return args.workspaceId;
    }
})

export const setInvitesDisabled = mutation({
    args: { workspaceId: v.id("workspaces"), disabled: v.boolean() },
    handler: async (ctx, args) => {
        const userId = await auth.getUserId(ctx);
        if (!userId) throw new ConvexError("Unauthorized");

        const member = await ctx.db
            .query("members")
            .withIndex("byWorkspaceId_user_id", (q) =>
                q.eq("workspaceId", args.workspaceId).eq("userId", userId)
            ).unique()

        if (!member || member.role !== "admin") throw new ConvexError("Only admins can change invite settings");

        await ctx.db.patch(args.workspaceId, { invitesDisabled: args.disabled })
        return args.workspaceId;
    }
})

export const join = mutation({
    args: {
        joinCode: v.string(),
        workspaceId: v.id("workspaces")
    },
    handler: async (ctx, args) => {
        const userId = await auth.getUserId(ctx);
        if (!userId) throw new ConvexError("Please sign in to join this workspace");

        const workspace = await ctx.db.get(args.workspaceId)
        if (!workspace) throw new ConvexError("This workspace no longer exists");

        const existingMember = await ctx.db.query("members")
            .withIndex("byWorkspaceId_user_id", (q) =>
                q.eq("workspaceId", args.workspaceId).eq("userId", userId)).unique()

        // joining a workspace you're already in just takes you there
        if (existingMember) return workspace._id;

        if (workspace.invitesDisabled) {
            throw new ConvexError("Invites are turned off for this workspace. Ask an admin to turn them on.");
        }
        if (workspace.joinCode !== args.joinCode.trim().toLowerCase()) {
            throw new ConvexError("That code isn't right. Check it and try again.");
        }
        if (workspace.joinCodeExpiresAt && workspace.joinCodeExpiresAt < Date.now()) {
            throw new ConvexError("This invite code has expired. Ask an admin for a new one.");
        }

        // Check member limit
        const existingMembers = await ctx.db
            .query("members")
            .withIndex("byWorkspaceId", (q) => q.eq("workspaceId", workspace._id))
            .collect()

        const { allowed, limit, plan } = await checkLimit(
            ctx, workspace._id, "members", existingMembers.length
        )

        if (!allowed) {
            throw new ConvexError(`LIMIT_REACHED:members:${limit}:${plan}`)
        }

        await ctx.db.insert("members", {
            userId,
            workspaceId: workspace._id,
            role: "member"
        })

        return workspace._id;
    }
})

export const getInfoById = query({
    args: { id: v.id("workspaces") },
    handler: async (ctx, args) => {
        const workspace = await ctx.db.get(args.id)
        if (!workspace) return null

        const userId = await auth.getUserId(ctx)
        let isMember = false

        if (userId) {
            const member = await ctx.db
                .query("members")
                .withIndex("byWorkspaceId_user_id", (q) =>
                    q.eq("workspaceId", args.id).eq("userId", userId)
                ).unique()
            isMember = !!member
        }

        return {
            name: workspace.name,
            isMember,
            invitesOpen:
                !workspace.invitesDisabled &&
                !(workspace.joinCodeExpiresAt && workspace.joinCodeExpiresAt < Date.now()),
        }
    }
})