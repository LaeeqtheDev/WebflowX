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
        <div className="h-full flex flex-col overflow-hidden bg-gray-50">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b bg-white shrink-0 shadow-sm">
                <div className="flex items-center gap-3">
                    <div className="size-8 rounded-lg bg-pink-50 flex items-center justify-center">
                        <MessageSquare className="size-4 text-pink-500" />
                    </div>
                    <div>
                        <h1 className="text-base font-bold leading-none">Direct Messages</h1>
                        <p className="text-[11px] text-muted-foreground mt-0.5">
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
            <div className="px-4 py-3 bg-white border-b">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
                    <Input
                        placeholder="Search conversations..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        className="pl-8 h-8 text-xs"
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
                    <div className="flex flex-col items-center justify-center h-full gap-3 text-muted-foreground">
                        <div className="size-16 rounded-2xl bg-pink-50 flex items-center justify-center">
                            <MessageSquare className="size-8 text-pink-300" />
                        </div>
                        <div className="text-center">
                            <p className="text-sm font-medium">No conversations yet</p>
                            <p className="text-xs mt-1">
                                Click on a member in the sidebar to start a DM
                            </p>
                        </div>
                    </div>
                ) : (
                    <div className="divide-y">
                        {filtered.map(conv => {
                            const lastMessageText = conv.lastMessage?.body
                                ? quillToText(conv.lastMessage.body)
                                : "No messages yet"
                            const hasUnread = (conv.unreadCount ?? 0) > 0

                            return (
                                <div
                                    key={conv._id}
                                    onClick={() => router.push(
                                        `/dashboard/workspace/${workspaceId}/member/${conv.otherMember?._id}`
                                    )}
                                    className={cn(
                                        "flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-gray-50 transition-colors",
                                        hasUnread && "bg-pink-50/40"
                                    )}
                                >
                                    {/* Avatar */}
                                    <div className="relative shrink-0">
                                        <Avatar className="size-11">
                                            <AvatarImage src={conv.otherMember?.user?.image} />
                                            <AvatarFallback className="text-sm font-medium">
                                                {conv.otherMember?.user?.name?.[0] ?? "?"}
                                            </AvatarFallback>
                                        </Avatar>
                                        <div className="absolute bottom-0 right-0 size-2.5 rounded-full bg-green-400 border-2 border-white" />
                                    </div>

                                    {/* Content */}
                                    <div className="flex-1 min-w-0">
                                        {/* Name + timestamp */}
                                        <div className="flex items-center justify-between gap-2">
                                            <p className={cn(
                                                "text-sm truncate",
                                                hasUnread ? "font-bold" : "font-medium"
                                            )}>
                                                {conv.otherMember?.user?.name ?? "Unknown"}
                                            </p>
                                            {conv.lastMessage && (
                                                <span className={cn(
                                                    "text-[10px] shrink-0",
                                                    hasUnread ? "text-[#ff5018] font-semibold" : "text-muted-foreground"
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
                                                    ? "text-foreground font-medium"
                                                    : "text-muted-foreground"
                                            )}>
                                                {lastMessageText}
                                            </p>
                                            {hasUnread && (
                                                <span className="text-[9px] bg-[#ff5018] text-white px-1.5 py-0.5 rounded-full font-bold shrink-0 min-w-4.5 text-center">
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