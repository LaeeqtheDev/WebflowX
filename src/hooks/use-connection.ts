"use client"
import { useEffect, useRef, useState } from "react"
import { useConvex } from "convex/react"
import { linkStatus, type LinkStatus } from "@/lib/network"

/**
 * The state of the person's connection to WebflowX: online, reconnecting (the live link dropped and has not come
 * back), or offline (the browser has no network). Also reports briefly when it comes back.
 */
export const useConnection = (): { status: LinkStatus; recovered: boolean } => {
  const convex = useConvex()
  const [status, setStatus] = useState<LinkStatus>("online")
  const [recovered, setRecovered] = useState(false)
  const prev = useRef<LinkStatus>("online")

  useEffect(() => {
    let downSince: number | null = null
    let tick: ReturnType<typeof setTimeout> | undefined
    let hide: ReturnType<typeof setTimeout> | undefined
    let browserOnline = typeof navigator === "undefined" ? true : navigator.onLine

    const apply = () => {
      const cs = convex.connectionState()
      if (cs.isWebSocketConnected) downSince = null
      else if (downSince === null) downSince = Date.now()
      const next = linkStatus({ browserOnline, socketConnected: cs.isWebSocketConnected, hasEverConnected: cs.hasEverConnected, socketDownMs: downSince === null ? 0 : Date.now() - downSince })
      if (prev.current !== "online" && next === "online") {
        setRecovered(true)
        clearTimeout(hide)
        hide = setTimeout(() => setRecovered(false), 2500)
      }
      if (next !== "online") setRecovered(false)
      prev.current = next
      setStatus(next)
      // while the link is down, look again once the grace period is over
      clearTimeout(tick)
      if (next === "online" && downSince !== null) tick = setTimeout(apply, 3100)
    }
    const onNet = () => { browserOnline = navigator.onLine; apply() }
    window.addEventListener("online", onNet)
    window.addEventListener("offline", onNet)
    const unsub = convex.subscribeToConnectionState(apply)
    apply()
    return () => {
      window.removeEventListener("online", onNet)
      window.removeEventListener("offline", onNet)
      unsub()
      clearTimeout(tick)
      clearTimeout(hide)
    }
  }, [convex])

  return { status, recovered }
}
