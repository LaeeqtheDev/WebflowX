"use client"
import { CloudOff, Loader, Wifi } from "lucide-react"
import { useConnection } from "@/hooks/use-connection"
import { useLowDataSync } from "@/hooks/use-low-data"

// Tells the person when the app can't reach WebflowX instead of just looking frozen. Short drops stay invisible.
export const ConnectionBanner = () => {
  useLowDataSync()
  const { status, recovered } = useConnection()
  if (status === "online" && !recovered) return null

  const tone = recovered
    ? "bg-emerald-600/15 text-ink border-emerald-600/30"
    : "bg-amber-500/20 text-ink border-amber-500/40"
  return (
    <div role="status" aria-live="polite" className={`flex shrink-0 items-center justify-center gap-2 border-b px-3 py-1.5 text-center text-xs font-medium ${tone}`}>
      {recovered ? <Wifi className="size-3.5" aria-hidden /> : status === "offline" ? <CloudOff className="size-3.5" aria-hidden /> : <Loader className="size-3.5 animate-spin" aria-hidden />}
      <span>
        {recovered
          ? "Back online"
          : status === "offline"
            ? "You're offline. What you write is kept here and sends when you're back online."
            : "Reconnecting to WebflowX… what you write is kept and will send when it's back."}
      </span>
    </div>
  )
}
