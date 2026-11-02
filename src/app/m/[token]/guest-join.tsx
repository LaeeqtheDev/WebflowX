"use client"

import { useState } from "react"
import Image from "next/image"
import dynamic from "next/dynamic"
import { useQuery } from "convex/react"
import { format } from "date-fns"
import { Loader, Video } from "lucide-react"
import { api } from "../../../../convex/_generated/api"
import { PublicConvexProvider } from "@/components/PublicConvexProvider"

// LiveKit's ready-made call screen, loaded only once the person presses Join
const GuestRoom = dynamic(() => import("./guest-room").then((m) => m.GuestRoom), { ssr: false })

const Join = ({ token }: { token: string }) => {
  const info = useQuery(api.meetings.publicInfo, { token })
  const [name, setName] = useState("")
  const [joining, setJoining] = useState(false)
  const [error, setError] = useState("")
  const [session, setSession] = useState<{ token: string; url: string } | null>(null)

  const join = async () => {
    setJoining(true); setError("")
    try {
      const res = await fetch("/api/livekit/guest", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token, name }) })
      const data = await res.json().catch(() => ({}))
      if (!res.ok || !data.token) throw new Error(data.error || "Couldn't join the meeting")
      setSession({ token: data.token, url: data.url })
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't join the meeting")
    } finally {
      setJoining(false)
    }
  }

  if (session) return <GuestRoom token={session.token} url={session.url} onLeave={() => setSession(null)} />

  return (
    <main className="wfx-light flex min-h-dvh items-center justify-center bg-[#f7f2ee] px-4 py-10">
      <div className="w-full max-w-sm rounded-2xl border border-[#381d2a]/12 bg-white p-6 shadow-sm">
        <div className="flex items-center gap-2">
          <Image src="/logo.png" alt="" width={24} height={24} />
          <span className="text-sm font-semibold text-[#1b1017]">WebflowX</span>
        </div>
        {info === undefined ? (
          <div className="flex justify-center py-10"><Loader className="size-5 animate-spin text-[#ff5018]" /></div>
        ) : info === null ? (
          <>
            <h1 className="mt-6 text-xl font-semibold tracking-tight text-[#1b1017]">This link doesn&apos;t work</h1>
            <p className="mt-2 text-sm text-[#1b1017]/65">The host may have turned it off. Ask them for a new link.</p>
          </>
        ) : (
          <>
            <p className="mt-6 text-xs font-semibold uppercase tracking-wide text-[#1b1017]/55">{info.workspace} invited you to</p>
            <h1 className="mt-1 text-xl font-semibold tracking-tight text-[#1b1017]">{info.title}</h1>
            {info.status === "ended" && <p className="mt-3 text-sm text-[#1b1017]/65">This meeting has ended.</p>}
            {info.status === "early" && (
              <p className="mt-3 text-sm text-[#1b1017]/65">
                It opens 10 minutes before it starts{info.startsAt ? ` (${format(info.startsAt, "EEEE d MMMM, h:mm a")})` : ""}. Keep this page open.
              </p>
            )}
            {info.status === "open" && (
              <form className="mt-5 flex flex-col gap-3" onSubmit={(e) => { e.preventDefault(); void join() }}>
                <label className="text-sm font-medium text-[#1b1017]" htmlFor="guest-name">Your name</label>
                <input id="guest-name" value={name} onChange={(e) => setName(e.target.value)} maxLength={40} autoFocus autoComplete="name"
                  className="h-11 rounded-lg border border-[#381d2a]/15 px-3 text-[15px] text-[#1b1017] outline-none focus:border-[#ff5018]" />
                {error && <p className="text-sm text-red-600">{error}</p>}
                <button type="submit" disabled={joining || name.trim().length < 2}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-[#ff5018] text-[15px] font-semibold text-white transition-colors hover:bg-[#e6430f] disabled:opacity-60">
                  {joining ? <Loader className="size-4 animate-spin" /> : <Video className="size-4" />} Join meeting
                </button>
                <p className="text-xs text-[#1b1017]/55">Others in the call will see your name with &ldquo;(guest)&rdquo;. Your browser will ask to use your camera and microphone.</p>
              </form>
            )}
          </>
        )}
      </div>
    </main>
  )
}

export const GuestJoin = ({ token }: { token: string }) => (
  <PublicConvexProvider>
    <Join token={token} />
  </PublicConvexProvider>
)
