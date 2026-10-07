import { v } from "convex/values"
import { mutation, query } from "./_generated/server"
import { auth } from "./auth"

export const generateUploadUrl = mutation(async (ctx)=> {
    const userId = await auth.getUserId(ctx)
    if (!userId) throw new Error("Unauthorized")
    return await ctx.storage.generateUploadUrl()
})


export const getStorageUrl = query({
    args: { storageId: v.id("_storage") },
    handler: async (ctx, args) => {
        const userId = await auth.getUserId(ctx)
        if (!userId) return null
        return await ctx.storage.getUrl(args.storageId)
    }
})