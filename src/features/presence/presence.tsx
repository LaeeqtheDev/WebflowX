"use client"
import { createContext, useContext, useEffect, useMemo, useState } from "react"
import { useConvex, useMutation } from "convex/react"
import { api } from "../../../convex/_generated/api"
import { Id } from "../../../convex/_generated/dataModel"
import { cn } from "@/lib/utils"

const ONLINE_MS = 75_000

type Ctx = { seen: Map<string, number>; now: number }
const PresenceContext = createContext<Ctx>({ seen: new Map(), now: 0 })

// Keeps "I'm here" fresh while the tab is visible and shares who else is around with the whole workspace UI.
export const PresenceProvider = ({ workspaceId, children }: { workspaceId: Id<"workspaces">; children: React.ReactNode }) => {
  const heartbeat = useMutation(api.presence.heartbeat)
  const convex = useConvex()
  // Fetched on a timer instead of subscribed: a live query would re-run for every teammate on every
  // heartbeat (cost grows with the square of team size). A 30s refresh is plenty for green dots.
  const [list, setList] = useState<{ memberId: string; lastSeen: number }[]>([])
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    const beat = () => { if (document.visibilityState === "visible") heartbeat({}).catch(() => {}) }
    beat()
    const id = setInterval(beat, 30_000)
    document.addEventListener("visibilitychange", beat)
    return () => { clearInterval(id); document.removeEventListener("visibilitychange", beat) }
  }, [heartbeat])

  useEffect(() => {
    let live = true
    const load = () => {
      if (document.visibilityState !== "visible") return
      convex.query(api.presence.list, { workspaceId }).then((r) => { if (live) setList(r) }).catch(() => {})
    }
    load()
    const id = setInterval(load, 30_000)
    document.addEventListener("visibilitychange", load)
    return () => { live = false; clearInterval(id); document.removeEventListener("visibilitychange", load) }
  }, [convex, workspaceId])

  // re-evaluate who is online without waiting for the server
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 20_000)
    return () => clearInterval(id)
  }, [])

  const value = useMemo(() => ({ seen: new Map(list.map((p) => [p.memberId as string, p.lastSeen])), now }), [list, now])
  return <PresenceContext.Provider value={value}>{children}</PresenceContext.Provider>
}

export const usePresence = (memberId?: string) => {
  const { seen, now } = useContext(PresenceContext)
  const lastSeen = memberId ? seen.get(memberId) : undefined
  const online = lastSeen !== undefined && now - lastSeen < ONLINE_MS
  return { online, lastSeen }
}

export const lastSeenLabel = (online: boolean, lastSeen?: number) => {
  if (online) return "Active now"
  if (!lastSeen) return "Not seen yet"
  const mins = Math.max(1, Math.round((Date.now() - lastSeen) / 60_000))
  if (mins < 60) return `Last seen ${mins} min ago`
  const hrs = Math.round(mins / 60)
  if (hrs < 24) return `Last seen ${hrs} hr ago`
  const days = Math.round(hrs / 24)
  return days === 1 ? "Last seen yesterday" : `Last seen ${days} days ago`
}

// Small green dot that sits on the corner of an avatar. Renders nothing when the person is offline.
export const PresenceDot = ({ memberId, className, ring = "ring-[#402633] dark:ring-[#2a1722]" }: { memberId?: string; className?: string; ring?: string }) => {
  const { online } = usePresence(memberId)
  if (!online) return null
  return (
    <span
      role="img"
      aria-label="Online"
      className={cn("absolute -bottom-0.5 -right-0.5 size-2.5 rounded-full bg-emerald-500 ring-2", ring, className)}
    />
  )
}
