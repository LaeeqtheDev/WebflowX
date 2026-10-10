"use client"
import { useEffect, useState } from "react"
import { CloudOff, Loader } from "lucide-react"
import { useConnection } from "@/hooks/use-connection"
import type { UploadProgress } from "@/lib/network"

// A line above the message box while something is being sent. Says what is happening, and on a bad connection says why it is slow.
type Upload = { name: string; progress: UploadProgress | null } | null

export const SendStatus = ({ pending, upload }: { pending: boolean; upload: Upload }) => (pending ? <Sending upload={upload} /> : null)

// Mounted only while sending, so its timers start fresh each time. Quick sends never show anything.
const Sending = ({ upload }: { upload: Upload }) => {
  const { status } = useConnection()
  const [late, setLate] = useState(false)
  const [veryLate, setVeryLate] = useState(false)

  useEffect(() => {
    const a = setTimeout(() => setLate(true), 1200)
    const b = setTimeout(() => setVeryLate(true), 12_000)
    return () => { clearTimeout(a); clearTimeout(b) }
  }, [])

  if (!late) return null
  const pct = upload?.progress && upload.progress.total > 0 ? Math.min(100, Math.round((upload.progress.loaded / upload.progress.total) * 100)) : null
  const offline = status !== "online"
  return (
    <div role="status" aria-live="polite" className="mb-1.5 flex items-center gap-2 rounded-lg bg-ink/5 px-3 py-1.5 text-xs text-ink/80">
      {offline ? <CloudOff className="size-3.5 shrink-0" aria-hidden /> : <Loader className="size-3.5 shrink-0 animate-spin" aria-hidden />}
      <span className="min-w-0 flex-1 truncate">
        {offline
          ? "Waiting for your connection. This sends as soon as you're back online, and your text is saved."
          : upload
            ? `Uploading ${upload.name}${pct !== null ? ` ${pct}%` : "…"}`
            : veryLate ? "Taking longer than usual. Your connection may be slow." : "Sending…"}
      </span>
      {upload && pct !== null && !offline && (
        <span className="h-1.5 w-24 shrink-0 overflow-hidden rounded-full bg-ink/10" aria-hidden><span className="block h-full bg-brand transition-[width]" style={{ width: `${pct}%` }} /></span>
      )}
    </div>
  )
}
