import { v, ConvexError } from "convex/values"
import { mutation } from "./_generated/server"
import { requireActor, isAdminLike } from "./permissions"
import { checkLimit, checkLimitLazy } from "./limits"
import { consume } from "./rateLimit"
import { logAudit } from "./audit"
import { text, MAX } from "./validate"

// Importers for people moving from Slack and Notion. Only owners and admins can run them.
// Messages cannot be written as the original authors (they are not members here), so they are posted by the person
// running the import, with the original author and time written at the top of each message.

const MAX_MESSAGES_PER_DAY = 20_000
const MAX_CHANNEL_MESSAGES = 5_000

const cleanChannelName = (raw: string) => {
    const name = raw.trim().replace(/\s+/g, "-").toLowerCase().replace(/[^a-z0-9\-_À-￿]/g, "").slice(0, 60)
    if (!name) throw new ConvexError("Give the channel a name")
    return name
}

export const createChannel = mutation({
    args: { workspaceId: v.id("workspaces"), name: v.string(), description: v.optional(v.string()) },
    handler: async (ctx, args) => {
        const { member, workspace } = await requireActor(ctx, args.workspaceId)
        if (!isAdminLike(workspace, member)) throw new ConvexError("Only the owner or an admin can import")
        const name = cleanChannelName(args.name)
        const existing = await ctx.db.query("channels").withIndex("byWorkspaceId", (q) => q.eq("workspaceId", args.workspaceId)).take(1000)
        if (existing.some((c) => c.name === name)) throw new ConvexError(`A channel named #${name} already exists`)
        const { allowed, limit, plan } = await checkLimit(ctx, args.workspaceId, "channels", existing.length)
        if (!allowed) throw new ConvexError(`LIMIT_REACHED:channels:${limit}:${plan}`)
        const description = args.description ? text(args.description, MAX.channelDescription, "Description").slice(0, MAX.channelDescription) : undefined
        const id = await ctx.db.insert("channels", { name, workspaceId: args.workspaceId, description })
        await logAudit(ctx, args.workspaceId, member._id, "import.channel", `#${name}`)
        return id
    },
})

const fmt = (ts: number) => new Date(ts).toISOString().replace("T", " ").slice(0, 16) + " UTC"

export const addMessages = mutation({
    args: {
        channelId: v.id("channels"),
        items: v.array(v.object({ author: v.string(), ts: v.number(), text: v.string(), isReply: v.optional(v.boolean()) })),
    },
    handler: async (ctx, args) => {
        if (args.items.length === 0 || args.items.length > 100) throw new ConvexError("Send between 1 and 100 messages at a time")
        const channel = await ctx.db.get(args.channelId)
        if (!channel) throw new ConvexError("Channel not found")
        const { member, workspace, userId } = await requireActor(ctx, channel.workspaceId)
        if (!isAdminLike(workspace, member)) throw new ConvexError("Only the owner or an admin can import")

        if (!(await consume(ctx, `import-msgs:${userId}`, MAX_MESSAGES_PER_DAY, 24 * 60 * 60_000))) {
            throw new ConvexError("Daily import limit reached. Try again tomorrow.")
        }
        const already = await ctx.db.query("messages").withIndex("by_channel_id", (q) => q.eq("channelId", args.channelId)).take(MAX_CHANNEL_MESSAGES + 1)
        if (already.length + args.items.length > MAX_CHANNEL_MESSAGES + 100) throw new ConvexError("This channel is too large to import more messages into")

        for (const it of args.items) {
            const head = `${it.isReply ? "Reply · " : ""}${it.author.slice(0, 80)} · ${fmt(it.ts)}\n`
            const body = JSON.stringify({
                ops: [
                    { insert: head, attributes: { bold: true } },
                    { insert: it.text.slice(0, 8000) + "\n" },
                ],
            })
            await ctx.db.insert("messages", { body, memberId: member._id, workspaceId: channel.workspaceId, channelId: args.channelId })
        }
        return args.items.length
    },
})

export const addNotes = mutation({
    args: {
        workspaceId: v.id("workspaces"),
        items: v.array(v.object({ title: v.string(), body: v.string() })),
    },
    handler: async (ctx, args) => {
        if (args.items.length === 0 || args.items.length > 20) throw new ConvexError("Send between 1 and 20 pages at a time")
        const { member, workspace, userId } = await requireActor(ctx, args.workspaceId)
        if (!isAdminLike(workspace, member)) throw new ConvexError("Only the owner or an admin can import")
        if (!(await consume(ctx, `import-notes:${userId}`, 1000, 24 * 60 * 60_000))) throw new ConvexError("Daily import limit reached. Try again tomorrow.")

        let created = 0
        for (const it of args.items) {
            const { allowed, limit, plan } = await checkLimitLazy(ctx, args.workspaceId, "workspaceNotes", async (cap) =>
                (await ctx.db.query("notes").withIndex("by_workspace_id_type", (q) => q.eq("workspaceId", args.workspaceId).eq("type", "workspace")).take(cap)).length,
            )
            if (!allowed) {
                if (created === 0) throw new ConvexError(`LIMIT_REACHED:workspaceNotes:${limit}:${plan}`)
                break
            }
            const title = it.title.replace(/\s+/g, " ").trim().slice(0, MAX.noteTitle) || "Untitled"
            await ctx.db.insert("notes", {
                title,
                body: it.body.slice(0, MAX.noteBody),
                workspaceId: args.workspaceId,
                authorId: member._id,
                type: "workspace",
                isPinned: false,
                updatedAt: Date.now(),
            })
            created++
        }
        if (created > 0) await logAudit(ctx, args.workspaceId, member._id, "import.notes", `${created} pages`)
        return created
    },
})
