import { v } from "convex/values"
import { mutation, query, action, MutationCtx } from "./_generated/server"
import { Id } from "./_generated/dataModel"
import { findMember } from "./access"
import { auth } from "./auth"
import { api } from "./_generated/api"
import { checkLimit } from "./limits"
import { ConvexError } from "convex/values"


const requireMeetingMember = async (ctx: MutationCtx, meetingId: Id<"meetings">) => {
    const userId = await auth.getUserId(ctx)
    if (!userId) throw new Error("Unauthorized")
    const meeting = await ctx.db.get(meetingId)
    if (!meeting) throw new Error("Meeting not found")
    const member = await findMember(ctx, meeting.workspaceId, userId)
    if (!member) throw new Error("Unauthorized")
    return { meeting, member }
}

export const get = query({
    args: { workspaceId: v.id("workspaces") },
    handler: async (ctx, args) => {
        const userId = await auth.getUserId(ctx)
        if (!userId) return []

        const member = await ctx.db
            .query("members")
            .withIndex("byWorkspaceId_user_id", (q) =>
                q.eq("workspaceId", args.workspaceId).eq("userId", userId)
            ).unique()

        if (!member) return []

        const meetings = await ctx.db
            .query("meetings")
            .withIndex("by_workspace_id", (q) =>
                q.eq("workspaceId", args.workspaceId)
            )
            .order("desc")
            .collect()

        return await Promise.all(meetings.map(async (meeting) => {
            const creator = await ctx.db.get(meeting.createdBy)
            const creatorUser = creator ? await ctx.db.get(creator.userId) : null
            return { ...meeting, creator: creator ? { ...creator, user: creatorUser } : null }
        }))
    }
})


// ---- Live call tracking -----------------------------------------------------

export const join = mutation({
    args: { id: v.id("meetings") },
    handler: async (ctx, args) => {
        const { meeting, member } = await requireMeetingMember(ctx, args.id)
        if (meeting.endedAt) throw new ConvexError("This meeting has already ended")

        const user = await ctx.db.get(member.userId)
        const name = user?.name ?? "Guest"

        const active = new Set(meeting.activeMembers ?? [])
        active.add(member._id)
        const participants = new Set(meeting.participants ?? [])
        participants.add(name)

        await ctx.db.patch(args.id, {
            activeMembers: Array.from(active),
            participants: Array.from(participants),
        })
        return args.id
    }
})

// Called when someone leaves. Saves their part of the transcript and ends the meeting once the room is empty.
export const leave = mutation({
    args: {
        id: v.id("meetings"),
        transcript: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const { meeting, member } = await requireMeetingMember(ctx, args.id)

        const body = (args.transcript ?? "").slice(0, 400_000)
        if (body.trim().length > 0) {
            await ctx.db.insert("meetingTranscripts", {
                meetingId: args.id,
                workspaceId: meeting.workspaceId,
                memberId: member._id,
                body,
            })
        }

        const remaining = (meeting.activeMembers ?? []).filter(m => m !== member._id)
        const ended = remaining.length === 0
        await ctx.db.patch(args.id, {
            activeMembers: remaining,
            ...(ended && !meeting.endedAt ? { endedAt: Date.now() } : {}),
        })
        return { ended: ended && !meeting.endedAt }
    }
})

// Admins or the person who started the meeting can close a call that got stuck open.
export const endForEveryone = mutation({
    args: { id: v.id("meetings") },
    handler: async (ctx, args) => {
        const { meeting, member } = await requireMeetingMember(ctx, args.id)
        if (member.role !== "admin" && meeting.createdBy !== member._id) {
            throw new ConvexError("Only an admin or the meeting host can end it for everyone")
        }
        if (meeting.endedAt) return args.id
        await ctx.db.patch(args.id, { endedAt: Date.now(), activeMembers: [] })
        return args.id
    }
})

// All participants' transcripts merged into one chronological text.
export const getTranscript = query({
    args: { id: v.id("meetings") },
    handler: async (ctx, args) => {
        const userId = await auth.getUserId(ctx)
        if (!userId) return ""
        const meeting = await ctx.db.get(args.id)
        if (!meeting) return ""
        const member = await findMember(ctx, meeting.workspaceId, userId)
        if (!member) return ""

        const rows = await ctx.db
            .query("meetingTranscripts")
            .withIndex("by_meeting_id", (q) => q.eq("meetingId", args.id))
            .collect()

        const lines: { t: number; speaker: string; text: string }[] = []
        for (const row of rows) {
            for (const line of row.body.split("\n")) {
                const [t, speaker, ...rest] = line.split("\t")
                const time = Number(t)
                const text = rest.join(" ").trim()
                if (!Number.isFinite(time) || !text) continue
                lines.push({ t: time, speaker: speaker || "Speaker", text })
            }
        }
        lines.sort((a, b) => a.t - b.t)

        return lines
            .map(l => {
                const secs = Math.max(0, Math.round((l.t - meeting.startedAt) / 1000))
                const mm = String(Math.floor(secs / 60)).padStart(2, "0")
                const ss = String(secs % 60).padStart(2, "0")
                return `[${mm}:${ss}] ${l.speaker}: ${l.text}`
            })
            .join("\n")
    }
})

