import { NextRequest, NextResponse } from "next/server"
import { RoomServiceClient, TrackSource, TrackType } from "livekit-server-sdk"
import { fetchMutation, fetchQuery } from "convex/nextjs"
import { api } from "../../../../../convex/_generated/api"
import { Id } from "../../../../../convex/_generated/dataModel"
import { getAuthToken, unauthorized, limited, tooMany } from "@/lib/api-guard"

type Action = "mute" | "stopVideo" | "muteAll" | "kick" | "endAll"
const ACTIONS: Action[] = ["mute", "stopVideo", "muteAll", "kick", "endAll"]

// Host controls: mute / stop camera / mute everyone / remove / end the call for everyone.
export async function POST(req: NextRequest) {
    try {
        const token = await getAuthToken()
        if (!token) return unauthorized()

        const body = await req.json().catch(() => null)
        const room = typeof body?.room === "string" ? body.room : ""
        const action = body?.action as Action
        const target = typeof body?.identity === "string" ? body.identity : ""
        if (!room || room.length > 200 || !ACTIONS.includes(action)) {
            return NextResponse.json({ error: "Bad request" }, { status: 400 })
        }

        const who = await fetchQuery(api.meetings.authorizeRoom, { roomName: room }, { token })
        if (!who) return NextResponse.json({ error: "Forbidden" }, { status: 403 })
        if (!who.host) {
            return NextResponse.json({ error: "Only the host or an admin can do that" }, { status: 403 })
        }
        if (!(await limited(token, "moderate", who.identity))) return tooMany()

        const apiKey = process.env.LIVEKIT_API_KEY
        const apiSecret = process.env.LIVEKIT_API_SECRET
        const wsUrl = process.env.LIVEKIT_URL ?? process.env.NEXT_PUBLIC_LIVEKIT_URL
        if (!apiKey || !apiSecret || !wsUrl) {
            return NextResponse.json({ error: "LiveKit is not configured" }, { status: 500 })
        }
        const client = new RoomServiceClient(wsUrl.replace(/^wss:/, "https:").replace(/^ws:/, "http:"), apiKey, apiSecret)

        const muteTracks = async (identity: string, type: TrackType, source: TrackSource) => {
            const p = await client.getParticipant(room, identity).catch(() => null)
            if (!p) return
            for (const t of p.tracks) {
                if (t.type === type && t.source === source && !t.muted) {
                    await client.mutePublishedTrack(room, identity, t.sid, true)
                }
            }
        }

        if (action === "endAll") {
            await client.deleteRoom(room)
            return NextResponse.json({ ok: true })
        }

        if (action === "muteAll") {
            const all = await client.listParticipants(room)
            await Promise.all(
                all
                    .filter((p) => p.identity !== who.identity)
                    .map((p) => muteTracks(p.identity, TrackType.AUDIO, TrackSource.MICROPHONE))
            )
            return NextResponse.json({ ok: true })
        }

        if (!target || target === who.identity) {
            return NextResponse.json({ error: "Pick someone else" }, { status: 400 })
        }

        if (action === "mute") await muteTracks(target, TrackType.AUDIO, TrackSource.MICROPHONE)
        if (action === "stopVideo") await muteTracks(target, TrackType.VIDEO, TrackSource.CAMERA)
        if (action === "kick") {
            await fetchMutation(
                api.meetings.kickMember,
                { id: who.meetingId, memberId: target as Id<"members"> },
                { token }
            )
            await client.removeParticipant(room, target).catch(() => undefined)
        }
        return NextResponse.json({ ok: true })
    } catch (e) {
        console.error("[livekit/moderate]", e)
        const msg = e instanceof Error ? e.message : ""
        return NextResponse.json({ error: msg.includes("Only") || msg.includes("can't") ? msg : "Action failed" }, { status: 500 })
    }
}
