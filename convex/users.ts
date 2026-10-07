import { v, ConvexError } from "convex/values"
import { auth } from "./auth";
import { mutation, query } from "./_generated/server";
import { assertPhoto } from "./files";

export const current = query({
    args:{},
    handler: async (ctx) => {
        const userId = await auth.getUserId(ctx);
        
        if(userId === null) {
            return null;
        }
        return await ctx.db.get(userId);
    }
})

// Everyone edits only their own profile.
export const updateProfile = mutation({
    args: {
        name: v.optional(v.string()),
        title: v.optional(v.string()),
        bio: v.optional(v.string()),
        // photo uploaded to storage first, or removeImage to go back to initials
        imageStorageId: v.optional(v.id("_storage")),
        removeImage: v.optional(v.boolean()),
        emailNotifications: v.optional(v.boolean()),
    },
    handler: async (ctx, args) => {
        const userId = await auth.getUserId(ctx)
        if (!userId) throw new ConvexError("Please sign in")

        const patch: { name?: string; title?: string; bio?: string; image?: string; emailNotifications?: boolean } = {}
        if (args.emailNotifications !== undefined) patch.emailNotifications = args.emailNotifications
        if (args.name !== undefined) {
            const name = args.name.trim().replace(/\s+/g, " ")
            if (!name) throw new ConvexError("Name can't be empty")
            if (name.length > 60) throw new ConvexError("Name can be at most 60 characters")
            patch.name = name
        }
        if (args.title !== undefined) patch.title = args.title.trim().slice(0, 80)
        if (args.bio !== undefined) patch.bio = args.bio.trim().slice(0, 300)
        if (args.imageStorageId) {
            await assertPhoto(ctx, args.imageStorageId, userId)
            const url = await ctx.storage.getUrl(args.imageStorageId)
            if (!url) throw new ConvexError("Couldn't read the uploaded photo")
            patch.image = url
        }
        await ctx.db.patch(userId, {
            ...patch,
            ...(args.removeImage && !args.imageStorageId ? { image: undefined } : {}),
        })
        return userId
    },
})


// Each member picks their own appearance; it is stored on their account and follows them across devices.
export const setTheme = mutation({
    args: { theme: v.union(v.literal("light"), v.literal("dark"), v.literal("system")) },
    handler: async (ctx, args) => {
        const userId = await auth.getUserId(ctx)
        if (!userId) throw new ConvexError("Please sign in")
        await ctx.db.patch(userId, { theme: args.theme })
        return args.theme
    },
})
