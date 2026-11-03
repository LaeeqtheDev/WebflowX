import { v } from "convex/values"
import { internalMutation, internalQuery, MutationCtx } from "./_generated/server"

// One daily token budget per model, shared by every workspace: the Groq free tier limits the whole account
// (about 200,000 tokens a day on gpt-oss-120b), so agents check what's left before they start and switch to their
// plain, no-AI versions when it's nearly gone, instead of failing halfway through. Override with AI_DAILY_TOKENS_LARGE
// and AI_DAILY_TOKENS_SMALL when the account's limits are higher.
export const SMALL_MODEL = () => process.env.GROQ_SMALL_MODEL || "llama-3.1-8b-instant"
export const isSmall = (model: string) => model === SMALL_MODEL() || /(^|\/)(llama-3\.1-8b|gpt-oss-20b)/.test(model)
const limitFor = (model: string) =>
    Number(isSmall(model) ? process.env.AI_DAILY_TOKENS_SMALL ?? 450_000 : process.env.AI_DAILY_TOKENS_LARGE ?? 180_000)
export const today = () => new Date().toISOString().slice(0, 10)

// tokens left today for this size of model
export const left = internalQuery({
    args: { tier: v.union(v.literal("large"), v.literal("small")) },
    handler: async (ctx, args) => {
        const rows = await ctx.db.query("aiUsage").withIndex("by_day_model", (q) => q.eq("day", today())).take(20)
        const used = rows.filter((r) => isSmall(r.model) === (args.tier === "small")).reduce((n, r) => n + r.tokens, 0)
        const limit = args.tier === "small" ? limitFor(SMALL_MODEL()) : limitFor("large")
        return Math.max(0, limit - used)
    },
})

export const addUsage = async (ctx: MutationCtx, model: string, tokens: number) => {
    if (!model || tokens <= 0) return
    const day = today()
    const row = await ctx.db.query("aiUsage").withIndex("by_day_model", (q) => q.eq("day", day).eq("model", model)).unique()
    if (row) await ctx.db.patch(row._id, { tokens: row.tokens + tokens, calls: row.calls + 1 })
    else await ctx.db.insert("aiUsage", { day, model, tokens, calls: 1 })
}

export const add = internalMutation({
    args: { model: v.string(), tokens: v.number() },
    handler: async (ctx, args) => { await addUsage(ctx, args.model, args.tokens); return null },
})

// what's been used today, for the Agents screen (admins)
export const usedToday = internalQuery({
    args: {},
    handler: async (ctx) => {
        const rows = await ctx.db.query("aiUsage").withIndex("by_day_model", (q) => q.eq("day", today())).take(20)
        const large = rows.filter((r) => !isSmall(r.model)).reduce((n, r) => n + r.tokens, 0)
        const small = rows.filter((r) => isSmall(r.model)).reduce((n, r) => n + r.tokens, 0)
        return { large, small, largeLimit: limitFor("large"), smallLimit: limitFor(SMALL_MODEL()) }
    },
})
