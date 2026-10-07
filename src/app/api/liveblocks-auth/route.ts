import { Liveblocks } from "@liveblocks/node"
import { NextRequest, NextResponse } from "next/server"
import { fetchQuery } from "convex/nextjs"
import { api } from "../../../../convex/_generated/api"
import { getAuthToken, unauthorized } from "@/lib/api-guard"

const COLORS = ["#ff5018", "#381d2a", "#2f80ed", "#27ae60", "#9b51e0", "#e2a400", "#eb5757"]
const colorFor = (id: string) => {
    let h = 0
    for (const c of id) h = (h * 31 + c.charCodeAt(0)) >>> 0
    return COLORS[h % COLORS.length]
}

export async function POST(req: NextRequest) {
    try {
        const token = await getAuthToken()
        if (!token) return unauthorized()

        const secret = process.env.LIVEBLOCKS_SECRET_KEY
        if (!secret) {
            return NextResponse.json({ error: "Missing LIVEBLOCKS_SECRET_KEY" }, { status: 500 })
        }

        const body = await req.json().catch(() => null)
        const room = typeof body?.room === "string" ? body.room : ""
        if (!room || room.length > 200) {
            return NextResponse.json({ error: "Missing room" }, { status: 400 })
        }

        // Only members of the doc's workspace may enter its room; identity comes from the session.
        const who = await fetchQuery(api.docs.authorizeRoom, { roomId: room }, { token })
        if (!who) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

        const liveblocks = new Liveblocks({ secret })
        const session = liveblocks.prepareSession(who.userId, {
            userInfo: { name: who.name, color: colorFor(who.userId), avatar: who.avatar },
        })
        session.allow(room, session.FULL_ACCESS)

        const { body: sessionBody, status } = await session.authorize()
        return new NextResponse(sessionBody, {
            status,
            headers: { "Content-Type": "application/json" },
        })
    } catch (e) {
        console.error("Liveblocks auth error:", e)
        return NextResponse.json({ error: "Auth failed" }, { status: 500 })
    }
}
