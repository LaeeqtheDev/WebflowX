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
            return NextResponse.json({ error: "Live captions aren't set up on the server yet (the Deepgram key is missing)." }, { status: 500 })
        }

        try {
            // Preferred: a short-lived access token (needs only a key with Member rights)
            const gr = await fetch("https://api.deepgram.com/v1/auth/grant", {
                method: "POST",
                headers: { Authorization: `Token ${apiKey}`, "Content-Type": "application/json" },
                body: JSON.stringify({ ttl_seconds: 300 }),
            })
            if (gr.ok) {
                const g = await gr.json()
                if (g?.access_token) return NextResponse.json({ key: g.access_token, type: "bearer" })
            } else {
                console.error("[deepgram] token grant failed:", gr.status, await gr.text().catch(() => ""))
            }

            // Fallback: a temporary project key
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
                    if (k?.key) return NextResponse.json({ key: k.key, type: "token" })
                }
            }
            // Never hand the browser the main key: if neither works, transcription is unavailable.
            console.error("[deepgram] could not mint a browser credential. The DEEPGRAM_API_KEY needs the Member role (or higher).")
            return NextResponse.json({ error: "Live captions aren't set up on the server: the Deepgram key needs the Member role. Ask the workspace owner to check it." }, { status: 503 })
        } catch (e) {
            console.error("[deepgram] token error:", e)
        }

        return NextResponse.json({ error: "Live captions are unavailable right now" }, { status: 503 })
    } catch (e) {
        console.error("Deepgram token error:", e)
        return NextResponse.json({ error: "Failed to get Deepgram key" }, { status: 500 })
    }
}
