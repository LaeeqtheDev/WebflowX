import { AccessToken } from "livekit-server-sdk"
import { NextRequest, NextResponse } from "next/server"
import { fetchQuery } from "convex/nextjs"
import { api } from "../../../../../convex/_generated/api"
import { rateLimit, tooMany } from "@/lib/api-guard"

// A LiveKit token for someone joining from a meeting's join link, without an account.
// The link's secret decides which room; the person only chooses the name others see (marked "guest").
export async function POST(req: NextRequest) {
    try {
        const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown"
        if (!rateLimit(`guest-join:${ip}`, 10, 60_000)) return tooMany()

        const body = (await req.json().catch(() => null)) as { token?: unknown; name?: unknown } | null
        const token = typeof body?.token === "string" ? body.token : ""
        const name = typeof body?.name === "string" ? body.name.replace(/\s+/g, " ").trim().slice(0, 40) : ""
        if (!token || name.length < 2) return NextResponse.json({ error: "Enter your name to join" }, { status: 400 })

        const info = await fetchQuery(api.meetings.publicInfo, { token })
        if (!info) return NextResponse.json({ error: "This join link isn't valid any more" }, { status: 404 })
        if (info.status === "ended") return NextResponse.json({ error: "This meeting has ended" }, { status: 410 })
        if (info.status === "early" || !info.roomName) return NextResponse.json({ error: "This meeting hasn't opened yet" }, { status: 425 })

        const apiKey = process.env.LIVEKIT_API_KEY
        const apiSecret = process.env.LIVEKIT_API_SECRET
        const wsUrl = process.env.LIVEKIT_URL ?? process.env.NEXT_PUBLIC_LIVEKIT_URL
        if (!apiKey || !apiSecret || !wsUrl) return NextResponse.json({ error: "Meetings aren't set up on this server" }, { status: 500 })

        const id = `link-${crypto.randomUUID()}`
        const at = new AccessToken(apiKey, apiSecret, { identity: id, name: `${name} (guest)`, metadata: JSON.stringify({ host: false, linkGuest: true }), ttl: "2h" })
        at.addGrant({ roomJoin: true, room: info.roomName, canPublish: true, canSubscribe: true, canPublishData: true })
        return NextResponse.json({ token: await at.toJwt(), url: wsUrl, title: info.title })
    } catch (e) {
        console.error("[livekit guest]", e)
        return NextResponse.json({ error: "Couldn't join the meeting" }, { status: 500 })
    }
}
