"use client"

import { useWorkspaceId } from "@/hooks/use-workspace-id"
import { useGetThreads } from "@/features/threads/api/use-get-threads"
import { useRouter } from "next/navigation"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Loader, MessagesSquare, Hash } from "lucide-react"
import { format } from "date-fns"
import { cn } from "@/lib/utils"
import { quillToText } from "@/features/messages/lib/quill-to-text"

export default function ThreadsPage() {
    const workspaceId = useWorkspaceId()
    const router = useRouter()
    const { data, isLoading } = useGetThreads({ workspaceId })

    const handleClick = (channelId: string) => {
        router.push(`/dashboard/workspace/${workspaceId}/channel/${channelId}`)
    }

    const ThreadItem = ({ thread }: { thread: any }) => {
        const preview = quillToText(thread.body)
        return (
            <div
                onClick={() => thread.channel?._id && handleClick(thread.channel._id)}
                className="flex items-start gap-3 px-4 py-3 hover:bg-gray-50 cursor-pointer border-b transition-colors"
            >
                <Avatar className="size-9 shrink-0 mt-0.5">
                    <AvatarImage src={thread.author?.user?.image} />
                    <AvatarFallback className="text-xs">
                        {thread.author?.user?.name?.[0] ?? "?"}
                    </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5">
                            <span className="text-sm font-semibold truncate">
                                {thread.author?.user?.name ?? "Unknown"}
                            </span>
                            {thread.channel && (
                                <span className="flex items-center gap-0.5 text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded-full">
                                    <Hash className="size-2.5" />
                                    {thread.channel.name}
                                </span>
                            )}
                        </div>
                        <span className="text-[10px] text-muted-foreground shrink-0">
                            {format(thread._creationTime, "MMM d, h:mm a")}
                        </span>
                    </div>
                    <p className="text-xs text-muted-foreground truncate mt-0.5">
                        {preview || "Sent a message"}
                    </p>
                    <div className="flex items-center gap-1 mt-1.5">
                        <div className="size-1.5 rounded-full bg-[#ff5018]" />
                        <span className="text-[11px] text-[#ff5018] font-medium">
                            {thread.replyCount} {thread.replyCount === 1 ? "reply" : "replies"}
                        </span>
                        <span className="text-[11px] text-muted-foreground">
                            · Last reply {format(thread.lastReplyAt, "MMM d, h:mm a")}
                        </span>
                    </div>
                </div>
            </div>
        )
    }

    const EmptySection = ({ label }: { label: string }) => (
        <div className="flex flex-col items-center justify-center py-10 text-muted-foreground gap-2">
            <MessagesSquare className="size-8 opacity-30" />
            <p className="text-xs">{label}</p>
        </div>
    )

    return (
        <div className="h-full flex flex-col overflow-hidden bg-gray-50">
            {/* Header */}
            <div className="flex items-center gap-3 px-6 py-4 border-b bg-white shrink-0 shadow-sm">
                <div className="size-8 rounded-lg bg-blue-50 flex items-center justify-center">
                    <MessagesSquare className="size-4 text-blue-500" />
                </div>
                <div>
                    <h1 className="text-base font-bold leading-none">Threads</h1>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                        Conversations you started or joined
                    </p>
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto bg-white">
                {isLoading ? (
                    <div className="flex items-center justify-center h-full">
                        <Loader className="size-5 animate-spin text-[#ff5018]" />
                    </div>
                ) : (
                    <>
                        {/* My Threads */}
                        <div>
                            <div className="px-4 py-2 bg-gray-50 border-b">
                                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                                    My Threads
                                    {(data?.myThreads?.length ?? 0) > 0 && (
                                        <span className="ml-1.5 text-[#ff5018]">
                                            {data?.myThreads?.length}
                                        </span>
                                    )}
                                </p>
                            </div>
                            {data?.myThreads && data.myThreads.length > 0
                                ? data.myThreads.map(t => <ThreadItem key={t._id} thread={t} />)
                                : <EmptySection label="No threads started yet" />
                            }
                        </div>

                        {/* Participated */}
                        <div>
                            <div className="px-4 py-2 bg-gray-50 border-b border-t">
                                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                                    Participated In
                                    {(data?.participatedThreads?.length ?? 0) > 0 && (
                                        <span className="ml-1.5 text-[#ff5018]">
                                            {data?.participatedThreads?.length}
                                        </span>
                                    )}
                                </p>
                            </div>
                            {data?.participatedThreads && data.participatedThreads.length > 0
                                ? data.participatedThreads.map(t => <ThreadItem key={t._id} thread={t} />)
                                : <EmptySection label="No threads participated in yet" />
                            }
                        </div>
                    </>
                )}
            </div>
        </div>
    )
}