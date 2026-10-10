"use client"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { useMutation, useQuery } from "convex/react"
import { Pin, PinOff } from "lucide-react"
import { toast } from "sonner"
import { api } from "../../../convex/_generated/api"
import { Id } from "../../../convex/_generated/dataModel"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { useWorkspaceId } from "@/hooks/use-workspace-id"
import { messageLink } from "@/features/messages/lib/message-link"
import { errMsg } from "@/lib/errors"

// Header button that lists the messages pinned in this channel or DM.
export const PinnedMessages = ({ channelId, conversationId, memberId }: {
  channelId?: Id<"channels">
  conversationId?: Id<"conversations">
  // the other person, needed to build links inside a DM
  memberId?: string
}) => {
  const router = useRouter()
  const workspaceId = useWorkspaceId()
  const [open, setOpen] = useState(false)
  const pins = useQuery(api.marks.pinned, { channelId, conversationId })
  const togglePin = useMutation(api.marks.togglePin)
  const count = pins?.length ?? 0

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={`Pinned messages${count ? ` (${count})` : ""}`}
          className="ml-auto flex h-9 items-center gap-1.5 rounded-lg px-2.5 text-sm text-ink/70 transition-colors hover:bg-cream focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/70 max-md:h-10"
        >
          <Pin className="size-4 text-brand" />
          {count > 0 && <span className="text-xs font-semibold">{count}</span>}
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[min(92vw,380px)] p-0 bg-surface">
        <div className="border-b border-plum/12 px-4 py-3 text-sm font-semibold tracking-tight text-ink">Pinned messages</div>
        <div className="max-h-[60vh] overflow-y-auto">
          {pins === undefined ? (
            <p className="px-4 py-6 text-center text-sm text-ink/60">Loading…</p>
          ) : pins.length === 0 ? (
            <p className="px-4 py-6 text-center text-sm text-ink/60">Nothing pinned yet. Hover a message and choose the pin to keep it handy for everyone here.</p>
          ) : (
            pins.map((p) => (
              <div key={p.messageId} className="flex items-start gap-2 border-b border-plum/8 px-4 py-3 last:border-0">
                <button
                  type="button"
                  className="min-w-0 flex-1 text-left"
                  onClick={() => {
                    setOpen(false)
                    router.push(messageLink({ workspaceId, channelId, memberId, messageId: p.messageId }))
                  }}
                >
                  <span className="block text-xs font-semibold text-ink">{p.authorName} <span className="font-normal text-ink/60">· pinned by {p.pinnedByName}</span></span>
                  <span className="mt-0.5 line-clamp-3 block text-sm text-ink/80">{p.body || "Attachment"}</span>
                </button>
                <button
                  type="button"
                  aria-label="Unpin"
                  className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg text-ink/60 hover:bg-cream hover:text-ink"
                  onClick={() => togglePin({ messageId: p.messageId }).catch((e) => toast.error(errMsg(e, "Couldn't unpin")))}
                >
                  <PinOff className="size-4" />
                </button>
              </div>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}
