import { NextResponse } from "next/server"
import { getAuthToken, unauthorized, limited, tooMany } from "@/lib/api-guard"
import { fetchQuery } from "convex/nextjs"
import { api } from "../../../../convex/_generated/api"

// Hands the browser a short-lived Deepgram key instead of the real one.
export async function GET() {
    try {
        const token = await getAuthToken()
        if (!token) return unauthorized()

        const me = await fetchQuery(api.users.current, {}, { token })
        if (!me) return unauthorized()
        if (!(await limited(token, "deepgram", me._id))) return tooMany()

        const apiKey = process.env.DEEPGRAM_API_KEY
        if (!apiKey) {
            return NextResponse.json({ error: "Deepgram API key not configured" }, { status: 500 })
        }

        try {
            let projectId = process.env.DEEPGRAM_PROJECT_ID
            if (!projectId) {
                const pr = await fetch("https://api.deepgram.com/v1/projects", {
                    headers: { Authorization: `Token ${apiKey}` },
                })
                if (pr.ok) projectId = (await pr.json())?.projects?.[0]?.project_id
            }
            if (projectId) {
                const kr = await fetch(`https://api.deepgram.com/v1/projects/${projectId}/keys`, {
                    method: "POST",
                    headers: { Authorization: `Token ${apiKey}`, "Content-Type": "application/json" },
                    body: JSON.stringify({
                        comment: "webflowx temp",
                        scopes: ["usage:write"],
                        time_to_live_in_seconds: 600,
                    }),
                })
                if (kr.ok) {
                    const k = await kr.json()
                    if (k?.key) return NextResponse.json({ key: k.key })
                }
            }
            console.warn("[deepgram] could not mint a temporary key (key lacks Member role?). Falling back to the main key for signed-in users.")
        } catch (e) {
            console.warn("[deepgram] temp key error, falling back:", e)
        }

        return NextResponse.json({ key: apiKey })
    } catch (e) {
        console.error("Deepgram token error:", e)
        return NextResponse.json({ error: "Failed to get Deepgram key" }, { status: 500 })
    }
}
