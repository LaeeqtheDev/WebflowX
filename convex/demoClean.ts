// ONE-OFF TOOL: removes everything the owner's account created or shared in the demo workspace (messages,
// replies to them, DMs, files, pages, databases, notes, tasks, meetings, notifications), but keeps the
// account, the workspace, its members and its channels. Run it BEFORE importing the seed so the seed is untouched.
// Internal only: callable from `npx convex run` or the dashboard, never from the app.
//
//   npx convex run demoClean:run "{workspaceId:'...',userId:'...',mode:'PREVIEW'}"   (counts only)
//   npx convex run demoClean:run "{workspaceId:'...',userId:'...',mode:'DELETE'}"    (deletes)
import { v, ConvexError } from "convex/values"
import { internal } from "./_generated/api"
import { Id } from "./_generated/dataModel"
import { internalMutation } from "./_generated/server"

const CAP = 3000

export const run = internalMutation({
    args: { workspaceId: v.id("workspaces"), userId: v.id("users"), mode: v.union(v.literal("PREVIEW"), v.literal("DELETE")) },
    handler: async (ctx, args) => {
        const del = args.mode === "DELETE"
        const me = await ctx.db.query("members").withIndex("byWorkspaceId_user_id", (q) => q.eq("workspaceId", args.workspaceId).eq("userId", args.userId)).unique()
        if (!me) throw new ConvexError("That user is not a member of that workspace")
        const n: Record<string, number> = {}
        const bump = (k: string, by = 1) => { n[k] = (n[k] ?? 0) + by }
        const removeStorage = async (id?: Id<"_storage">) => { if (id && del) { try { await ctx.storage.delete(id) } catch { /* already gone */ } } }

        // ---- conversations the owner is part of, and every message in them
        const convs = [
            ...(await ctx.db.query("conversations").withIndex("by_member_one", (q) => q.eq("memberOneId", me._id)).take(200)),
            ...(await ctx.db.query("conversations").withIndex("by_member_two", (q) => q.eq("memberTwoId", me._id)).take(200)),
        ].filter((c) => c.workspaceId === args.workspaceId)
        const convIds = new Set(convs.map((c) => c._id))

        // ---- messages: the owner's own, replies to them, and all DM messages
        const doomed = new Map<Id<"messages">, true>()
        const mine = await ctx.db.query("messages").withIndex("by_member_id", (q) => q.eq("memberId", me._id)).take(CAP)
        if (mine.length === CAP) n.truncatedMessages = 1
        for (const m of mine) if (m.workspaceId === args.workspaceId) doomed.set(m._id, true)
        for (const c of convs) {
            for (const m of await ctx.db.query("messages").withIndex("by_conversation_id", (q) => q.eq("conversationId", c._id)).take(CAP)) doomed.set(m._id, true)
        }
        for (const id of [...doomed.keys()]) {
            for (const r of await ctx.db.query("messages").withIndex("by_parent_message_id", (q) => q.eq("parentMessagesId", id)).take(500)) doomed.set(r._id, true)
        }
        for (const id of doomed.keys()) {
            const m = await ctx.db.get(id)
            if (!m) continue
            for (const r of await ctx.db.query("reactions").withIndex("by_message_id", (q) => q.eq("messageId", id)).take(500)) { bump("reactions"); if (del) await ctx.db.delete(r._id) }
            for (const a of await ctx.db.query("attachments").withIndex("by_message_id", (q) => q.eq("messageId", id)).take(50)) { bump("attachments"); await removeStorage(a.storageId); if (del) await ctx.db.delete(a._id) }
            for (const p of await ctx.db.query("pins").withIndex("by_message_id", (q) => q.eq("messageId", id)).take(20)) { bump("pins"); if (del) await ctx.db.delete(p._id) }
            for (const s of await ctx.db.query("savedMessages").withIndex("by_message_id", (q) => q.eq("messageId", id)).take(50)) { bump("savedMessages"); if (del) await ctx.db.delete(s._id) }
            await removeStorage(m.image); await removeStorage(m.file)
            bump("messages")
            if (del) await ctx.db.delete(id)
        }
        for (const c of convs) { bump("conversations"); if (del) await ctx.db.delete(c._id) }
        // reactions the owner left on other people's messages
        for (const r of await ctx.db.query("reactions").withIndex("by_member_id", (q) => q.eq("memberId", me._id)).take(CAP)) { bump("reactions"); if (del) await ctx.db.delete(r._id) }

        // ---- notes
        for (const x of await ctx.db.query("notes").withIndex("by_author_id", (q) => q.eq("authorId", me._id)).take(CAP)) { bump("notes"); if (del) await ctx.db.delete(x._id) }

        // ---- tasks the owner created or owns, with their comments; plus the owner's comments elsewhere
        const tasks = (await ctx.db.query("tasks").withIndex("by_workspace_id", (q) => q.eq("workspaceId", args.workspaceId)).take(CAP)).filter((t) => t.createdBy === me._id || t.assigneeId === me._id)
        for (const t of tasks) {
            for (const c of await ctx.db.query("taskComments").withIndex("by_task_id", (q) => q.eq("taskId", t._id)).take(500)) { bump("taskComments"); if (del) await ctx.db.delete(c._id) }
            bump("tasks"); if (del) await ctx.db.delete(t._id)
        }

        // ---- pages, databases, templates
        const docs = (await ctx.db.query("docs").withIndex("by_workspace_id", (q) => q.eq("workspaceId", args.workspaceId)).take(CAP))
        const docIds = new Set(docs.filter((d) => d.createdBy === me._id).map((d) => d._id))
        let grew = true
        while (grew) { grew = false; for (const d of docs) if (d.parentId && docIds.has(d.parentId) && !docIds.has(d._id)) { docIds.add(d._id); grew = true } }
        let removedRows = 0
        for (const d of docs.filter((x) => docIds.has(x._id))) {
            for (const c of await ctx.db.query("dbConfigs").withIndex("by_doc_id", (q) => q.eq("docId", d._id)).take(5)) { if (del) await ctx.db.delete(c._id) }
            const rows = await ctx.db.query("dbRows").withIndex("by_database_id", (q) => q.eq("databaseId", d._id)).take(CAP)
            for (const r of rows) { removedRows++; if (del) { await ctx.db.delete(r._id); if (r.hasBody) await ctx.scheduler.runAfter(0, internal.liveblocks.deleteRoom, { roomId: r.roomId }) } }
            for (const c of await ctx.db.query("dbCounts").withIndex("by_key", (q) => q.eq("key", `db:${d._id}`)).take(2)) { if (del) await ctx.db.delete(c._id) }
            for (const f of await ctx.db.query("docFavorites").withIndex("by_doc_id", (q) => q.eq("docId", d._id)).take(200)) { if (del) await ctx.db.delete(f._id) }
            bump("docs"); if (del) { await ctx.db.delete(d._id); await ctx.scheduler.runAfter(0, internal.liveblocks.deleteRoom, { roomId: d.liveblocksRoomId }) }
        }
        if (removedRows) {
            bump("dbRows", removedRows)
            const ws = await ctx.db.query("dbCounts").withIndex("by_key", (q) => q.eq("key", `ws:${args.workspaceId}`)).unique()
            if (ws && del) await ctx.db.patch(ws._id, { count: Math.max(0, ws.count - removedRows) })
        }
        for (const t of await ctx.db.query("docTemplates").withIndex("by_workspace_id", (q) => q.eq("workspaceId", args.workspaceId)).take(200)) if (t.createdBy === me._id) { bump("docTemplates"); if (del) await ctx.db.delete(t._id) }

        // ---- meetings the owner started
        const meetings = (await ctx.db.query("meetings").withIndex("by_workspace_id", (q) => q.eq("workspaceId", args.workspaceId)).take(CAP)).filter((m) => m.createdBy === me._id)
        for (const m of meetings) {
            for (const t of await ctx.db.query("meetingTranscripts").withIndex("by_meeting_id", (q) => q.eq("meetingId", m._id)).take(300)) { bump("meetingTranscripts"); if (del) await ctx.db.delete(t._id) }
            for (const l of await ctx.db.query("aiSummaryLog").withIndex("by_meeting_id", (q) => q.eq("meetingId", m._id)).take(50)) { if (del) await ctx.db.delete(l._id) }
            bump("meetings"); if (del) await ctx.db.delete(m._id)
        }

        // ---- uploaded files
        const files = (await ctx.db.query("files").withIndex("by_workspace_id", (q) => q.eq("workspaceId", args.workspaceId)).take(CAP)).filter((f) => f.uploadedBy === args.userId)
        for (const f of files) { bump("files"); await removeStorage(f.storageId); if (del) await ctx.db.delete(f._id) }

        // ---- notifications to or from the owner
        for (const x of await ctx.db.query("notifications").withIndex("by_workspace_recipient", (q) => q.eq("workspaceId", args.workspaceId).eq("recipientId", me._id)).take(CAP)) { bump("notifications"); if (del) await ctx.db.delete(x._id) }

        return { mode: args.mode, keeps: "account, workspace, members, channels", ...n }
    },
})
