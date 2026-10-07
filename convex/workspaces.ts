import { v, ConvexError } from "convex/values";
import { mutation, query, internalMutation } from './_generated/server';
import { internal } from './_generated/api';
import { consume } from './rateLimit';
import { requireActor, requirePermission, hasPermission, isOwner } from './permissions';
import { logAudit } from './audit';
import { Doc, Id } from './_generated/dataModel';
import { auth } from './auth';
import { assertPhoto, release } from './files';
import { checkLimit, getPlan, PLANS } from './limits';
import { MAX, text } from './validate';
import { throttle } from './rateLimit';

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

        const name = text(args.name, MAX.workspaceName, "Workspace name", { required: true, collapse: true })
        await throttle(ctx, userId, "ws-create", 5, 60 * 60_000, "creating workspaces")

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
            name,
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
            .withIndex("byUserId", q => q.eq("userId", userId)).take(200);

        const workspaces = []
        for (const member of members) {
            const workspace = await ctx.db.get(member.workspaceId)
            if (workspace) {
                const imageUrl = workspace.image ? await ctx.storage.getUrl(workspace.image) : null
                workspaces.push({ ...hideInviteCode(workspace, member), imageUrl })
            }
        }
        return workspaces;
    }
})

// The invite code is only shown to people allowed to invite; everyone else gets an empty string.
const hideInviteCode = (workspace: Doc<"workspaces">, member: Doc<"members">): Doc<"workspaces"> =>
    hasPermission(workspace, member, "invite")
        ? workspace
        : { ...workspace, joinCode: "", joinCodeExpiresAt: undefined }

export const getById = query({
    args: { id: v.id("workspaces") },
    handler: async (ctx, args) => {
        const userId = await auth.getUserId(ctx);
        if (!userId) return null; // signed out (e.g. mid sign-out): nothing to show

        const member = await ctx.db
            .query("members")
            .withIndex("byWorkspaceId_user_id", (q) =>
                q.eq("workspaceId", args.id).eq("userId", userId)
            ).unique();

        if (!member) return null

        const workspace = await ctx.db.get(args.id)
        if (!workspace) return null
        const imageUrl = workspace.image ? await ctx.storage.getUrl(workspace.image) : null
        return { ...hideInviteCode(workspace, member), imageUrl }
    }
})

export const update = mutation({
    args: {
        id: v.id("workspaces"),
        name: v.optional(v.string()),
        description: v.optional(v.string()),
        // new photo (uploaded to storage first) or removeImage to clear it
        image: v.optional(v.id("_storage")),
        removeImage: v.optional(v.boolean()),
    },
    handler: async (ctx, args) => {
        const { member, workspace, userId } = await requirePermission(ctx, args.id, "editWorkspace", "You don't have permission to edit this workspace")

        const patch: { name?: string; description?: string; image?: Id<"_storage"> } = {}
        if (args.name !== undefined) {
            patch.name = text(args.name, MAX.workspaceName, "Workspace name", { required: true, collapse: true })
        }
        if (args.description !== undefined) patch.description = args.description.trim().slice(0, 300)
        if (args.image) {
            await assertPhoto(ctx, args.image, userId)
            patch.image = args.image
        }

        if (args.removeImage || args.image) {
            if (workspace.image && workspace.image !== args.image) await release(ctx, workspace.image)
        }
        await ctx.db.patch(args.id, { ...patch, ...(args.removeImage && !args.image ? { image: undefined } : {}) })
        await logAudit(ctx, args.id, member._id, "workspace.update", [patch.name && `name: ${patch.name}`, args.image && "new photo", args.removeImage && "photo removed", args.description !== undefined && "description"].filter(Boolean).join(", "))
        return args.id;
    }
})

// Hand the workspace to another member (they become owner and admin).
export const transferOwnership = mutation({
    args: { workspaceId: v.id("workspaces"), memberId: v.id("members") },
    handler: async (ctx, args) => {
        const { member, workspace } = await requireActor(ctx, args.workspaceId)
        if (!isOwner(workspace, member)) throw new ConvexError("Only the owner can transfer ownership")
        const target = await ctx.db.get(args.memberId)
        if (!target || target.workspaceId !== args.workspaceId) throw new ConvexError("Member not found")
        if (target._id === member._id) throw new ConvexError("You already own this workspace")

        await ctx.db.patch(args.workspaceId, { userId: target.userId })
        await ctx.db.patch(target._id, { role: "admin" })
        const targetUser = await ctx.db.get(target.userId)
        await logAudit(ctx, args.workspaceId, member._id, "workspace.transfer", `to ${targetUser?.name ?? "a member"}`)
        return args.workspaceId
    }
})

