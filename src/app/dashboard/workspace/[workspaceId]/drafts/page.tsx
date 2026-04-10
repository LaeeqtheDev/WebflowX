"use client"

import { useWorkspaceId } from "@/hooks/use-workspace-id"

import { useRouter } from "next/navigation"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { useCurrentMember } from "@/features/members/api/use-current-member"
import { useGetMembers } from "@/features/members/api/use-get-members"
import { Loader, SendHorizonal, Hash, Image as ImageIcon } from "lucide-react"
import { format } from "date-fns"
import { quillToText } from "@/features/messages/lib/quill-to-text"
import { useGetSent } from "@/features/threads/api/use-get-sent"

export default function DraftsPage() {
    const workspaceId = useWorkspaceId()
    const router = useRouter()
    const { data: messages, isLoading } = useGetSent({ workspaceId })
    const { data: currentMember } = useCurrentMember({ workspaceId })
    const { data: members } = useGetMembers({ workspaceId })

    const currentUser = members?.find(m => m._id === currentMember?._id)

    const handleClick = (channelId: string) => {
        router.push(`/dashboard/workspace/${workspaceId}/channel/${channelId}`)
    }

    return (
        <div className="h-full flex flex-col overflow-hidden bg-gray-50">
            {/* Header */}
            <div className="flex items-center gap-3 px-6 py-4 border-b bg-white shrink-0 shadow-sm">
                <div className="size-8 rounded-lg bg-purple-50 flex items-center justify-center">
                    <SendHorizonal className="size-4 text-purple-500" />
                </div>
                <div>
                    <h1 className="text-base font-bold leading-none">Sent</h1>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                        {messages?.length ?? 0} message{messages?.length !== 1 ? "s" : ""} sent across channels
                    </p>
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto bg-white divide-y">
                {isLoading ? (
                    <div className="flex items-center justify-center h-full">
                        <Loader className="size-5 animate-spin text-[#ff5018]" />
                    </div>
                ) : !messages || messages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full gap-3 text-muted-foreground">
                        <div className="size-16 rounded-2xl bg-purple-50 flex items-center justify-center">
                            <SendHorizonal className="size-8 text-purple-300" />
                        </div>
                        <div className="text-center">
                            <p className="text-sm font-medium">No messages sent yet</p>
                            <p className="text-xs mt-1">Messages you send in channels will appear here</p>
                        </div>
                    </div>
                ) : (
                    messages.map(msg => {
                        const preview = quillToText(msg.body)
                        return (
                            <div
                                key={msg._id}
                                onClick={() => msg.channel?._id && handleClick(msg.channel._id)}
                                className="flex items-start gap-3 px-4 py-3 hover:bg-gray-50 cursor-pointer transition-colors"
                            >
                                <Avatar className="size-9 shrink-0 mt-0.5">
                                    <AvatarImage src={currentUser?.user?.image} />
                                    <AvatarFallback className="text-xs">
                                        {currentUser?.user?.name?.[0] ?? "?"}
                                    </AvatarFallback>
                                </Avatar>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between gap-2">
                                        <div className="flex items-center gap-1.5">
                                            <span className="text-sm font-semibold">
                                                {currentUser?.user?.name ?? "You"}
                                            </span>
                                            {msg.channel && (
                                                <span className="flex items-center gap-0.5 text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded-full">
                                                    <Hash className="size-2.5" />
                                                    {msg.channel.name}
                                                </span>
                                            )}
                                        </div>
                                        <span className="text-[10px] text-muted-foreground shrink-0">
                                            {format(msg._creationTime, "MMM d, h:mm a")}
                                        </span>
                                    </div>
                                    {msg.image ? (
                                        <div className="flex items-center gap-1 mt-0.5">
                                            <ImageIcon className="size-3 text-muted-foreground" />
                                            <p className="text-xs text-muted-foreground">Image</p>
                                        </div>
                                    ) : (
                                        <p className="text-xs text-muted-foreground truncate mt-0.5">
                                            {preview || "Sent a message"}
                                        </p>
                                    )}
                                </div>
                            </div>
                        )
                    })
                )}
            </div>
        </div>
    )
}