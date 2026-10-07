import { GetMessagesReturnType } from "@/features/messages/api/use-get-messages";
import { format, isToday, isYesterday, differenceInMinutes } from "date-fns";
import { Message } from "./message";
import { ChannelHero } from "./channel-hero";
import { useState, useEffect, useRef, useMemo } from "react";
import { Id } from "../../../../../../convex/_generated/dataModel";
import { useWorkspaceId } from "@/hooks/use-workspace-id";
import { useCurrentMember } from "@/features/members/api/use-current-member";
import { Loader } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { ConversationHero } from "./conversation-hero";

const TIME_THRESHOLD = 5;

interface MessageListProps {
    memberName?: string;
    memberImage?: string;
    channelName?: string;
    channelCreationTime?: number;
    variant?: "channel" | "thread" | "conversation";
    data: GetMessagesReturnType | undefined;
    loadMore: () => void;
    isLoadingMore: boolean;
    canLoadMore: boolean;
}

const formatDateLabel = (dateStr: string) => {
    const date = new Date(dateStr);
    if (isToday(date)) return "Today";
    if (isYesterday(date)) return "Yesterday";
    return format(date, "EEEE, MMMM d");
};

export const MessageList = ({
    memberName,
    memberImage,
    channelName,
    channelCreationTime,
    data,
    variant = "channel",
    loadMore,
    isLoadingMore,
    canLoadMore,
}: MessageListProps) => {
    const workspaceId = useWorkspaceId();
    const { data: currentMember } = useCurrentMember({ workspaceId });
    const [editingId, setEditingId] = useState<Id<"messages"> | null>(null);

    // Add this ref for auto scroll
    const bottomRef = useRef<HTMLDivElement>(null);
    const prevDataLengthRef = useRef<number>(0);

    // Scroll to bottom when new message is added
    useEffect(() => {
        const currentLength = data?.length ?? 0;
        if (currentLength > prevDataLengthRef.current) {
            bottomRef.current?.scrollIntoView({ behavior: "smooth" });
        }
        prevDataLengthRef.current = currentLength;
    }, [data?.length]);

    const groupedMessages = useMemo(
        () =>
            data?.reduce(
                (groups, message) => {
                    const dateKey = format(new Date(message._creationTime), "yyyy-MM-dd");
                    if (!groups[dateKey]) {
                        groups[dateKey] = [];
                    }
                    groups[dateKey].unshift(message);
                    return groups;
                },
                {} as Record<string, NonNullable<typeof data>>
            ),
        [data]
    );

    // One stable IntersectionObserver instead of a new one on every render.
    const searchParams = useSearchParams();
    const targetMessageId = searchParams.get("message");
    const handledTarget = useRef<string | null>(null);
    useEffect(() => {
        if (!targetMessageId || handledTarget.current === targetMessageId) return;
        const el = document.getElementById(`msg-${targetMessageId}`);
        if (!el) return;
        handledTarget.current = targetMessageId;
        el.scrollIntoView({ behavior: "smooth", block: "center" });
        el.classList.add("bg-[#ff5018]/15", "transition-colors", "duration-700");
        const t = setTimeout(() => el.classList.remove("bg-[#ff5018]/15"), 2500);
        return () => clearTimeout(t);
    }, [targetMessageId, data]);

    const loadMoreRef = useRef<HTMLDivElement>(null);
    const loadMoreFn = useRef(loadMore);
    const canLoadRef = useRef(canLoadMore);
    loadMoreFn.current = loadMore;
    canLoadRef.current = canLoadMore;
    useEffect(() => {
        const el = loadMoreRef.current;
        if (!el) return;
        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting && canLoadRef.current) loadMoreFn.current();
            },
            { threshold: 1.0 }
        );
        observer.observe(el);
        return () => observer.disconnect();
    }, []);

    return (
        <div className="flex-1 flex flex-col-reverse pb-4 overflow-y-auto messages-scrollbar">
            {/* Add this anchor div at the very top (which is visual bottom due to flex-col-reverse) */}
            <div ref={bottomRef} />

            {Object.entries(groupedMessages || {}).map(([dateKey, messages]) => (
                <div key={dateKey}>
                    <div className="text-center my-3 relative">
                        <hr className="absolute top-1/2 left-0 right-0 border-t border-[#381d2a]/12" />
                        <span className="relative inline-block bg-white px-4 py-1 rounded-full text-xs font-medium text-[#1b1017]/60 border border-[#381d2a]/12 shadow-none">
                            {formatDateLabel(dateKey)}
                        </span>
                    </div>
                    {messages.map((message, index) => {
                        const prevMessage = messages[index - 1];
                        const isCompact =
                            prevMessage &&
                            prevMessage.user?._id === message.user?._id &&
                            Math.abs(
                                differenceInMinutes(
                                    new Date(message._creationTime),
                                    new Date(prevMessage._creationTime)
                                )
                            ) < TIME_THRESHOLD;
                        return (
                            <Message
                                key={message._id}
                                id={message._id}
                                memberId={message.memberId}
                                authorImage={message.user.image}
                                authorName={message.user.name}
                                isAuthor={message.memberId === currentMember?._id}
                                reactions={message.reactions}
                                body={message.body}
                                image={message.image}
                                file={message.file}
                                fileName={message.fileName}
                                fileType={message.fileType}
                                fileSize={message.fileSize}
                                updatedAt={message.updatedAt}
                                createdAt={message._creationTime}
                                threadCount={message.threadCount}
                                threadImage={message.threadImage}
                                threadName={message.threadName}
                                threadTimestamp={message.threadTimestamp}
                                isEditing={editingId === message._id}
                                setEditingId={setEditingId}
                                isCompact={isCompact}
                                hideThreadButton={variant === "thread"}
                            />
                        );
                    })}
                </div>
            ))}

            <div className="h-1" ref={loadMoreRef} />
            {isLoadingMore && (
                <div className="text-center my-2 relative">
                    <hr className="absolute top-1/2 left-0 right-0 border-t border-[#381d2a]/12" />
                    <span className="relative inline-block bg-white px-4 py-1 rounded-full text-xs font-medium text-[#1b1017]/60 border border-[#381d2a]/12 shadow-none">
                        <Loader className="size-4 animate-spin" />
                    </span>
                </div>
            )}
            {variant === "channel" && channelName && channelCreationTime && (
                <ChannelHero name={channelName} creationTime={channelCreationTime} />
            )}
            {variant === "conversation" && (
                <ConversationHero name={memberName} image={memberImage} />
            )}
        </div>
    );
};