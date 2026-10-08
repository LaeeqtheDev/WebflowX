import { v } from "convex/values";
import { auth } from "./auth";
import { Id } from "./_generated/dataModel";
import { mutation, query, internalMutation, QueryCtx } from "./_generated/server";
import { internal } from "./_generated/api";
import { release } from "./files";
import { ConvexError } from "convex/values";
import { requireActor, isAdminLike, isOwner, hasPermission, roleOf } from "./permissions";
import { logAudit } from "./audit";
import { PLANS, getPlan } from "./limits";

const populateUser = (ctx: QueryCtx, id: Id<"users">) => {
    return ctx.db.get(id)
}

export const getById = query({
    args: { id: v.id("members") },
    handler: async (ctx, args) => {
        const userId = await auth.getUserId(ctx)
        if (!userId) return null

        const member = await ctx.db.get(args.id)
        if (!member) return null;

        const currentMember = await ctx.db
            .query("members")
            .withIndex("byWorkspaceId_user_id", (q) =>
                q.eq("workspaceId", member.workspaceId).eq("userId", userId)
            )
            .unique()

        if (!currentMember) return null

        const user = await populateUser(ctx, member.userId)
        if (!user) return null
        const workspace = await ctx.db.get(member.workspaceId)

        return { ...member, user, isOwner: workspace?.userId === member.userId }
    }
})

export const get = query({
    args: { workspaceId: v.id("workspaces") },
    handler: async (ctx, args) => {
        const userId = await auth.getUserId(ctx)
        if (!userId) return []

        const member = await ctx.db
            .query("members")
            .withIndex("byWorkspaceId_user_id", (q) =>
                q.eq("workspaceId", args.workspaceId).eq("userId", userId)
            ).unique()

        if (!member) return []

        const data = await ctx.db
            .query("members")
            .withIndex("byWorkspaceId", (q) => q.eq("workspaceId", args.workspaceId))
            .take(1000)

        const workspace = await ctx.db.get(args.workspaceId)
        const members = []
        for (const m of data) {
            // guests see only themselves and the people who run the workspace
            if (member.role === "guest" && m._id !== member._id && m.role !== "admin" && workspace?.userId !== m.userId) continue
            const user = await populateUser(ctx, m.userId)
            if (user) members.push({ ...m, user, isOwner: workspace?.userId === m.userId })
        }
        return members
    }
})

export const current = query({
    args: { workspaceId: v.id("workspaces") },
    handler: async (ctx, args) => {
        const userId = await auth.getUserId(ctx)
        if (!userId) return null

        const member = await ctx.db
            .query("members")
            .withIndex("byWorkspaceId_user_id", (q) =>
                q.eq("workspaceId", args.workspaceId).eq("userId", userId)
            ).unique()

        if (!member) return null
        return member;
    }
})

const RANK = { guest: 0, member: 0, moderator: 1, admin: 2, owner: 3 } as const

export const update = mutation({
    args: {
        id: v.id("members"),
        role: v.union(v.literal("admin"), v.literal("moderator"), v.literal("member"), v.literal("guest")),
    },
    handler: async (ctx, args) => {
        const target = await ctx.db.get(args.id);
        if (!target) throw new ConvexError("Member not found")

        const { member: actor, workspace } = await requireActor(ctx, target.workspaceId)
        if (!isAdminLike(workspace, actor)) throw new ConvexError("Only the owner or an admin can change roles")
        if (isOwner(workspace, target)) throw new ConvexError("The workspace owner's role can't be changed")
        if (target.role === args.role && !target.customRoleId) return args.id

        // Only the owner can make admins or change an admin's role
        if ((args.role === "admin" || target.role === "admin") && !isOwner(workspace, actor)) {
            throw new ConvexError("Only the workspace owner can promote or demote admins")
        }

        // guests are capped per plan; they don't count toward the member cap
        if (args.role === "guest") {
            const limit = PLANS[getPlan(workspace.plan)].guests
            if (limit === 0) throw new ConvexError(`LIMIT_REACHED:guests:0:${getPlan(workspace.plan)}`)
            if (limit > 0) {
                const all = await ctx.db.query("members").withIndex("byWorkspaceId", (q) => q.eq("workspaceId", target.workspaceId)).take(1000)
                if (all.filter((m) => m.role === "guest").length >= limit) throw new ConvexError(`LIMIT_REACHED:guests:${limit}:${getPlan(workspace.plan)}`)
            }
        }

        await ctx.db.patch(args.id, { role: args.role, customRoleId: undefined })
        const targetUser = await ctx.db.get(target.userId)
        await logAudit(ctx, target.workspaceId, actor._id, "member.role", `${targetUser?.name ?? "A member"}: ${target.role} → ${args.role}`)
        return args.id;
    }
})

// Give a member a custom role (or clear it with null). Admins and the owner can't hold one.
export const setCustomRole = mutation({
    args: { id: v.id("members"), customRoleId: v.union(v.string(), v.null()) },
    handler: async (ctx, args) => {
        const target = await ctx.db.get(args.id)
        if (!target) throw new ConvexError("Member not found")
        const { member: actor, workspace } = await requireActor(ctx, target.workspaceId)
        if (!isAdminLike(workspace, actor)) throw new ConvexError("Only the owner or an admin can assign roles")
        if (isOwner(workspace, target) || target.role === "admin") throw new ConvexError("Admins and the owner already have every permission")
        if (args.customRoleId === null) {
            await ctx.db.patch(args.id, { customRoleId: undefined })
        } else {
            const role = workspace.customRoles?.find((r) => r.id === args.customRoleId)
            if (!role) throw new ConvexError("Role not found")
            await ctx.db.patch(args.id, { customRoleId: role.id, role: role.baseRole })
        }
        const targetUser = await ctx.db.get(target.userId)
        await logAudit(ctx, target.workspaceId, actor._id, "member.customRole", `${targetUser?.name ?? "A member"}: ${args.customRoleId ? workspace.customRoles?.find((r) => r.id === args.customRoleId)?.name : "none"}`)
        return args.id
    },
})

