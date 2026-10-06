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
        <div className="h-full flex flex-col overflow-hidden bg-[#fbf9f7]">
            {/* Header */}
            <div className="flex items-center gap-3 px-6 h-14 border-b bg-white shrink-0 shadow-none">
                <div className="size-8 rounded-lg bg-[#ff5018]/10 flex items-center justify-center">
                    <SendHorizonal className="size-4 text-[#ff5018]" />
                </div>
                <div>
                    <h1 className="tracking-tight text-[17px] font-semibold leading-none text-[#1b1017]">Sent</h1>
                    <p className="text-[11px] text-[#1b1017]/60 mt-1">
                        {messages?.length ?? 0} message{messages?.length !== 1 ? "s" : ""} sent across channels
                    </p>
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto bg-white divide-y divide-[#381d2a]/10">
                {isLoading ? (
                    <div className="flex items-center justify-center h-full">
                        <Loader className="size-5 animate-spin text-[#ff5018]" />
                    </div>
                ) : !messages || messages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full gap-4 text-[#1b1017]/60">
                        <div className="size-14 rounded-2xl bg-[#ff5018]/10 text-[#ff5018] flex items-center justify-center">
                            <SendHorizonal className="size-6 text-[#ff5018]" />
                        </div>
                        <div className="text-center">
                            <p className="font-semibold tracking-tight text-[#1b1017]">No messages sent yet</p>
                            <p className="text-sm mt-1">Messages you send in channels will appear here</p>
                        </div>
                    </div>
                ) : (
                    messages.map(msg => {
                        const preview = quillToText(msg.body)
                        return (
                            <div
                                key={msg._id}
                                onClick={() => msg.channel?._id && handleClick(msg.channel._id)}
                                className="flex items-start gap-3 px-4 py-3 hover:bg-[#f7f2ee] cursor-pointer transition-colors"
                            >
                                <Avatar className="size-9 shrink-0 mt-0.5 rounded-md">
                                    <AvatarImage src={currentUser?.user?.image} />
                                    <AvatarFallback className="text-xs rounded-md bg-[#381d2a] text-white">
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
                                                <span className="flex items-center gap-0.5 text-[11px] font-medium text-[#1b1017]/70 bg-[#efe8e3] px-2 py-0.5 rounded-md">
                                                    <Hash className="size-2.5" />
                                                    {msg.channel.name}
                                                </span>
                                            )}
                                        </div>
                                        <span className="text-[11px] text-[#1b1017]/60 shrink-0">
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