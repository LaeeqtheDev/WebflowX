import { v } from "convex/values"
import { mutation, query, internalMutation, MutationCtx } from "./_generated/server"
import { Id } from "./_generated/dataModel"
import { findMember } from "./access"
import { auth } from "./auth"
import { can } from "./permissions"
import { checkLimit } from "./limits"
import { MAX, text } from "./validate"
import { throttle } from "./rateLimit"
import { ConvexError } from "convex/values"


const requireMeetingMember = async (ctx: MutationCtx, meetingId: Id<"meetings">) => {
    const userId = await auth.getUserId(ctx)
    if (!userId) throw new Error("Unauthorized")
    const meeting = await ctx.db.get(meetingId)
    if (!meeting) throw new Error("Meeting not found")
    const member = await findMember(ctx, meeting.workspaceId, userId)
    if (!member || member.role === "guest") throw new Error("Unauthorized")
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

        if (!member || member.role === "guest") return []

        const meetings = await ctx.db
            .query("meetings")
            .withIndex("by_workspace_id", (q) =>
                q.eq("workspaceId", args.workspaceId)
            )
            .order("desc")
            .take(200)

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
        if ((meeting.kicked ?? []).includes(member._id)) {
            throw new ConvexError("You were removed from this meeting by the host")
        }

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
        if (meeting.createdBy !== member._id && !(await can(ctx, member, "moderateMeetings"))) {
            throw new ConvexError("Only the meeting host or a moderator can end it for everyone")
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
        if (!member || member.role === "guest") return ""

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

        if (!member || member.role === "guest") throw new Error("Unauthorized")
        if (!(await can(ctx, member, "startMeetings"))) throw new ConvexError("You don't have permission to start meetings")
        await throttle(ctx, userId, "meeting-create", 10, 60 * 60_000, "starting meetings")
        const title = text(args.title, MAX.meetingTitle, "Meeting title", { required: true, collapse: true })
        const roomName = text(args.roomName, MAX.roomName, "Room name", { required: true })

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
            title,
            roomName,
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
        const { meeting, member } = await requireMeetingMember(ctx, args.id)
        if (meeting.createdBy !== member._id && !(await can(ctx, member, "moderateMeetings"))) {
            throw new ConvexError("Only the meeting host or a moderator can end it")
        }
        if (meeting.endedAt) return args.id

        await ctx.db.patch(args.id, {
            endedAt: Date.now(),
            participants: args.participants?.slice(0, 200).map((n) => n.slice(0, 80)),
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
        const { meeting, member } = await requireMeetingMember(ctx, args.id)
        // the host, moderators, and whoever claimed an AI summary credit for this meeting may write the summary
        let allowed = meeting.createdBy === member._id || (await can(ctx, member, "moderateMeetings"))
        if (!allowed) {
            const claims = await ctx.db
                .query("aiSummaryLog")
                .withIndex("by_meeting_id", (q) => q.eq("meetingId", args.id))
                .take(50)
            allowed = claims.some((c) => c.memberId === member._id)
        }
        if (!allowed) throw new ConvexError("Only the meeting host or the person who generated the summary can save it")
        if (args.summary.length > MAX.summary) throw new ConvexError("That summary is too long")
        if (args.transcript && args.transcript.length > MAX.transcript) throw new ConvexError("That transcript is too long")
        await ctx.db.patch(args.id, {
            summary: args.summary,
            transcript: args.transcript,
        })
        return args.id
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
        if (!member || member.role === "guest") return null
        if ((meeting.kicked ?? []).includes(member._id)) return null
        const user = await ctx.db.get(userId)
        return {
            meetingId: meeting._id,
            host: meeting.createdBy === member._id || (await can(ctx, member, "moderateMeetings")),
            identity: member._id as string,
            name: user?.name ?? user?.email ?? "Member",
        }
    },
})

// Host removes someone from the call. The /api/livekit/moderate route then drops them from the room.
export const kickMember = mutation({
    args: { id: v.id("meetings"), memberId: v.id("members") },
    handler: async (ctx, args) => {
        const { meeting, member } = await requireMeetingMember(ctx, args.id)
        if (meeting.createdBy !== member._id && !(await can(ctx, member, "moderateMeetings"))) {
            throw new ConvexError("Only the meeting host or a moderator can remove people")
        }
        if (args.memberId === member._id) throw new ConvexError("You can't remove yourself")
        if (args.memberId === meeting.createdBy) throw new ConvexError("You can't remove the person who started the meeting")
        const targetMember = await ctx.db.get(args.memberId)
        if (targetMember?.role === "admin" && member.role !== "admin") {
            throw new ConvexError("You can't remove an admin from a meeting")
        }
        const target = await ctx.db.get(args.memberId)
        if (!target || target.workspaceId !== meeting.workspaceId) throw new ConvexError("Member not found")

        const kicked = new Set(meeting.kicked ?? [])
        kicked.add(args.memberId)
        await ctx.db.patch(args.id, {
            kicked: Array.from(kicked),
            activeMembers: (meeting.activeMembers ?? []).filter((m) => m !== args.memberId),
        })
        return args.id
    },
})

// AI summary credits: /api/ai-summary refuses to run unless the caller has just claimed one,
// so the monthly plan limit is enforced on the server and not only in the browser.
const CLAIM_TTL_MS = 15 * 60 * 1000

export const hasSummaryClaim = query({
    args: { id: v.id("meetings") },
    handler: async (ctx, args) => {
        const userId = await auth.getUserId(ctx)
        if (!userId) return false
        const meeting = await ctx.db.get(args.id)
        if (!meeting) return false
        const member = await findMember(ctx, meeting.workspaceId, userId)
        if (!member || member.role === "guest") return false
        const rows = await ctx.db
            .query("aiSummaryLog")
            .withIndex("by_meeting_id", (q) => q.eq("meetingId", args.id))
            .order("desc")
            .take(10)
        return rows.some(
            (r) => r.memberId === member._id && !r.consumed && Date.now() - r._creationTime < CLAIM_TTL_MS
        )
    },
})

export const consumeSummaryClaim = mutation({
    args: { id: v.id("meetings") },
    handler: async (ctx, args) => {
        const { member } = await requireMeetingMember(ctx, args.id)
        const rows = await ctx.db
            .query("aiSummaryLog")
            .withIndex("by_meeting_id", (q) => q.eq("meetingId", args.id))
            .order("desc")
            .take(10)
        const row = rows.find(
            (r) => r.memberId === member._id && !r.consumed && Date.now() - r._creationTime < CLAIM_TTL_MS
        )
        if (row) await ctx.db.patch(row._id, { consumed: true })
        return !!row
    },
})

// Hourly: close calls that have been "live" for 12h+ (everyone closed the tab without leaving).
export const endStale = internalMutation({
    args: {},
    handler: async (ctx) => {
        const cutoff = Date.now() - 12 * 60 * 60 * 1000
        const stale = await ctx.db
            .query("meetings")
            .withIndex("by_ended_started", (q) => q.eq("endedAt", undefined).lt("startedAt", cutoff))
            .take(100)
        for (const m of stale) {
            await ctx.db.patch(m._id, { endedAt: Date.now(), activeMembers: [] })
        }
        return stale.length
    },
})
