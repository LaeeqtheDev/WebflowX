import { v } from 'convex/values';
import { mutation, query } from './_generated/server';
import { auth } from './auth';
import { checkLimit } from './limits';

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
    args: { workspaceId: v.id("workspaces") },
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
        await ctx.db.patch(args.workspaceId, { joinCode })
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
        if (!userId) throw new Error("Unauthorized");

        const workspace = await ctx.db.get(args.workspaceId)
        if (!workspace) throw new Error("Workspace not found");

        if (workspace.joinCode !== args.joinCode.toLowerCase()) {
            throw new Error("Invalid join code");
        }

        const existingMember = await ctx.db.query("members")
            .withIndex("byWorkspaceId_user_id", (q) =>
                q.eq("workspaceId", args.workspaceId).eq("userId", userId)).unique()

        if (existingMember) throw new Error("Already a member of this workspace");

        // Check member limit
        const existingMembers = await ctx.db
            .query("members")
            .withIndex("byWorkspaceId", (q) => q.eq("workspaceId", workspace._id))
            .collect()

        const { allowed, limit, plan } = await checkLimit(
            ctx, workspace._id, "members", existingMembers.length
        )

        if (!allowed) {
            throw new Error(`LIMIT_REACHED:members:${limit}:${plan}`)
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
        }
    }
})