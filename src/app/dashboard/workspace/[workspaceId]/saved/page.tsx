"use client"

import { useRouter } from "next/navigation"
import { useMutation, useQuery } from "convex/react"
import { format } from "date-fns"
import { Bookmark, BookmarkX, Loader } from "lucide-react"
import { toast } from "sonner"
import { api } from "../../../../../../convex/_generated/api"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { useWorkspaceId } from "@/hooks/use-workspace-id"
import { messageLink } from "@/features/messages/lib/message-link"
import { errMsg } from "@/lib/errors"

const SavedPage = () => {
    const workspaceId = useWorkspaceId()
    const router = useRouter()
    const items = useQuery(api.marks.savedList, { workspaceId })
    const toggleSave = useMutation(api.marks.toggleSave)

    return (
        <div className="flex h-full min-h-0 flex-col bg-surface">
            <div className="flex h-14 shrink-0 items-center gap-2 border-b border-plum/12 px-4">
                <Bookmark className="size-5 text-brand" />
                <h1 className="text-lg font-semibold tracking-tight text-ink">Saved</h1>
                <span className="text-sm text-ink/50">only you can see this</span>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto">
                {items === undefined ? (
                    <div className="flex h-full items-center justify-center"><Loader className="size-6 animate-spin text-brand" /></div>
                ) : items.length === 0 ? (
                    <div className="mx-auto flex max-w-sm flex-col items-center gap-3 px-6 py-20 text-center">
                        <div className="flex size-14 items-center justify-center rounded-2xl bg-brand/10 text-brand"><Bookmark className="size-6" /></div>
                        <p className="font-semibold tracking-tight text-ink">Nothing saved yet</p>
                        <p className="text-sm text-ink/60">Hover a message and choose the bookmark to keep it here for later.</p>
                    </div>
                ) : (
                    items.map((m) => (
                        <div key={m.messageId} className="flex items-start gap-3 border-b border-plum/10 px-4 py-3 transition-colors hover:bg-cream">
                            <Avatar className="mt-0.5 size-9 shrink-0 rounded-md">
                                <AvatarImage src={m.authorImage} />
                                <AvatarFallback className="rounded-md bg-[#381d2a] text-xs text-white dark:bg-[#4a2838]">{m.authorName[0]}</AvatarFallback>
                            </Avatar>
                            <button
                                type="button"
                                className="min-w-0 flex-1 text-left"
                                onClick={() => router.push(messageLink({
                                    workspaceId,
                                    channelId: m.channelId,
                                    memberId: m.memberId,
                                    messageId: m.messageId,
                                    parentMessageId: m.parentMessageId,
                                }))}
                            >
                                <span className="flex flex-wrap items-center gap-x-2 text-sm">
                                    <span className="font-semibold text-ink">{m.authorName}</span>
                                    <span className="rounded-md bg-cream-deep2 px-2 py-0.5 text-[11px] font-medium text-ink/70">{m.where}</span>
                                    <span className="text-[11px] text-ink/55">{format(m.createdAt, "MMM d, h:mm a")}</span>
                                </span>
                                <span className="mt-0.5 line-clamp-3 block text-sm text-ink/80">{m.body || "Attachment"}</span>
                            </button>
                            <button
                                type="button"
                                aria-label="Remove from saved"
                                className="flex size-9 shrink-0 items-center justify-center rounded-lg text-ink/50 hover:bg-cream-deep2 hover:text-ink"
                                onClick={() => toggleSave({ messageId: m.messageId }).catch((e) => toast.error(errMsg(e, "Couldn't remove that")))}
                            >
                                <BookmarkX className="size-4" />
                            </button>
                        </div>
                    ))
                )}
            </div>
        </div>
    )
}

export default SavedPage
