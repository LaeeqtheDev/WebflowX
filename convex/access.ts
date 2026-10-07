import { QueryCtx } from "./_generated/server"
import { Id } from "./_generated/dataModel"

// Plain helpers (not Convex functions) shared by queries and mutations.
export const findMember = (
    ctx: QueryCtx,
    workspaceId: Id<"workspaces">,
    userId: Id<"users">
) =>
    ctx.db
        .query("members")
        .withIndex("byWorkspaceId_user_id", (q) =>
            q.eq("workspaceId", workspaceId).eq("userId", userId)
        )
        .unique()
