import { NextRequest, NextResponse } from "next/server"

const SYSTEM_PROMPTS: Record<string, string> = {
    improve: "You are a writing assistant. Improve the writing quality, clarity and flow of the text. Keep the same meaning but make it more polished and professional. Return ONLY the improved text, no explanations.",
    summarize: "You are a writing assistant. Summarize the following text concisely. Return ONLY the summary, no explanations.",
    grammar: "You are a writing assistant. Fix all grammar, spelling and punctuation errors in the text. Return ONLY the corrected text, no explanations.",
    shorter: "You are a writing assistant. Make the following text shorter and more concise while keeping the key points. Return ONLY the shortened text, no explanations.",
    longer: "You are a writing assistant. Expand the following text with more detail and explanation while keeping the same tone. Return ONLY the expanded text, no explanations.",
    formal: "You are a writing assistant. Rewrite the following text in a formal, professional tone. Return ONLY the rewritten text, no explanations.",
    casual: "You are a writing assistant. Rewrite the following text in a casual, friendly conversational tone. Return ONLY the rewritten text, no explanations.",
    translate: "You are a writing assistant. Translate the following text to English. If it is already in English, return it as is. Return ONLY the translated text, no explanations.",
}

export async function POST(req: NextRequest) {
    try {
        const { text, command } = await req.json()

        if (!text || !command) {
            return NextResponse.json({ error: "Missing text or command" }, { status: 400 })
        }

        const systemPrompt = SYSTEM_PROMPTS[command]
        if (!systemPrompt) {
            return NextResponse.json({ error: "Invalid command" }, { status: 400 })
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
                messages: [
                    { role: "system", content: systemPrompt },
                    { role: "user", content: text }
                ],
            })
        })

        const data = await response.json()
        const result = data.choices?.[0]?.message?.content ?? ""

        return NextResponse.json({ result })
    } catch (e) {
        return NextResponse.json({ error: "Failed to process" }, { status: 500 })
    }
}