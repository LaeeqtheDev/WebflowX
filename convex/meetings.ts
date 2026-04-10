import { v } from "convex/values"
import { mutation, query, action } from "./_generated/server"
import { auth } from "./auth"
import { api } from "./_generated/api"
import { checkLimit } from "./limits"

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
            throw new Error(`LIMIT_REACHED:meetings:${limit}:${plan}`)
        }

        return await ctx.db.insert("meetings", {
            workspaceId: args.workspaceId,
            title: args.title,
            roomName: args.roomName,
            createdBy: member._id,
            startedAt: Date.now(),
        })
    }
})

export const end = mutation({
    args: {
        id: v.id("meetings"),
        participants: v.optional(v.array(v.string())),
    },
    handler: async (ctx, args) => {
        const userId = await auth.getUserId(ctx)
        if (!userId) throw new Error("Unauthorized")

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