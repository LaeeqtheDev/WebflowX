import { v } from "convex/values"
import { query } from "./_generated/server"
import { auth } from "./auth"



export const getStorageUrl = query({
    args: { storageId: v.id("_storage") },
    handler: async (ctx, args) => {
        const userId = await auth.getUserId(ctx)
        if (!userId) return null
        return await ctx.storage.getUrl(args.storageId)
    }
})