import { Liveblocks } from "@liveblocks/node"
import { NextRequest, NextResponse } from "next/server"

export async function POST(req: NextRequest) {
    
    try {
        console.log("LIVEBLOCKS_SECRET_KEY exists:", !!process.env.LIVEBLOCKS_SECRET_KEY)
        console.log("Key prefix:", process.env.LIVEBLOCKS_SECRET_KEY?.substring(0, 10))
        const body = await req.json()
        const { room, userId, userInfo } = body

        if (!process.env.LIVEBLOCKS_SECRET_KEY) {
            return NextResponse.json({ error: "Missing LIVEBLOCKS_SECRET_KEY" }, { status: 500 })
        }

        const liveblocks = new Liveblocks({
            secret: process.env.LIVEBLOCKS_SECRET_KEY,
        })

        const session = liveblocks.prepareSession(userId ?? "anonymous", {
            userInfo: {
                name: userInfo?.name ?? "Anonymous",
                color: userInfo?.color ?? "#ff5018",
                avatar: userInfo?.avatar ?? "",
            },
        })

        if (room) {
            session.allow(room, session.FULL_ACCESS)
        }

        const { body: sessionBody, status } = await session.authorize()
        return new NextResponse(sessionBody, {
            status,
            headers: { "Content-Type": "application/json" }
        })
    } catch (e) {
        console.error("Liveblocks auth error:", e)
        return NextResponse.json({ error: "Auth failed" }, { status: 500 })
    }
}