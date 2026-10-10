import { GetMessagesReturnType } from "@/features/messages/api/use-get-messages";
import { differenceInMinutes } from "date-fns";
import { dayKey, formatDayLabel } from "@/lib/date-label";
import { Message } from "./message";
import { ChannelHero } from "./channel-hero";
import { useState, useEffect, useRef, useMemo } from "react";
import { Id } from "../../../../../../convex/_generated/dataModel";
import { useWorkspaceId } from "@/hooks/use-workspace-id";
import { useCurrentMember } from "@/features/members/api/use-current-member";
import { Loader } from "lucide-react";
import { usePermissions } from "@/hooks/use-permissions";
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
    /** First page still on its way and nothing to show yet: draw placeholder rows instead of the "no messages" welcome. */
    loading?: boolean;
    /** Shown just under the channel intro when there are no messages yet. */
    emptyState?: React.ReactNode;
}

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
    emptyState,
    loading = false,
}: MessageListProps) => {
    const workspaceId = useWorkspaceId();
    const { data: currentMember } = useCurrentMember({ workspaceId });
    const perms = usePermissions();
    const [editingId, setEditingId] = useState<Id<"messages"> | null>(null);

    // Add this ref for auto scroll
    const bottomRef = useRef<HTMLDivElement>(null);
    const prevDataLengthRef = useRef<number>(0);

    // The list is flex-col-reverse, so scrollTop 0 is the newest message.
    const stickToBottom = useRef(true);
    const jumpToBottom = () => {
        const el = listRef.current;
        if (el) el.scrollTop = 0;
    };

    // Scroll to bottom when new message is added. Smooth scrolling is computed against the
    // keyboard-open layout on phones and ends up short once the keyboard closes, so jump
    // instantly and again after the keyboard animation has finished.
    useEffect(() => {
        const currentLength = data?.length ?? 0;
        const timers: ReturnType<typeof setTimeout>[] = [];
        if (currentLength > prevDataLengthRef.current && prevDataLengthRef.current > 0) {
            stickToBottom.current = true;
            jumpToBottom();
            requestAnimationFrame(jumpToBottom);
            timers.push(setTimeout(jumpToBottom, 150), setTimeout(jumpToBottom, 400));
        }
        prevDataLengthRef.current = currentLength;
        return () => timers.forEach(clearTimeout);
    }, [data?.length]);

    // Track whether the reader is at the bottom, and keep them there when the viewport
    // changes size (mobile keyboard opening or closing, rotation).
    useEffect(() => {
        const el = listRef.current;
        if (!el) return;
        const onScroll = () => { stickToBottom.current = Math.abs(el.scrollTop) < 80; };
        const onResize = () => { if (stickToBottom.current) { jumpToBottom(); requestAnimationFrame(jumpToBottom); } };
        el.addEventListener("scroll", onScroll, { passive: true });
        const vv = window.visualViewport;
        vv?.addEventListener("resize", onResize);
        const ro = new ResizeObserver(onResize);
        ro.observe(el);
        return () => {
            el.removeEventListener("scroll", onScroll);
            vv?.removeEventListener("resize", onResize);
            ro.disconnect();
        };
    }, []);

    const groupedMessages = useMemo(
        () =>
            data?.reduce(
                (groups, message) => {
                    const dateKey = dayKey(message._creationTime);
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
    const targetReplyId = searchParams.get("reply");
    const listRef = useRef<HTMLDivElement>(null);
    const handledTargets = useRef<Set<string>>(new Set());
    const loadAttempts = useRef(0);
    useEffect(() => {
        const timers: ReturnType<typeof setTimeout>[] = [];
        // Inside the thread panel only the reply matters; in channels / DMs only the main message does
        const ids = variant === "thread" ? [targetReplyId] : [targetMessageId];
        for (const id of ids) {
            if (!id || handledTargets.current.has(id)) continue;
            const el = listRef.current?.querySelector<HTMLElement>(`#msg-${id}`);
            if (!el) {
                // Not loaded yet: page further back (bounded) until it shows up
                if (canLoadMore && loadAttempts.current < 20) {
                    loadAttempts.current += 1;
                    loadMore();
                }
                continue;
            }
            handledTargets.current.add(id);
            // wait a tick so layout (images, grouping) settles before scrolling
            timers.push(setTimeout(() => {
                el.scrollIntoView({ behavior: "smooth", block: "center" });
                el.classList.add("bg-brand/15", "transition-colors", "duration-700");
                timers.push(setTimeout(() => el.classList.remove("bg-brand/15"), 3000));
            }, 150));
        }
        return () => { /* timers intentionally left to finish the highlight */ };
    }, [targetMessageId, targetReplyId, variant, data, canLoadMore, loadMore]);

    const loadMoreRef = useRef<HTMLDivElement>(null);
    const loadMoreFn = useRef(loadMore);
    const canLoadRef = useRef(canLoadMore);
    useEffect(() => {
        loadMoreFn.current = loadMore;
        canLoadRef.current = canLoadMore;
    });
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
        <div ref={listRef} className="flex-1 flex flex-col-reverse pb-4 overflow-y-auto messages-scrollbar">
            {/* Add this anchor div at the very top (which is visual bottom due to flex-col-reverse) */}
            <div ref={bottomRef} />

            {Object.entries(groupedMessages || {}).map(([dateKey, messages]) => (
                <div key={dateKey}>
                    <div className="text-center my-3 relative">
                        <hr className="absolute top-1/2 left-0 right-0 border-t border-plum/12" />
                        <span className="relative inline-block bg-surface px-4 py-1 rounded-full text-xs font-medium text-ink/60 border border-plum/12 shadow-none">
                            {formatDayLabel(dateKey)}
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
                                canModerate={variant !== "conversation" && perms.can("deleteMessages")}
                                reactions={message.reactions}
                                body={message.body}
                                image={message.image}
                                file={message.file}
                                fileName={message.fileName}
                                isBot={!!message.integrationName}
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
                    <hr className="absolute top-1/2 left-0 right-0 border-t border-plum/12" />
                    <span className="relative inline-block bg-surface px-4 py-1 rounded-full text-xs font-medium text-ink/60 border border-plum/12 shadow-none">
                        <Loader className="size-4 animate-spin" />
                    </span>
                </div>
            )}
            {loading && (
                <div className="animate-pulse space-y-5 px-5 py-4" aria-hidden>
                    {[60, 82, 44, 70].map((w, i) => (
                        <div key={i} className="flex gap-3">
                            <div className="size-9 shrink-0 rounded-lg bg-plum/10" />
                            <div className="flex-1 space-y-2 pt-1">
                                <div className="h-3 w-32 rounded bg-plum/10" />
                                <div className="h-3 rounded bg-plum/10" style={{ width: `${w}%` }} />
                            </div>
                        </div>
                    ))}
                </div>
            )}
            {!loading && data && data.length === 0 && emptyState}
            {variant === "channel" && channelName && channelCreationTime && (
                <ChannelHero name={channelName} creationTime={channelCreationTime} />
            )}
            {variant === "conversation" && (
                <ConversationHero name={memberName} image={memberImage} />
            )}
        </div>
    );
};