// Deleting a big workspace can't happen in one transaction (Convex caps how much one mutation reads/writes).
// remove() cuts off access straight away, then purge() deletes the data in small batches.
export const remove = mutation({
    args: { id: v.id("workspaces") },
    handler: async (ctx, args) => {
        const userId = await auth.getUserId(ctx);
        if (!userId) throw new ConvexError("Unauthorized");

        const member = await ctx.db
            .query("members")
            .withIndex("byWorkspaceId_user_id", (q) =>
                q.eq("workspaceId", args.id).eq("userId", userId)
            ).unique()

        const ws = await ctx.db.get(args.id)
        if (!member || !ws || ws.userId !== member.userId) throw new ConvexError("Only the workspace owner can delete it");

        // nobody can join or open it from here on
        await ctx.db.patch(args.id, { invitesDisabled: true })
        const members = await ctx.db.query("members").withIndex("byWorkspaceId", (q) => q.eq("workspaceId", args.id)).collect()
        for (const m of members) await ctx.db.delete(m._id)

        await ctx.scheduler.runAfter(0, internal.workspaces.purge, { id: args.id })
        return args.id;
    }
})

const BATCH = 100

export const purge = internalMutation({
    args: { id: v.id("workspaces") },
    handler: async (ctx, args) => {
        let more = false
        const wid = args.id

        const tasks = await ctx.db.query("tasks").withIndex("by_workspace_id", (q) => q.eq("workspaceId", wid)).take(BATCH)
        for (const t of tasks) {
            const comments = await ctx.db.query("taskComments").withIndex("by_task_id", (q) => q.eq("taskId", t._id)).collect()
            for (const c of comments) await ctx.db.delete(c._id)
            await ctx.db.delete(t._id)
        }
        if (tasks.length === BATCH) more = true

        const meetings = await ctx.db.query("meetings").withIndex("by_workspace_id", (q) => q.eq("workspaceId", wid)).take(BATCH)
        for (const m of meetings) {
            const parts = await ctx.db.query("meetingTranscripts").withIndex("by_meeting_id", (q) => q.eq("meetingId", m._id)).collect()
            for (const part of parts) await ctx.db.delete(part._id)
            await ctx.db.delete(m._id)
        }
        if (meetings.length === BATCH) more = true

        const docs = await ctx.db.query("docs").withIndex("by_workspace_id", (q) => q.eq("workspaceId", wid)).take(BATCH)
        for (const d of docs) {
            await ctx.scheduler.runAfter(0, internal.liveblocks.deleteRoom, { roomId: d.liveblocksRoomId })
            await ctx.db.delete(d._id)
        }
        if (docs.length === BATCH) more = true

        const messages = await ctx.db.query("messages").withIndex("byWorkspaceId", (q) => q.eq("workspaceId", wid)).take(BATCH)
        for (const message of messages) {
            for (const fileId of [message.image, message.file]) {
                if (fileId) {
                    try { await ctx.storage.delete(fileId) } catch { /* already gone */ }
                }
            }
            await ctx.db.delete(message._id)
        }
        if (messages.length === BATCH) more = true

        // every remaining stored file (doc images, anything unattached): delete the data and the record
        const fileRows = await ctx.db.query("files").withIndex("by_workspace_id", (q) => q.eq("workspaceId", wid)).take(BATCH)
        for (const row of fileRows) {
            try { await ctx.storage.delete(row.storageId) } catch { /* already gone */ }
            await ctx.db.delete(row._id)
        }
        if (fileRows.length === BATCH) more = true

        const simple = [
            await ctx.db.query("sprints").withIndex("by_workspace_id", (q) => q.eq("workspaceId", wid)).take(BATCH),
            await ctx.db.query("notes").withIndex("by_workspace_id", (q) => q.eq("workspaceId", wid)).take(BATCH),
            await ctx.db.query("reactions").withIndex("byWorkspaceId", (q) => q.eq("workspaceId", wid)).take(BATCH),
            await ctx.db.query("conversations").withIndex("byWorkspaceId", (q) => q.eq("workspaceId", wid)).take(BATCH),
            await ctx.db.query("channels").withIndex("byWorkspaceId", (q) => q.eq("workspaceId", wid)).take(BATCH),
            await ctx.db.query("aiSummaryLog").withIndex("by_workspace_id", (q) => q.eq("workspaceId", wid)).take(BATCH),
            await ctx.db.query("notifications").withIndex("by_workspace_recipient", (q) => q.eq("workspaceId", wid)).take(BATCH),
            await ctx.db.query("auditLog").withIndex("by_workspace_id", (q) => q.eq("workspaceId", wid)).take(BATCH),
            await ctx.db.query("pins").withIndex("by_workspace_id", (q) => q.eq("workspaceId", wid)).take(BATCH),
            await ctx.db.query("savedMessages").withIndex("by_workspace_id", (q) => q.eq("workspaceId", wid)).take(BATCH),
            await ctx.db.query("attachments").withIndex("by_workspace_id", (q) => q.eq("workspaceId", wid)).take(BATCH),
        ]
        for (const rows of simple) {
            for (const row of rows) await ctx.db.delete(row._id)
            if (rows.length === BATCH) more = true
        }

        if (more) {
            await ctx.scheduler.runAfter(0, internal.workspaces.purge, { id: wid })
        } else {
            const ws = await ctx.db.get(wid)
            if (ws?.image) {
                try { await ctx.storage.delete(ws.image) } catch { /* already gone */ }
            }
            await ctx.db.delete(wid)
        }
    },
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

        if (!member) throw new ConvexError("Unauthorized");
        const { workspace: ws0 } = await requireActor(ctx, args.workspaceId)
        if (!hasPermission(ws0, member, "invite")) throw new ConvexError("You don't have permission to manage invites");

        const joinCode = generateCode()
        const days = args.expiresInDays && args.expiresInDays > 0 ? Math.min(args.expiresInDays, 365) : undefined
        await ctx.db.patch(args.workspaceId, {
            joinCode,
            joinCodeExpiresAt: days ? Date.now() + days * 24 * 60 * 60 * 1000 : undefined,
        })
        await logAudit(ctx, args.workspaceId, member._id, "invite.reset", days ? `expires in ${days} days` : "no expiry")
        return args.workspaceId;
    }
})

