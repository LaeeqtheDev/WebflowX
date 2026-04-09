import { NextRequest, NextResponse } from "next/server"

export async function POST(req: NextRequest) {
    try {
        const { transcript, meetingId } = await req.json()

        if (!transcript) {
            return NextResponse.json({ error: "Transcript required" }, { status: 400 })
        }

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
${transcript}

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

        return NextResponse.json({ summary })
    } catch (e) {
        console.error(e)
        return NextResponse.json({ error: "Failed to generate summary" }, { status: 500 })
    }
}