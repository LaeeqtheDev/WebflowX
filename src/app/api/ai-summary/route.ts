import { NextRequest, NextResponse } from "next/server"
import { fetchQuery, fetchMutation } from "convex/nextjs"
import { Id } from "../../../../convex/_generated/dataModel"
import { api } from "../../../../convex/_generated/api"
import { getAuthToken, unauthorized, limited, tooMany } from "@/lib/api-guard"

const MAX_TRANSCRIPT = 60_000

export async function POST(req: NextRequest) {
    try {
        const authToken = await getAuthToken()
        if (!authToken) return unauthorized()
        const me = await fetchQuery(api.users.current, {}, { token: authToken })
        if (!me) return unauthorized()
        if (!(await limited(authToken, "ai-summary", me._id))) return tooMany()

        const body = await req.json().catch(() => null)
        const meetingId = typeof body?.meetingId === "string" ? (body.meetingId as Id<"meetings">) : null
        if (!meetingId) {
            return NextResponse.json({ error: "Missing meeting" }, { status: 400 })
        }
        // The plan's monthly limit is enforced here too: a summary needs a credit claimed in Convex just before.
        const hasClaim = await fetchQuery(api.meetings.hasSummaryClaim, { id: meetingId }, { token: authToken }).catch(() => false)
        if (!hasClaim) {
            return NextResponse.json({ error: "No AI summary credit available for this meeting" }, { status: 403 })
        }
        const raw = body?.transcript
        if (typeof raw !== "string") {
            return NextResponse.json({ error: "Transcript is too short or empty" }, { status: 400 })
        }
        const transcript = raw.slice(0, MAX_TRANSCRIPT)

        if (transcript.trim().length < 10) {
            return NextResponse.json(
                { error: "Transcript is too short or empty" }, 
                { status: 400 }
            )
        }

        const apiKey = process.env.GROQ_API_KEY
        
        if (!apiKey) {
            console.error("GROQ_API_KEY is not configured")
            return NextResponse.json(
                { error: "AI service is not configured. Please add GROQ_API_KEY to environment variables." }, 
                { status: 500 }
            )
        }

        const messages = [
            {
                role: "system",
                content: `You are a professional meeting summarizer. Your task is to analyze meeting transcripts and create clear, actionable summaries. Be concise but thorough. Focus on extracting key decisions, action items, and important discussion points.`
            },
            {
                role: "user",
                content: `Please analyze this meeting transcript and provide a structured summary.

TRANSCRIPT:
${transcript}

Provide the summary in this exact format:

📋 Meeting Summary

🎯 Key Points
- List the main topics discussed (3-5 bullet points)

✅ Decisions Made
- List any decisions that were made (if none, write "No explicit decisions recorded")

📌 Action Items
- List any tasks or next steps mentioned with owners if known (if none, write "No action items identified")

💡 Overall Summary
Write a 2-3 sentence overview of the meeting's purpose and outcome.`
            }
        ]

        // Models get retired from time to time: try the configured one, then fall back to others
        const models = [process.env.GROQ_MODEL, "llama-3.3-70b-versatile", "llama-3.1-8b-instant", "openai/gpt-oss-20b"]
            .filter((m, i, all): m is string => !!m && all.indexOf(m) === i)

        let response: Response | null = null
        let lastDetail = ""
        for (const model of models) {
            response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${apiKey}`,
                },
                body: JSON.stringify({ model, max_tokens: 1024, temperature: 0.3, messages }),
            })
            if (response.ok) break
            lastDetail = await response.text().catch(() => "")
            console.error(`Groq API error (${model}, ${response.status}):`, lastDetail)
            // only a retired / unknown model is worth trying the next one for
            if (response.status !== 400 && response.status !== 404) break
        }

        if (!response || !response.ok) {
            const status = response?.status ?? 0
            if (status === 401) {
                return NextResponse.json({ error: "The AI key is invalid. Check GROQ_API_KEY in the server settings." }, { status: 500 })
            }
            if (status === 429) {
                return NextResponse.json({ error: "The AI service is busy. Please try again in a moment." }, { status: 429 })
            }
            let reason = ""
            try { reason = JSON.parse(lastDetail)?.error?.message ?? "" } catch { /* not JSON */ }
            return NextResponse.json({ error: `AI service error ${status}${reason ? `: ${reason.slice(0, 160)}` : ""}` }, { status: 500 })
        }

        const data = await response.json()
        const summary = data.choices?.[0]?.message?.content

        if (!summary) {
            console.error("No summary in response:", data)
            return NextResponse.json(
                { error: "AI did not generate a summary" },
                { status: 500 }
            )
        }

        await fetchMutation(api.meetings.consumeSummaryClaim, { id: meetingId }, { token: authToken }).catch(() => undefined)

        return NextResponse.json({ summary })
    } catch (e: unknown) {
        console.error("AI Summary API error:", e)
        return NextResponse.json(
            { error: "Failed to generate summary" }, 
            { status: 500 }
        )
    }
}