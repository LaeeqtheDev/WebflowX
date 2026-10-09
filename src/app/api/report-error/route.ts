import { NextResponse } from "next/server"
import { reportError } from "@/lib/report-error"

// Browser crashes (error boundaries) land here. Signed-in users only (the middleware enforces it),
// size-capped, and throttled per server instance so it can't be used to flood the webhook.
let windowStart = 0
let count = 0

export async function POST(req: Request) {
  const now = Date.now()
  if (now - windowStart > 60_000) {
    windowStart = now
    count = 0
  }
  if (++count > 30) return NextResponse.json({ ok: false }, { status: 429 })

  const raw = await req.text()
  if (raw.length > 4000) return NextResponse.json({ ok: false }, { status: 413 })
  let data: { message?: unknown; digest?: unknown; path?: unknown }
  try {
    data = JSON.parse(raw)
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 })
  }
  const s = (v: unknown) => (typeof v === "string" ? v.slice(0, 300) : undefined)
  await reportError("browser", new Error(s(data.message) ?? "unknown"), { digest: s(data.digest), path: s(data.path) })
  return NextResponse.json({ ok: true })
}