// Reserve one AI summary against the plan's monthly limit before calling the AI.
// auto=true is used for the automatic end-of-meeting summary and only fires once per meeting.
export const claimSummary = mutation({
    args: { id: v.id("meetings"), auto: v.optional(v.boolean()) },
    handler: async (ctx, args) => {
        const { meeting, member } = await requireMeetingMember(ctx, args.id)

        if (args.auto) {
            const existing = await ctx.db
                .query("aiSummaryLog")
                .withIndex("by_meeting_id", (q) => q.eq("meetingId", args.id))
                .first()
            if (existing) return { allowed: false as const, reason: "already_generated" as const }
        }

        const now = new Date()
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime()
        const used = await ctx.db
            .query("aiSummaryLog")
            .withIndex("by_workspace_id", (q) =>
                q.eq("workspaceId", meeting.workspaceId).gte("_creationTime", startOfMonth)
            )
            .collect()

        const { allowed, limit, plan } = await checkLimit(ctx, meeting.workspaceId, "aiSummaries", used.length)
        if (!allowed) {
            throw new ConvexError(`LIMIT_REACHED:aiSummaries:${limit}:${plan}`)
        }

        await ctx.db.insert("aiSummaryLog", {
            workspaceId: meeting.workspaceId,
            meetingId: args.id,
            memberId: member._id,
        })
        return { allowed: true as const }
    }
})

export const create = mutation({
    args: {
        workspaceId: v.id("workspaces"),
        title: v.string(),
        roomName: v.string(),
    },
    handler: async (ctx, args) => {
        const userId = await auth.getUserId(ctx)
        if (!userId) throw new Error("Unauthorized")

        const member = await ctx.db
            .query("members")
            .withIndex("byWorkspaceId_user_id", (q) =>
                q.eq("workspaceId", args.workspaceId).eq("userId", userId)
            ).unique()

        if (!member) throw new Error("Unauthorized")

        // Only count meetings from this month for limit check
        const now = new Date()
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime()

        const existingMeetings = await ctx.db
            .query("meetings")
            .withIndex("by_workspace_id", (q) => q.eq("workspaceId", args.workspaceId))
            .filter((q) => q.gte(q.field("startedAt"), startOfMonth))
            .collect()

        const { allowed, limit, plan } = await checkLimit(
            ctx, args.workspaceId, "meetings", existingMeetings.length
        )

        if (!allowed) {
            throw new ConvexError(`LIMIT_REACHED:meetings:${limit}:${plan}`)
        }

        return await ctx.db.insert("meetings", {
            workspaceId: args.workspaceId,
            title: args.title,
            roomName: args.roomName,
            createdBy: member._id,
            startedAt: Date.now(),
            activeMembers: [],
        })
    }
})

export const end = mutation({
    args: {
        id: v.id("meetings"),
        participants: v.optional(v.array(v.string())),
    },
    handler: async (ctx, args) => {
        await requireMeetingMember(ctx, args.id)

        await ctx.db.patch(args.id, {
            endedAt: Date.now(),
            participants: args.participants,
        })

        return args.id
    }
})

export const saveSummary = mutation({
    args: {
        id: v.id("meetings"),
        summary: v.string(),
        transcript: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        await requireMeetingMember(ctx, args.id)
        await ctx.db.patch(args.id, {
            summary: args.summary,
            transcript: args.transcript,
        })
        return args.id
    }
})

export const generateSummary = action({
    args: {
        meetingId: v.id("meetings"),
        transcript: v.string(),
    },
    handler: async (ctx, args) => {
        const userId = await auth.getUserId(ctx)
        if (!userId) throw new Error("Unauthorized")
        if (args.transcript.length > 100_000) throw new Error("Transcript too long")

        const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${process.env.GROQ_API_KEY}`,
            },
            body: JSON.stringify({
                model: "llama-3.3-70b-versatile",
                max_tokens: 1024,
                messages: [{
                    role: "user",
                    content: `You are a meeting summarizer. Analyze this meeting transcript and provide a structured summary.

Transcript:
${args.transcript}

Provide the summary in this exact format:
**Meeting Summary**

**Key Points:**
- List the main topics discussed

**Decisions Made:**
- List any decisions that were made

**Action Items:**
- List any tasks or next steps mentioned

**Overall:**
A 2-3 sentence overview of the meeting.`
                }]
            })
        })

        const data = await response.json()
        const summary = data.choices?.[0]?.message?.content ?? "Unable to generate summary."

        await ctx.runMutation(api.meetings.saveSummary, {
            id: args.meetingId,
            summary,
            transcript: args.transcript,
        })

        return summary
    }
})

// Used by the /api/livekit route: only members of the meeting's workspace get a token,
// and only for meetings that are still running. Identity is derived server-side.
export const authorizeRoom = query({
    args: { roomName: v.string() },
    handler: async (ctx, args) => {
        const userId = await auth.getUserId(ctx)
        if (!userId) return null
        const meeting = await ctx.db
            .query("meetings")
            .withIndex("by_room_name", (q) => q.eq("roomName", args.roomName))
            .first()
        if (!meeting || meeting.endedAt) return null
        const member = await findMember(ctx, meeting.workspaceId, userId)
        if (!member) return null
        const user = await ctx.db.get(userId)
        return {
            identity: member._id as string,
            name: user?.name ?? user?.email ?? "Member",
        }
    },
})
