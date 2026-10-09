// ONE-OFF: replaces the text of the demo's GitHub bot messages in #deployments with corrected pull request titles.
import { internalMutation } from "./_generated/server"
import { Id } from "./_generated/dataModel"
import { BODY_PATCHES } from "./demoSeedPatch"

export const deployments = internalMutation({
    args: {},
    handler: async (ctx) => {
        let patched = 0, missing = 0
        for (const p of BODY_PATCHES) {
            const doc = await ctx.db.get(p.id as Id<"messages">)
            if (!doc || doc.integrationName !== "GitHub") { missing++; continue }
            await ctx.db.patch(doc._id, { body: p.body })
            patched++
        }
        return { patched, missing }
    },
})
