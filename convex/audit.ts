import { v, ConvexError } from "convex/values"
import { query, MutationCtx } from "./_generated/server"
import { Id } from "./_generated/dataModel"
import { auth } from "./auth"

// Records who did what. Called from the mutations that change roles, access and settings.
export const logAudit = async (
    ctx: MutationCtx,
    workspaceId: Id<"workspaces">,
    actorId: Id<"members">,
    action: string,
    detail?: string
) => {
    await ctx.db.insert("auditLog", { workspaceId, actorId, action, detail: detail?.slice(0, 300) })
}

// Owner and admins can read the log (newest 100 entries).
export const list = query({
    args: { workspaceId: v.id("workspaces") },
    handler: async (ctx, args) => {
        const userId = await auth.getUserId(ctx)
        if (!userId) return []
        const member = await ctx.db
            .query("members")
            .withIndex("byWorkspaceId_user_id", (q) => q.eq("workspaceId", args.workspaceId).eq("userId", userId))
            .unique()
        if (!member) return []
        const workspace = await ctx.db.get(args.workspaceId)
        if (!workspace) return []
        if (workspace.userId !== member.userId && member.role !== "admin") throw new ConvexError("Only admins can view the audit log")

        const rows = await ctx.db
            .query("auditLog")
            .withIndex("by_workspace_id", (q) => q.eq("workspaceId", args.workspaceId))
            .order("desc")
            .take(100)

        return await Promise.all(rows.map(async (r) => {
            const actor = await ctx.db.get(r.actorId)
            const user = actor ? await ctx.db.get(actor.userId) : null
            return { ...r, actorName: user?.name ?? "Former member" }
        }))
    },
})
