import { NextRequest, NextResponse } from "next/server"

export async function POST(req: NextRequest) {
    try {
        const { transcript } = await req.json()

        console.log("=== AI SUMMARY API CALLED ===")
        console.log("Transcript length:", transcript?.length)
        console.log("Transcript preview:", transcript?.substring(0, 100))

        if (!transcript || transcript.trim().length < 10) {
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

        console.log("Calling Groq API...")

        const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${apiKey}`,
            },
            body: JSON.stringify({
                model: "llama-3.3-70b-versatile",
                max_tokens: 1024,
                temperature: 0.3,
                messages: [
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
            })
        })

        console.log("Groq API response status:", response.status)

        if (!response.ok) {
            const errorText = await response.text()
            console.error("Groq API error:", errorText)
            
            if (response.status === 401) {
                return NextResponse.json(
                    { error: "Invalid API key. Please check your GROQ_API_KEY." },
                    { status: 500 }
                )
            }
            
            if (response.status === 429) {
                return NextResponse.json(
                    { error: "Rate limit exceeded. Please try again in a moment." },
                    { status: 429 }
                )
            }
            
            return NextResponse.json(
                { error: `AI service error: ${response.status}` },
                { status: 500 }
            )
        }

        const data = await response.json()
        console.log("Groq API response received")

        const summary = data.choices?.[0]?.message?.content

        if (!summary) {
            console.error("No summary in response:", data)
            return NextResponse.json(
                { error: "AI did not generate a summary" },
                { status: 500 }
            )
        }

        console.log("Summary generated successfully, length:", summary.length)

        return NextResponse.json({ summary })
    } catch (e: any) {
        console.error("AI Summary API error:", e)
        return NextResponse.json(
            { error: e.message || "Failed to generate summary" }, 
            { status: 500 }
        )
    }
}