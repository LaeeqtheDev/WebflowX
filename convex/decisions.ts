import { v } from "convex/values"
import { internalAction, internalMutation, internalQuery, query } from "./_generated/server"
import { internal } from "./_generated/api"
import { signedInMember } from "./agents"
import { chat } from "./agentRunner"
import { putDecision } from "./knowledge"

// The Decisions log: after a meeting summary is saved, the small model pulls out what was decided (one cheap call),
// so decisions are searchable, show up in meeting prep and the weekly digest, and are listed on the Agents page.

const MAX_DECISIONS = 8

export const source = internalQuery({
    args: { meetingId: v.id("meetings") },
    handler: async (ctx, args) => {
        const m = await ctx.db.get(args.meetingId)
        if (!m || m.deletedAt || m.sample || m.kind === "oneToOne" || !m.summary?.trim()) return null
        return { title: m.title, summary: m.summary.slice(0, 8_000) }
    },
})

export const extract = internalAction({
    args: { meetingId: v.id("meetings") },
    handler: async (ctx, args): Promise<null> => {
        const key = process.env.GROQ_API_KEY
        if (!key) return null
        const m = await ctx.runQuery(internal.decisions.source, { meetingId: args.meetingId })
        if (!m) return null
        const left: number = await ctx.runQuery(internal.aiBudget.left, { tier: "small" })
        if (left < 3_000) return null
        const usage = { model: null as string | null, tokensIn: 0, tokensOut: 0 }
        let lines: string[] = []
        try {
            const reply = await chat(key, [
                { role: "system", content: "List the decisions made in this meeting summary: things the team agreed or chose, not tasks or discussion. One per line, starting with \"- \", each a short complete sentence. If there were none, reply with just: NONE" },
                { role: "user", content: `Meeting: ${m.title}\n\n${m.summary}` },
            ], [], usage, "small")
            const text = reply?.content ?? ""
            lines = text.split("\n").map((l) => l.trim()).filter((l) => /^[-•*]\s+/.test(l)).map((l) => l.replace(/^[-•*]\s+/, "").trim()).filter((l) => l.length > 5)
        } catch (e) {
            console.error("decision extraction failed", e)
        }
        if (usage.model) await ctx.runMutation(internal.aiBudget.add, { model: usage.model, tokens: usage.tokensIn + usage.tokensOut })
        await ctx.runMutation(internal.decisions.save, { meetingId: args.meetingId, items: lines.slice(0, MAX_DECISIONS) })
        return null
    },
})

export const save = internalMutation({
    args: { meetingId: v.id("meetings"), items: v.array(v.string()) },
    handler: async (ctx, args) => {
        const m = await ctx.db.get(args.meetingId)
        if (!m) return null
        // a re-saved summary replaces what was pulled from it before
        const old = await ctx.db.query("decisions").withIndex("by_meeting", (q) => q.eq("meetingId", m._id)).take(50)
        for (const d of old) {
            const k = await ctx.db.query("knowledge").withIndex("by_ref", (q) => q.eq("refId", d._id)).unique()
            if (k) await ctx.db.delete(k._id)
            await ctx.db.delete(d._id)
        }
        for (const text of args.items) {
            const id = await ctx.db.insert("decisions", { workspaceId: m.workspaceId, meetingId: m._id, text: text.slice(0, 400) })
            const d = await ctx.db.get(id)
            if (d) await putDecision(ctx, d, m.title)
        }
        return null
    },
})

export const list = query({
    args: { workspaceId: v.id("workspaces") },
    handler: async (ctx, args) => {
        const member = await signedInMember(ctx, args.workspaceId).catch(() => null)
        if (!member) return []
        const rows = await ctx.db.query("decisions").withIndex("by_workspace", (q) => q.eq("workspaceId", args.workspaceId)).order("desc").take(60)
        const titles = new Map<string, { title: string; at: number } | null>()
        const out = []
        for (const d of rows) {
            const key = d.meetingId ? String(d.meetingId) : ""
            if (d.meetingId && !titles.has(key)) {
                const m = await ctx.db.get(d.meetingId)
                // private one-to-one calls never surface here
                titles.set(key, m && !m.deletedAt && m.kind !== "oneToOne" ? { title: m.title, at: m.startedAt } : null)
            }
            const meeting = d.meetingId ? titles.get(key) : null
            if (d.meetingId && !meeting) continue
            out.push({ _id: d._id, text: d.text, meetingId: d.meetingId ?? null, meetingTitle: meeting?.title ?? null, at: meeting?.at ?? d._creationTime })
        }
        return out
    },
})
