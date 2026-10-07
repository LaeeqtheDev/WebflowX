import { AccessToken } from "livekit-server-sdk"
import { NextRequest, NextResponse } from "next/server"

export async function GET(req: NextRequest) {
    const room = req.nextUrl.searchParams.get("room")
    const username = req.nextUrl.searchParams.get("username")
    // identity must be unique per person, otherwise two people with the same name kick each other out
    const identity = req.nextUrl.searchParams.get("identity") || username

    if (!room || !username) {
        return NextResponse.json({ error: "Missing room or username" }, { status: 400 })
    }

    const apiKey = process.env.LIVEKIT_API_KEY
    const apiSecret = process.env.LIVEKIT_API_SECRET
    const wsUrl = process.env.LIVEKIT_URL

    if (!apiKey || !apiSecret || !wsUrl) {
        return NextResponse.json({ error: "LiveKit not configured" }, { status: 500 })
    }

    const at = new AccessToken(apiKey, apiSecret, {
        identity: identity as string,
        name: username as string,
        ttl: "2h",
    })

    at.addGrant({
        roomJoin: true,
        room,
        canPublish: true,
        canSubscribe: true,
        canPublishData: true,
    })

    const token = await at.toJwt()

    return NextResponse.json({ token, url: wsUrl })
}