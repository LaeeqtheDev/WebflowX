import { AccessToken } from "livekit-server-sdk"
import { NextRequest, NextResponse } from "next/server"
import { fetchQuery } from "convex/nextjs"
import { api } from "../../../../convex/_generated/api"
import { getAuthToken, unauthorized, limited, tooMany } from "@/lib/api-guard"

export async function GET(req: NextRequest) {
    try {
        const token = await getAuthToken()
        if (!token) return unauthorized()

        const room = req.nextUrl.searchParams.get("room")
        if (!room || room.length > 200) {
            return NextResponse.json({ error: "Missing room" }, { status: 400 })
        }

        const apiKey = process.env.LIVEKIT_API_KEY
        const apiSecret = process.env.LIVEKIT_API_SECRET
        const wsUrl = process.env.LIVEKIT_URL ?? process.env.NEXT_PUBLIC_LIVEKIT_URL

        const missing = [
            !apiKey && "LIVEKIT_API_KEY",
            !apiSecret && "LIVEKIT_API_SECRET",
            !wsUrl && "LIVEKIT_URL",
        ].filter(Boolean)
        if (missing.length) {
            console.error(`[livekit] missing env: ${missing.join(", ")} (add to .env.local and restart npm run dev)`)
            return NextResponse.json(
                { error: `LiveKit is not configured (missing ${missing.join(", ")})` },
                { status: 500 }
            )
        }

        // Identity and display name come from the signed-in user, never from the query string.
        const who = await fetchQuery(api.meetings.authorizeRoom, { roomName: room }, { token })
        if (!who) {
            return NextResponse.json(
                { error: "You can't join this meeting (not a member, or it has ended)" },
                { status: 403 }
            )
        }

        if (!(await limited(token, "livekit", who.identity))) return tooMany()

        const at = new AccessToken(apiKey!, apiSecret!, {
            identity: who.identity,
            name: who.name,
            metadata: JSON.stringify({ host: who.host }),
            ttl: who.oneToOne ? "16m" : "1h",
        })
        at.addGrant({
            roomJoin: true,
            room,
            canPublish: true,
            canSubscribe: true,
            canPublishData: true,
        })

        return NextResponse.json({ token: await at.toJwt(), url: wsUrl })
    } catch (e) {
        console.error("[livekit] token error:", e)
        return NextResponse.json(
            { error: "Could not create a meeting token. Check the server log." },
            { status: 500 }
        )
    }
}