// "Anyone with the link can join": the invite link no longer needs the code. Turning invites off still stops everyone.
export const setOpenInviteLink = mutation({
    args: { workspaceId: v.id("workspaces"), open: v.boolean() },
    handler: async (ctx, args) => {
        const { workspace, member } = await requireActor(ctx, args.workspaceId)
        if (!hasPermission(workspace, member, "invite")) throw new ConvexError("You don't have permission to change invite settings");
        await ctx.db.patch(args.workspaceId, { openInviteLink: args.open })
        await logAudit(ctx, args.workspaceId, member._id, args.open ? "invite.open_link" : "invite.close_link")
        return args.workspaceId;
    }
})

// Require everyone to use two-step verification (Business and Enterprise). Owner and admins only.
export const setRequire2fa = mutation({
    args: { workspaceId: v.id("workspaces"), require: v.boolean() },
    handler: async (ctx, args) => {
        const { workspace, member } = await requireActor(ctx, args.workspaceId)
        if (!isOwner(workspace, member) && member.role !== "admin") throw new ConvexError("Only the owner and admins can change this")
        const plan = getPlan(workspace.plan)
        if (args.require && plan !== "growth" && plan !== "enterprise") {
            throw new ConvexError("Requiring two-step verification is part of the Business plan and up")
        }
        // the person switching it on must have it on themselves, or they would lock themselves out
        if (args.require) {
            const tf = await ctx.db.query("twoFactor").withIndex("by_user_id", (q) => q.eq("userId", member.userId)).unique()
            if (!tf?.enabled) throw new ConvexError("Turn on two-step verification for your own account first (profile menu, Security)")
        }
        await ctx.db.patch(args.workspaceId, { require2fa: args.require })
        await logAudit(ctx, args.workspaceId, member._id, args.require ? "security.require_2fa" : "security.allow_no_2fa")
        return args.workspaceId
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

        if (!member) throw new ConvexError("Unauthorized");
        const { workspace: ws1 } = await requireActor(ctx, args.workspaceId)
        if (!hasPermission(ws1, member, "invite")) throw new ConvexError("You don't have permission to change invite settings");

        await ctx.db.patch(args.workspaceId, { invitesDisabled: args.disabled })
        await logAudit(ctx, args.workspaceId, member._id, args.disabled ? "invite.disable" : "invite.enable")
        return args.workspaceId;
    }
})

export const join = mutation({
    args: {
        joinCode: v.optional(v.string()),
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

        // At most 10 attempts per 10 minutes per user. Wrong codes are returned (not thrown) so the attempt still counts.
        if (!(await consume(ctx, `join:${userId}`, 10, 10 * 60_000))) {
            throw new ConvexError("Too many attempts. Please wait a few minutes and try again.");
        }
        if (!(await consume(ctx, `join:ws:${args.workspaceId}`, 120, 10 * 60_000))) {
            throw new ConvexError("This workspace is getting a lot of join attempts. Please try again in a few minutes.");
        }
        const typed = (args.joinCode ?? "").trim().toLowerCase()
        if (typed) {
            if (workspace.joinCode !== typed) {
                return { error: "That code isn't right. Check it and try again." };
            }
        } else if (!workspace.openInviteLink) {
            return { error: "This invite link needs its code. Ask an admin to send the link again." };
        }
        // The expiry belongs to the code. A link that carries no code (open link) is not affected by it.
        if (typed && workspace.joinCodeExpiresAt && workspace.joinCodeExpiresAt < Date.now()) {
            return { error: "This invite code has expired. Ask an admin for a new one." };
        }

        // Check member limit
        const existingMembers = await ctx.db
            .query("members")
            .withIndex("byWorkspaceId", (q) => q.eq("workspaceId", workspace._id))
            .collect()

        const { allowed, limit, plan } = await checkLimit(
            ctx, workspace._id, "members", existingMembers.filter((m) => m.role !== "guest").length
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
            imageUrl: workspace.image ? await ctx.storage.getUrl(workspace.image) : null,
            isMember,
            openLink: !!workspace.openInviteLink,
            invitesOpen:
                !workspace.invitesDisabled &&
                (!!workspace.openInviteLink || !(workspace.joinCodeExpiresAt && workspace.joinCodeExpiresAt < Date.now())),
        }
    }
})