"use client"

import { useWorkspaceId } from "@/hooks/use-workspace-id"
import { useGetThreads } from "@/features/threads/api/use-get-threads"
import { useRouter } from "next/navigation"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Loader, MessagesSquare, Hash } from "lucide-react"
import { format } from "date-fns"
import { cn } from "@/lib/utils"
import { quillToText } from "@/features/messages/lib/quill-to-text"

type ThreadsData = NonNullable<ReturnType<typeof useGetThreads>["data"]>
type ThreadData = NonNullable<ThreadsData["myThreads"]>[number]

const ThreadItem = ({ thread, onSelect }: { thread: ThreadData; onSelect: (channelId: string) => void }) => {
    const preview = quillToText(thread.body)
    return (
        <div
            onClick={() => thread.channel?._id && onSelect(thread.channel._id)}
            className="flex items-start gap-3 px-4 py-3 hover:bg-[#f7f2ee] cursor-pointer border-b border-[#381d2a]/10 transition-colors"
        >
            <Avatar className="size-9 shrink-0 mt-0.5 rounded-md">
                <AvatarImage src={thread.author?.user?.image} />
                <AvatarFallback className="text-xs rounded-md bg-[#381d2a] text-white">
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
                            <span className="flex items-center gap-0.5 text-[11px] font-medium text-[#1b1017]/70 bg-[#efe8e3] px-2 py-0.5 rounded-md">
                                <Hash className="size-2.5" />
                                {thread.channel.name}
                            </span>
                        )}
                    </div>
                    <span className="text-[11px] text-[#1b1017]/60 shrink-0">
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
    <div className="flex flex-col items-center justify-center py-12 text-[#1b1017]/60 gap-3">
        <div className="size-14 rounded-2xl bg-[#ff5018]/10 text-[#ff5018] flex items-center justify-center">
            <MessagesSquare className="size-6 text-[#ff5018]" />
        </div>
        <p className="text-sm">{label}</p>
    </div>
)

export default function ThreadsPage() {
    const workspaceId = useWorkspaceId()
    const router = useRouter()
    const { data, isLoading } = useGetThreads({ workspaceId })

    const handleClick = (channelId: string) => {
        router.push(`/dashboard/workspace/${workspaceId}/channel/${channelId}`)
    }


    return (
        <div className="h-full flex flex-col overflow-hidden bg-[#fbf9f7]">
            {/* Header */}
            <div className="flex items-center gap-3 px-6 h-14 border-b bg-white shrink-0 shadow-none">
                <div className="size-8 rounded-lg bg-[#ff5018]/10 flex items-center justify-center">
                    <MessagesSquare className="size-4 text-[#ff5018]" />
                </div>
                <div>
                    <h1 className="tracking-tight text-[17px] font-semibold leading-none text-[#1b1017]">Threads</h1>
                    <p className="text-[11px] text-[#1b1017]/60 mt-1">
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
                            <div className="px-4 py-2 bg-[#f7f2ee] border-b">
                                <p className="text-[11px] font-semibold text-[#1b1017]/60 uppercase tracking-wider">
                                    My Threads
                                    {(data?.myThreads?.length ?? 0) > 0 && (
                                        <span className="ml-1.5 text-[#ff5018]">
                                            {data?.myThreads?.length}
                                        </span>
                                    )}
                                </p>
                            </div>
                            {data?.myThreads && data.myThreads.length > 0
                                ? data.myThreads.map(t => <ThreadItem key={t._id} thread={t} onSelect={handleClick} />)
                                : <EmptySection label="No threads started yet" />
                            }
                        </div>

                        {/* Participated */}
                        <div>
                            <div className="px-4 py-2 bg-[#f7f2ee] border-b border-t">
                                <p className="text-[11px] font-semibold text-[#1b1017]/60 uppercase tracking-wider">
                                    Participated In
                                    {(data?.participatedThreads?.length ?? 0) > 0 && (
                                        <span className="ml-1.5 text-[#ff5018]">
                                            {data?.participatedThreads?.length}
                                        </span>
                                    )}
                                </p>
                            </div>
                            {data?.participatedThreads && data.participatedThreads.length > 0
                                ? data.participatedThreads.map(t => <ThreadItem key={t._id} thread={t} onSelect={handleClick} />)
                                : <EmptySection label="No threads participated in yet" />
                            }
                        </div>
                    </>
                )}
            </div>
        </div>
    )
}