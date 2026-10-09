// ONE-OFF: sets the gender-matched cartoon avatars on the seeded demo people and on the owner.
import { v } from "convex/values"
import { internalMutation } from "./_generated/server"
import { SEED_AVATARS, OWNER_AVATAR } from "./demoSeedData"

export const apply = internalMutation({
    args: { ownerUserId: v.id("users") },
    handler: async (ctx, args) => {
        let updated = 0
        for (const [email, image] of Object.entries(SEED_AVATARS)) {
            const u = await ctx.db.query("users").withIndex("email", (q) => q.eq("email", email)).first()
            if (u) { await ctx.db.patch(u._id, { image }); updated++ }
        }
        await ctx.db.patch(args.ownerUserId, { image: OWNER_AVATAR })
        return { updated, owner: true }
    },
})
