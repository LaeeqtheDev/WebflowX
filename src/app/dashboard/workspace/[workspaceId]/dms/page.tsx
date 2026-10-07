"use client"

import { useWorkspaceId } from "@/hooks/use-workspace-id"
import { useGetConversations } from "@/features/conversations/api/use-get-conversations"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Loader, MessageSquare, Search } from "lucide-react"
import { useRouter } from "next/navigation"
import { cn } from "@/lib/utils"
import { format } from "date-fns"
import { useState } from "react"
import { Input } from "@/components/ui/input"
import { messageLink } from "@/features/messages/lib/message-link"
import { quillToText } from "@/features/messages/lib/quill-to-text"

export default function DmsPage() {
    const workspaceId = useWorkspaceId()
    const router = useRouter()
    const { data: conversations, isLoading } = useGetConversations({ workspaceId })
    const [search, setSearch] = useState("")

    const filtered = conversations?.filter(c =>
        c.otherMember?.user?.name?.toLowerCase().includes(search.toLowerCase())
    )

    const totalUnread = conversations?.reduce((acc, c) => acc + (c.unreadCount ?? 0), 0) ?? 0

    return (
        <div className="h-full flex flex-col overflow-hidden bg-[#fbf9f7]">
            {/* Header */}
            <div className="flex items-center justify-between px-6 h-14 border-b bg-white shrink-0 shadow-none">
                <div className="flex items-center gap-3">
                    <div className="size-8 rounded-lg bg-[#ff5018]/10 flex items-center justify-center">
                        <MessageSquare className="size-4 text-[#ff5018]" />
                    </div>
                    <div>
                        <h1 className="tracking-tight text-[17px] font-semibold leading-none text-[#1b1017]">Direct Messages</h1>
                        <p className="text-[11px] text-[#1b1017]/60 mt-1">
                            {conversations?.length ?? 0} conversation{conversations?.length !== 1 ? "s" : ""}
                            {totalUnread > 0 && (
                                <span className="ml-1.5 text-[#ff5018] font-semibold">
                                    · {totalUnread} unread
                                </span>
                            )}
                        </p>
                    </div>
                </div>
            </div>

            {/* Search */}
            <div className="px-4 py-3 bg-white border-b border-[#381d2a]/10">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
                    <Input
                        placeholder="Search conversations..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        className="pl-8 h-9 text-sm rounded-lg border-[#381d2a]/15 focus-visible:ring-[#ff5018]/40 focus-visible:border-[#ff5018]"
                    />
                </div>
            </div>

            {/* Conversations list */}
            <div className="flex-1 overflow-y-auto bg-white">
                {isLoading ? (
                    <div className="flex items-center justify-center h-full">
                        <Loader className="size-5 animate-spin text-[#ff5018]" />
                    </div>
                ) : !filtered || filtered.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full gap-4 text-[#1b1017]/60">
                        <div className="size-14 rounded-2xl bg-[#ff5018]/10 text-[#ff5018] flex items-center justify-center">
                            <MessageSquare className="size-6 text-[#ff5018]" />
                        </div>
                        <div className="text-center">
                            <p className="font-semibold tracking-tight text-[#1b1017]">No conversations yet</p>
                            <p className="text-sm mt-1">
                                Click on a member in the sidebar to start a DM
                            </p>
                        </div>
                    </div>
                ) : (
                    <div className="divide-y divide-[#381d2a]/10">
                        {filtered.map(conv => {
                            const lastMessageText = conv.lastMessage?.body
                                ? quillToText(conv.lastMessage.body)
                                : "No messages yet"
                            const hasUnread = (conv.unreadCount ?? 0) > 0

                            return (
                                <div
                                    key={conv._id}
                                    onClick={() => router.push(messageLink({
                                        workspaceId,
                                        memberId: conv.otherMember?._id,
                                        messageId: conv.lastMessage?._id,
                                        parentMessageId: conv.lastMessage?.parentMessagesId,
                                    }))}
                                    className={cn(
                                        "flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-[#f7f2ee] transition-colors",
                                        hasUnread && "bg-[#ff5018]/5"
                                    )}
                                >
                                    {/* Avatar */}
                                    <div className="relative shrink-0">
                                        <Avatar className="size-11 rounded-md">
                                            <AvatarImage src={conv.otherMember?.user?.image} />
                                            <AvatarFallback className="text-sm font-medium rounded-md bg-[#381d2a] text-white">
                                                {conv.otherMember?.user?.name?.[0] ?? "?"}
                                            </AvatarFallback>
                                        </Avatar>
                                        <div className="absolute bottom-0 right-0 size-2.5 rounded-full bg-green-500 border-2 border-white" />
                                    </div>

                                    {/* Content */}
                                    <div className="flex-1 min-w-0">
                                        {/* Name + timestamp */}
                                        <div className="flex items-center justify-between gap-2">
                                            <p className={cn(
                                                "text-sm truncate",
                                                hasUnread ? "font-semibold" : "font-medium"
                                            )}>
                                                {conv.otherMember?.user?.name ?? "Unknown"}
                                            </p>
                                            {conv.lastMessage && (
                                                <span className={cn(
                                                    "text-[11px] shrink-0",
                                                    hasUnread ? "text-[#ff5018] font-semibold" : "text-[#1b1017]/60"
                                                )}>
                                                    {format(conv.lastMessage._creationTime, "MMM d, h:mm a")}
                                                </span>
                                            )}
                                        </div>

                                        {/* Last message + unread badge */}
                                        <div className="flex items-center justify-between gap-2 mt-0.5">
                                            <p className={cn(
                                                "text-xs truncate flex-1",
                                                hasUnread
                                                    ? "text-[#1b1017] font-medium"
                                                    : "text-[#1b1017]/60"
                                            )}>
                                                {lastMessageText}
                                            </p>
                                            {hasUnread && (
                                                <span className="text-[10px] bg-[#ff5018] text-white px-1.5 py-0.5 rounded-md font-semibold shrink-0 min-w-4.5 text-center">
                                                    {(conv.unreadCount ?? 0) > 9 ? "9+" : conv.unreadCount}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                )}
            </div>
        </div>
    )
}