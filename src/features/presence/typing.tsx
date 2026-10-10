"use client"
import { useCallback, useEffect, useRef, useState } from "react"
import { useMutation, useQuery } from "convex/react"
import { api } from "../../../convex/_generated/api"
import { Id } from "../../../convex/_generated/dataModel"

type Room = { workspaceId: Id<"workspaces">; channelId?: Id<"channels">; conversationId?: Id<"conversations"> }

// Returns a function to call on every keystroke; it tells the server at most once every 3 seconds.
export const useTypingPing = (room: Room) => {
  const ping = useMutation(api.typing.ping)
  const last = useRef(0)
  const { workspaceId, channelId, conversationId } = room
  return useCallback(() => {
    const t = Date.now()
    if (t - last.current < 3000) return
    last.current = t
    ping({ workspaceId, channelId, conversationId }).catch(() => {})
  }, [ping, workspaceId, channelId, conversationId])
}

export const TypingIndicator = ({ channelId, conversationId }: { channelId?: Id<"channels">; conversationId?: Id<"conversations"> }) => {
  const list = useQuery(api.typing.list, { channelId, conversationId })
  const [now, setNow] = useState(() => Date.now())

  const typing = (list ?? []).filter((t) => t.until > now)
  const active = typing.length > 0

  // tick only while someone is typing, so names disappear on time
  useEffect(() => {
    if (!list || list.length === 0) return
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [list])

  const names = typing.map((t) => t.name)
  const text =
    names.length === 1 ? `${names[0]} is typing…`
    : names.length === 2 ? `${names[0]} and ${names[1]} are typing…`
    : names.length > 2 ? "Several people are typing…"
    : ""

  // reserve the line so the input doesn't jump up and down
  return (
    <div className="h-5 px-4 md:px-6 text-xs text-ink/55 flex items-center gap-1.5" aria-live="polite">
      {active && (
        <>
          <span aria-hidden className="flex gap-0.5">
            <span className="size-1 rounded-full bg-brand animate-bounce [animation-delay:-0.2s]" />
            <span className="size-1 rounded-full bg-brand animate-bounce [animation-delay:-0.1s]" />
            <span className="size-1 rounded-full bg-brand animate-bounce" />
          </span>
          {text}
        </>
      )}
    </div>
  )
}
