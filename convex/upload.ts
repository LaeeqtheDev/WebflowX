import { v } from "convex/values"
import { query } from "./_generated/server"
import { auth } from "./auth"
import { assert2fa } from "./permissions"

// A link to a stored file, but only for the person who uploaded it or someone in the workspace it belongs to.
export const getStorageUrl = query({
    args: { storageId: v.id("_storage") },
    handler: async (ctx, args) => {
        const userId = await auth.getUserId(ctx)
        if (!userId) return null
        const file = await ctx.db.query("files").withIndex("by_storage_id", (q) => q.eq("storageId", args.storageId)).first()
        if (!file) return null
        if (file.uploadedBy !== userId && file.kind !== "avatar") {
            if (!file.workspaceId) return null
            const member = await ctx.db
                .query("members")
                .withIndex("byWorkspaceId_user_id", (q) => q.eq("workspaceId", file.workspaceId!).eq("userId", userId))
                .unique()
            if (!member) return null
            await assert2fa(ctx, member)
        }
        return await ctx.storage.getUrl(args.storageId)
    },
})
