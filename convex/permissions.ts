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
    "postInReadOnly",       // write in announcement (read-only) channels
    "mentionEveryone",      // use @everyone / @channel
    "uploadFiles",          // attach files and images
    "startMeetings",        // start meetings
    "createDocs",           // create documents
] as const
export type Permission = (typeof PERMISSIONS)[number]

export const DEFAULT_ROLE_PERMISSIONS: Record<"moderator" | "member", Permission[]> = {
    moderator: [
        "createChannels", "manageChannels", "viewPrivateChannels", "deleteMessages", "invite", "moderateMeetings", "manageContent",
        "postInReadOnly", "mentionEveryone", "uploadFiles", "startMeetings", "createDocs",
    ],
    member: ["uploadFiles", "startMeetings", "createDocs"],
}

// Abilities everyone had before they became configurable. Workspaces that saved permissions
// earlier keep them until an admin saves the (longer) list again.
const LEGACY_DEFAULT_ON: Permission[] = ["uploadFiles", "startMeetings", "createDocs"]

const clean = (list: string[]): Permission[] =>
    list.filter((p): p is Permission => (PERMISSIONS as readonly string[]).includes(p))

export const isOwner = (workspace: Doc<"workspaces">, member: Doc<"members">) =>
    workspace.userId === member.userId

export const roleOf = (workspace: Doc<"workspaces">, member: Doc<"members">): "owner" | "admin" | "moderator" | "member" | "guest" =>
    isOwner(workspace, member) ? "owner" : member.role

export const permissionList = (workspace: Doc<"workspaces">, member: Doc<"members">): Permission[] => {
    if (isOwner(workspace, member) || member.role === "admin") return [...PERMISSIONS]
    // guests can read, write and attach files in their channels, and nothing else
    if (member.role === "guest") return ["uploadFiles"]
    const custom = member.customRoleId ? workspace.customRoles?.find((r) => r.id === member.customRoleId) : undefined
    if (custom) return clean(custom.permissions)
    const configured = workspace.rolePermissions?.[member.role]
    if (!configured) return DEFAULT_ROLE_PERMISSIONS[member.role]
    const list = workspace.permsVersion === 2 ? configured : [...configured, ...LEGACY_DEFAULT_ON]
    return clean(list)
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
    // guests open only the channels they were added to, locked or not
    if (member.role === "guest") return (channel.guestIds ?? []).includes(member._id)
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
            customRoleName: workspace.customRoles?.find((r) => r.id === member.customRoleId)?.name ?? null,
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
        const legacy = workspace.permsVersion !== 2
        const effective = (role: "moderator" | "member") => {
            const configured = workspace.rolePermissions?.[role]
            if (!configured) return DEFAULT_ROLE_PERMISSIONS[role]
            return legacy ? Array.from(new Set([...configured, ...LEGACY_DEFAULT_ON])) : configured
        }
        return {
            moderator: effective("moderator"),
            member: effective("member"),
            customRoles: workspace.customRoles ?? [],
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

        const next = Array.from(new Set(clean(args.permissions)))
        const legacy = workspace.permsVersion !== 2
        const base = (role: "moderator" | "member") => {
            const configured = workspace.rolePermissions?.[role]
            if (!configured) return DEFAULT_ROLE_PERMISSIONS[role]
            return legacy ? Array.from(new Set([...configured, ...LEGACY_DEFAULT_ON])) : configured
        }
        const current = { moderator: base("moderator"), member: base("member") }
        await ctx.db.patch(args.workspaceId, { rolePermissions: { ...current, [args.role]: next }, permsVersion: 2 })
        await logAudit(ctx, args.workspaceId, member._id, "permissions.update", `${args.role}: ${next.join(", ") || "none"}`)
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


const newId = () => Math.random().toString(36).slice(2, 10)

// Create or edit a custom role (a named permission set that sits on top of the moderator or member rank).
export const saveCustomRole = mutation({
    args: {
        workspaceId: v.id("workspaces"),
        id: v.optional(v.string()),
        name: v.string(),
        baseRole: v.union(v.literal("moderator"), v.literal("member")),
        permissions: v.array(v.string()),
    },
    handler: async (ctx, args) => {
        const { member, workspace } = await requireActor(ctx, args.workspaceId)
        if (!isAdminLike(workspace, member)) throw new ConvexError("Only the owner or an admin can manage roles")
        const name = args.name.trim().replace(/\s+/g, " ")
        if (name.length < 2 || name.length > 30) throw new ConvexError("Role names must be 2 to 30 characters")
        if (["owner", "admin", "moderator", "member"].includes(name.toLowerCase())) throw new ConvexError("That name is reserved")
        const roles = workspace.customRoles ?? []
        if (roles.some((r) => r.id !== args.id && r.name.toLowerCase() === name.toLowerCase())) throw new ConvexError("A role with that name already exists")
        if (!args.id && roles.length >= 10) throw new ConvexError("You can create up to 10 custom roles")

        const role = { id: args.id ?? newId(), name, baseRole: args.baseRole, permissions: Array.from(new Set(clean(args.permissions))) }
        const next = args.id ? roles.map((r) => (r.id === args.id ? role : r)) : [...roles, role]
        if (args.id && !roles.some((r) => r.id === args.id)) throw new ConvexError("Role not found")
        await ctx.db.patch(args.workspaceId, { customRoles: next })

        // people already holding this role move to its (possibly new) base rank
        if (args.id) {
            const holders = await ctx.db.query("members").withIndex("byWorkspaceId", (q) => q.eq("workspaceId", args.workspaceId)).collect()
            for (const m of holders) if (m.customRoleId === args.id && m.role !== "admin") await ctx.db.patch(m._id, { role: args.baseRole })
        }
        await logAudit(ctx, args.workspaceId, member._id, args.id ? "role.update" : "role.create", name)
        return role.id
    },
})

export const deleteCustomRole = mutation({
    args: { workspaceId: v.id("workspaces"), id: v.string() },
    handler: async (ctx, args) => {
        const { member, workspace } = await requireActor(ctx, args.workspaceId)
        if (!isAdminLike(workspace, member)) throw new ConvexError("Only the owner or an admin can manage roles")
        const role = workspace.customRoles?.find((r) => r.id === args.id)
        if (!role) throw new ConvexError("Role not found")
        await ctx.db.patch(args.workspaceId, { customRoles: (workspace.customRoles ?? []).filter((r) => r.id !== args.id) })
        const holders = await ctx.db.query("members").withIndex("byWorkspaceId", (q) => q.eq("workspaceId", args.workspaceId)).collect()
        for (const m of holders) if (m.customRoleId === args.id) await ctx.db.patch(m._id, { customRoleId: undefined })
        await logAudit(ctx, args.workspaceId, member._id, "role.delete", role.name)
        return args.id
    },
})
