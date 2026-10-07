import { v, ConvexError } from "convex/values"
import { mutation, query, QueryCtx, MutationCtx } from "./_generated/server"
import { Doc, Id } from "./_generated/dataModel"
import { auth } from "./auth"
import { logAudit } from "./audit"

// Everything a role can be allowed to do. Owner and admins always have all of them.
export const PERMISSIONS = [
    "createChannels",       // create new channels
    "manageChannels",       // rename / delete / lock channels and choose who is in them
    "viewPrivateChannels",  // open every locked channel without being added
    "deleteMessages",       // delete other people's messages
    "manageMembers",        // remove members
    "invite",               // see the invite link, reset the code, turn invites on/off
    "editWorkspace",        // workspace name, photo and description
    "moderateMeetings",     // mute / remove people and end calls
    "manageContent",        // edit or delete other people's tasks, notes, sprints and docs
] as const
export type Permission = (typeof PERMISSIONS)[number]

export const DEFAULT_ROLE_PERMISSIONS: Record<"moderator" | "member", Permission[]> = {
    moderator: ["createChannels", "manageChannels", "viewPrivateChannels", "deleteMessages", "invite", "moderateMeetings", "manageContent"],
    member: [],
}

export const isOwner = (workspace: Doc<"workspaces">, member: Doc<"members">) =>
    workspace.userId === member.userId

export const roleOf = (workspace: Doc<"workspaces">, member: Doc<"members">): "owner" | "admin" | "moderator" | "member" =>
    isOwner(workspace, member) ? "owner" : member.role

export const permissionList = (workspace: Doc<"workspaces">, member: Doc<"members">): Permission[] => {
    if (isOwner(workspace, member) || member.role === "admin") return [...PERMISSIONS]
    const configured = workspace.rolePermissions?.[member.role]
    const list = configured ?? DEFAULT_ROLE_PERMISSIONS[member.role]
    return list.filter((p): p is Permission => (PERMISSIONS as readonly string[]).includes(p))
}

export const hasPermission = (workspace: Doc<"workspaces">, member: Doc<"members">, perm: Permission) =>
    permissionList(workspace, member).includes(perm)

export const isAdminLike = (workspace: Doc<"workspaces">, member: Doc<"members">) =>
    isOwner(workspace, member) || member.role === "admin"

// Locked channels are visible to people added to them and to roles with "view private channels".
export const canAccessChannel = (
    workspace: Doc<"workspaces">,
    member: Doc<"members">,
    channel: Doc<"channels">
) => {
    if (!channel.isPrivate) return true
    if ((channel.memberIds ?? []).includes(member._id)) return true
    return hasPermission(workspace, member, "viewPrivateChannels")
}

// Loads the signed-in member + workspace, or throws a friendly error.
export const requireActor = async (ctx: QueryCtx | MutationCtx, workspaceId: Id<"workspaces">) => {
    const userId = await auth.getUserId(ctx)
    if (!userId) throw new ConvexError("Please sign in")
    const member = await ctx.db
        .query("members")
        .withIndex("byWorkspaceId_user_id", (q) => q.eq("workspaceId", workspaceId).eq("userId", userId))
        .unique()
    if (!member) throw new ConvexError("You are not a member of this workspace")
    const workspace = await ctx.db.get(workspaceId)
    if (!workspace) throw new ConvexError("This workspace no longer exists")
    return { userId, member, workspace }
}

export const requirePermission = async (
    ctx: QueryCtx | MutationCtx,
    workspaceId: Id<"workspaces">,
    perm: Permission,
    message = "You don't have permission to do that"
) => {
    const actor = await requireActor(ctx, workspaceId)
    if (!hasPermission(actor.workspace, actor.member, perm)) throw new ConvexError(message)
    return actor
}

// What the current user may do in this workspace; drives which buttons the UI shows.
export const mine = query({
    args: { workspaceId: v.id("workspaces") },
    handler: async (ctx, args) => {
        const userId = await auth.getUserId(ctx)
        if (!userId) return null
        const member = await ctx.db
            .query("members")
            .withIndex("byWorkspaceId_user_id", (q) => q.eq("workspaceId", args.workspaceId).eq("userId", userId))
            .unique()
        if (!member) return null
        const workspace = await ctx.db.get(args.workspaceId)
        if (!workspace) return null
        return {
            memberId: member._id,
            role: roleOf(workspace, member),
            isOwner: isOwner(workspace, member),
            isAdmin: isAdminLike(workspace, member),
            permissions: permissionList(workspace, member),
        }
    },
})

// Current permission sets for moderators and members (shown in the roles settings).
export const rolePermissions = query({
    args: { workspaceId: v.id("workspaces") },
    handler: async (ctx, args) => {
        const userId = await auth.getUserId(ctx)
        if (!userId) return null
        const member = await ctx.db
            .query("members")
            .withIndex("byWorkspaceId_user_id", (q) => q.eq("workspaceId", args.workspaceId).eq("userId", userId))
            .unique()
        if (!member) return null
        const workspace = await ctx.db.get(args.workspaceId)
        if (!workspace) return null
        return {
            moderator: workspace.rolePermissions?.moderator ?? DEFAULT_ROLE_PERMISSIONS.moderator,
            member: workspace.rolePermissions?.member ?? DEFAULT_ROLE_PERMISSIONS.member,
        }
    },
})

export const setRolePermissions = mutation({
    args: {
        workspaceId: v.id("workspaces"),
        role: v.union(v.literal("moderator"), v.literal("member")),
        permissions: v.array(v.string()),
    },
    handler: async (ctx, args) => {
        const { member, workspace } = await requireActor(ctx, args.workspaceId)
        if (!isAdminLike(workspace, member)) throw new ConvexError("Only the owner or an admin can change permissions")

        const clean = Array.from(new Set(args.permissions)).filter((p): p is Permission =>
            (PERMISSIONS as readonly string[]).includes(p)
        )
        const current = {
            moderator: workspace.rolePermissions?.moderator ?? DEFAULT_ROLE_PERMISSIONS.moderator,
            member: workspace.rolePermissions?.member ?? DEFAULT_ROLE_PERMISSIONS.member,
        }
        await ctx.db.patch(args.workspaceId, { rolePermissions: { ...current, [args.role]: clean } })
        await logAudit(ctx, args.workspaceId, member._id, "permissions.update", `${args.role}: ${clean.join(", ") || "none"}`)
        return args.workspaceId
    },
})

// Can this user open the channel with this id? (false if it doesn't exist or is locked to them)
export const canViewChannel = async (ctx: QueryCtx | MutationCtx, channelId: Id<"channels">, userId: Id<"users">) => {
    const channel = await ctx.db.get(channelId)
    if (!channel) return false
    const member = await ctx.db
        .query("members")
        .withIndex("byWorkspaceId_user_id", (q) => q.eq("workspaceId", channel.workspaceId).eq("userId", userId))
        .unique()
    if (!member) return false
    const workspace = await ctx.db.get(channel.workspaceId)
    return !!workspace && canAccessChannel(workspace, member, channel)
}

// Shortcut for the "are you staff for this?" checks that used to be role === "admin".
export const can = async (ctx: QueryCtx | MutationCtx, member: Doc<"members">, perm: Permission) => {
    const workspace = await ctx.db.get(member.workspaceId)
    return !!workspace && hasPermission(workspace, member, perm)
}
