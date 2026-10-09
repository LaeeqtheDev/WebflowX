// Read-only helper for building the demo seed file. Internal only: run it with `npx convex run`.
// It reports the kept workspace, its owner member and channels, and the number of every table, which
// the seed generator needs to write valid document ids.
import { v } from "convex/values"
import { internalQuery } from "./_generated/server"
import schema from "./schema"

const ALPHABET = "0123456789abcdefghjkmnpqrstvwxyz"

// Same layout the real ids use: varint table number, 16 id bytes, 2 checksum bytes, base32.
const mintId = (tableNumber: number): string => {
    const bytes: number[] = []
    let n = tableNumber
    while (n >= 0x80) { bytes.push((n & 0x7f) | 0x80); n >>= 7 }
    bytes.push(n)
    for (let i = 0; i < 16; i++) bytes.push((i * 37 + 11) & 0xff)
    let s1 = 0, s2 = 0
    for (const b of bytes) { s1 = (s1 + b) % 256; s2 = (s2 + s1) % 256 }
    bytes.push(s1, s2)
    // base32 from the least significant end, with plain numbers (no BigInt, the build targets ES2017)
    let out = ""
    let acc = 0
    let accBits = 0
    for (let i = bytes.length - 1; i >= 0; i--) {
        acc |= bytes[i] << accBits
        accBits += 8
        while (accBits >= 5) { out = ALPHABET[acc & 31] + out; acc >>= 5; accBits -= 5 }
    }
    if (accBits > 0) out = ALPHABET[acc & 31] + out
    return out
}

export const info = internalQuery({
    args: { workspaceId: v.id("workspaces") },
    handler: async (ctx, args) => {
        const workspace = await ctx.db.get(args.workspaceId)
        if (!workspace) throw new Error("workspace not found")

        const members = await ctx.db.query("members").withIndex("byWorkspaceId", (q) => q.eq("workspaceId", args.workspaceId)).take(100)
        const channels = await ctx.db.query("channels").withIndex("byWorkspaceId", (q) => q.eq("workspaceId", args.workspaceId)).take(100)
        const conversations = await ctx.db.query("conversations").withIndex("byWorkspaceId", (q) => q.eq("workspaceId", args.workspaceId)).take(100)
        const docs = await ctx.db.query("docs").withIndex("by_workspace_id", (q) => q.eq("workspaceId", args.workspaceId)).take(100)

        // find each table's number by asking which table accepts a well-formed id with that number
        const tableNames = Object.keys(schema.tables)
        const tableNumbers: Record<string, number> = {}
        for (let n = 10001; n < 10200; n++) {
            const id = mintId(n)
            for (const name of tableNames) {
                if (tableNumbers[name] !== undefined) continue
                let ok = false
                try { ok = ctx.db.normalizeId(name as never, id) !== null } catch { ok = false }
                if (ok) { tableNumbers[name] = n; break }
            }
        }

        return {
            workspace: { id: workspace._id, name: workspace.name, plan: workspace.plan ?? null, ownerUserId: workspace.userId },
            members: members.map((m) => ({ id: m._id, userId: m.userId, role: m.role })),
            channels: channels.map((c) => ({ id: c._id, name: c.name, isPrivate: c.isPrivate ?? false })),
            conversations: conversations.length,
            docs: docs.map((d) => ({ id: d._id, title: d.title, type: d.type })),
            tableNumbers,
            missingTables: tableNames.filter((t) => tableNumbers[t] === undefined),
        }
    },
})