export const remove = mutation({
    args: { id: v.id("members") },
    handler: async (ctx, args) => {
        const member = await ctx.db.get(args.id);
        if (!member) throw new ConvexError("Member not found")

        const { member: currentMember, workspace } = await requireActor(ctx, member.workspaceId)
        const leaving = currentMember._id === args.id

        if (isOwner(workspace, member)) {
            throw new ConvexError("The workspace owner can't be removed or leave. Transfer ownership or delete the workspace instead.")
        }
        if (!leaving) {
            if (!hasPermission(workspace, currentMember, "manageMembers")) {
                throw new ConvexError("You don't have permission to remove members")
            }
            // you can only remove people ranked below you
            if (RANK[roleOf(workspace, currentMember)] <= RANK[roleOf(workspace, member)]) {
                throw new ConvexError("You can't remove someone with the same or a higher role")
            }
        }
        const removedUser = await ctx.db.get(member.userId)
        await logAudit(ctx, member.workspaceId, currentMember._id, leaving ? "member.leave" : "member.remove", removedUser?.name ?? undefined)

        // keys and hooks this person made post as them, so they go with them
        const theirIntegrations = await ctx.db.query("integrations").withIndex("by_workspace_id", (q) => q.eq("workspaceId", member.workspaceId)).take(500)
        for (const row of theirIntegrations) if (row.createdBy === member._id) await ctx.db.delete(row._id)

        // the member is gone straight away; their messages, reactions and the rest are cleared in batches
        await ctx.db.delete(args.id)
        await ctx.scheduler.runAfter(0, internal.members.cleanupRemoved, { memberId: args.id, workspaceId: member.workspaceId })
        return args.id;
    }
})

const CLEAN_BATCH = 200

// Clears what a removed member left behind, a batch at a time so a very active member can't hit the
// per-mutation limits. Runs again by itself until every batch comes back short.
export const cleanupRemoved = internalMutation({
    args: { memberId: v.id("members"), workspaceId: v.id("workspaces") },
    handler: async (ctx, args) => {
        const id = args.memberId
        let more = false

        const messages = await ctx.db.query("messages").withIndex("by_member_id", (q) => q.eq("memberId", id)).take(CLEAN_BATCH)
        for (const m of messages) {
            for (const fileId of [m.image, m.file]) if (fileId) await release(ctx, fileId)
            await ctx.db.delete(m._id)
        }
        if (messages.length === CLEAN_BATCH) more = true

        const reactions = await ctx.db.query("reactions").withIndex("by_member_id", (q) => q.eq("memberId", id)).take(CLEAN_BATCH)
        for (const r of reactions) await ctx.db.delete(r._id)
        if (reactions.length === CLEAN_BATCH) more = true

        const conversations = await ctx.db.query("conversations").withIndex("byWorkspaceId", (q) => q.eq("workspaceId", args.workspaceId))
            .filter((q) => q.or(q.eq(q.field("memberOneId"), id), q.eq(q.field("memberTwoId"), id)))
            .take(CLEAN_BATCH)
        for (const c of conversations) await ctx.db.delete(c._id)
        if (conversations.length === CLEAN_BATCH) more = true

        const notifications = await ctx.db.query("notifications").withIndex("by_recipient", (q) => q.eq("recipientId", id)).take(CLEAN_BATCH)
        for (const n of notifications) await ctx.db.delete(n._id)
        if (notifications.length === CLEAN_BATCH) more = true

        const saved = await ctx.db.query("savedMessages").withIndex("by_member_id", (q) => q.eq("memberId", id)).take(CLEAN_BATCH)
        for (const x of saved) await ctx.db.delete(x._id)
        if (saved.length === CLEAN_BATCH) more = true

        const attachmentRows = await ctx.db.query("attachments").withIndex("by_member_id", (q) => q.eq("memberId", id)).take(CLEAN_BATCH)
        for (const x of attachmentRows) await ctx.db.delete(x._id)
        if (attachmentRows.length === CLEAN_BATCH) more = true

        const assigned = await ctx.db.query("tasks").withIndex("by_assignee_id", (q) => q.eq("assigneeId", id)).take(CLEAN_BATCH)
        for (const t of assigned) await ctx.db.patch(t._id, { assigneeId: undefined, updatedAt: Date.now() })
        if (assigned.length === CLEAN_BATCH) more = true

        // take them out of any locked channels they were added to
        const channels = await ctx.db.query("channels").withIndex("byWorkspaceId", (q) => q.eq("workspaceId", args.workspaceId)).take(1000)
        for (const ch of channels) {
            if (ch.memberIds?.includes(id)) await ctx.db.patch(ch._id, { memberIds: ch.memberIds.filter((x) => x !== id) })
            if (ch.guestIds?.includes(id)) await ctx.db.patch(ch._id, { guestIds: ch.guestIds.filter((x) => x !== id) })
        }

        if (more) await ctx.scheduler.runAfter(0, internal.members.cleanupRemoved, args)
    },
})
