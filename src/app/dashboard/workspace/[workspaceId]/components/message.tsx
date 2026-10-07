import { memo } from "react";
import { parseDelta } from "@/lib/delta";
import { format, isToday, isYesterday } from "date-fns";
import { Doc, Id } from "../../../../../../convex/_generated/dataModel";
import dynamic from "next/dynamic";
import { Hint } from "./hints";
const MessageToTaskModal = dynamic(() => import("./message-to-task-modal").then((m) => m.MessageToTaskModal), { ssr: false });
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Thumbnail } from "./thumbnail";
import { Toolbar2 } from "./Toolbar2";
import { useState } from "react";
import { useUpdateMessage } from "@/features/messages/api/use-update-message";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useRemoveMessage } from "@/features/messages/api/use-remove-message";
import { useConfirm } from "../../hooks/use-confirm";
import { useToggleReaction } from "@/features/reactions/api/use-toggle-reaction";
import { Reactions } from "./reactions";
import { usePanel } from "@/hooks/use-panel";
import { ThreadBar } from "./theadBar";
import { FileAttachment } from "./File-attachment";
import { useMessageMarks } from "@/features/marks/use-marks";
import { Pin } from "lucide-react";


const Renderer = dynamic(() => import("@/components/renderer"), { ssr: false });
const Editor = dynamic(
    () => import("@/app/dashboard/workspace/[workspaceId]/components/Editor"),
    { ssr: false }
);

interface MessageProps {
    id: Id<"messages">;
    memberId: Id<"members">;
    authorImage?: string;
    authorName?: string;
    isAuthor: boolean;
    canModerate?: boolean;
    reactions: Array<
        Omit<Doc<"reactions">, "memberId"> & {
            count: number;
            memberIds: Id<"members">[];
        }
    >;
    body: Doc<"messages">["body"];
    image: string | null | undefined;
    file?: string | null | undefined;
    fileName?: string | null | undefined;
    isBot?: boolean;
    fileType?: string | null | undefined;
    fileSize?: number | null | undefined;
    createdAt: Doc<"messages">["_creationTime"];
    updatedAt: Doc<"messages">["updatedAt"];
    isEditing: boolean;
    isCompact: boolean;
    setEditingId: (id: Id<"messages"> | null) => void;
    hideThreadButton?: boolean;
    threadCount?: number;
    threadImage?: string;
    threadTimestamp?: number;
    threadName?: string;
}

const formatFullTime = (date: Date) => {
    return `${
        isToday(date)
            ? "Today"
            : isYesterday(date)
            ? "Yesterday"
            : format(date, "MMM d, yyyy")
    } at ${format(date, "h:mm:ss a")}`;
};

const MessageImpl = ({
    id,
    image,
    file,
    fileName,
    fileType,
    fileSize,
    isBot,
    isAuthor,
    canModerate,
    memberId,
    authorImage,
    authorName = "Member",
    reactions,
    body,
    createdAt,
    updatedAt,
    isEditing,
    isCompact,
    setEditingId,
    hideThreadButton,
    threadCount,
    threadImage,
    threadTimestamp,
    threadName,
}: MessageProps) => {
    const { parentMessageId, onOpenMessage, onOpenProfile, onClose } = usePanel();
    const [showTaskModal, setShowTaskModal] = useState(false);
    const marks = useMessageMarks(id);

    const [ConfirmDialog, confirm] = useConfirm(
        "Delete Message",
        "Are you sure you want to delete this message? This cannot be undone"
    );
    const { mutate: updateMessage, isPending: isUpdatingMessage } =
        useUpdateMessage();
    const { mutate: removeMessage, isPending: isRemovingMessage } =
        useRemoveMessage();
    const { mutate: toggleReaction, isPending: isTogglingReaction } =
        useToggleReaction();

    const handleReaction = (value: string) => {
        toggleReaction(
            { messageId: id, value },
            {
                onError: () => {
                    toast.error("Failed to toggle reaction");
                },
            }
        );
    };

    const handleRemove = async () => {
        const ok = await confirm();

        if (!ok) return;

        removeMessage(
            { id },
            {
                onSuccess: () => {
                    toast.success("Message deleted successfully");
                    if (parentMessageId === id) {
                        onClose();
                    }
                },
                onError: () => {
                    toast.error("Failed to delete the message");
                },
            }
        );
    };

    const isPending = isUpdatingMessage || isTogglingReaction;

    const handleUpdate = ({ body }: { body: string }) => {
        updateMessage(
            { id, body },
            {
                onSuccess: () => {
                    toast.success("Message Updated");
                    setEditingId(null);
                },
                onError: () => {
                    toast.error("Failed to update the message");
                },
            }
        );
    };

    if (isCompact) {
        return (
            <>
                <ConfirmDialog />
                {showTaskModal && (
                    <MessageToTaskModal
                        open={showTaskModal}
                        onClose={() => setShowTaskModal(false)}
                        messageId={id}
                        body={body}
                        authorName={authorName}
                    />
                )}
                <div
                    id={`msg-${id}`}
                    className={cn(
                        "flex flex-col gap-2 p-1.5 px-5 max-md:pl-3 max-md:pr-11 max-md:min-h-10 hover:bg-cream/70 group relative",
                        isEditing && "bg-[#ff5018]/10 hover:bg-[#ff5018]/10",
                    marks.isPinned && !isEditing && "bg-[#ff5018]/[0.06] hover:bg-[#ff5018]/[0.09]",
                        isRemovingMessage &&
                            "bg-rose-500/50 transform transition-all scale-y-0 origin-bottom duration-200"
                    )}
                >
                    <div className="flex items-start gap-2">
                        <Hint label={formatFullTime(new Date(createdAt))}>
                            <button className="text-xs text-ink/50 opacity-0 group-hover:opacity-100 w-10 leading-5.5 text-center hover:underline">
                                {format(new Date(createdAt), "hh:mm")}
                            </button>
                        </Hint>
                        {isEditing ? (
                            <div className="w-full h-full">
                                <Editor
                                    onSubmit={handleUpdate}
                                    disabled={isPending}
                                    defaultValue={parseDelta(body)}
                                    onCancel={() => setEditingId(null)}
                                    variant="update"
                                />
                            </div>
                        ) : (
                            <div className="flex flex-col w-full min-w-0">
                                <Renderer value={body} />
                                <Thumbnail url={image} />
                                {/* File Attachment */}
                                {file && (
                                    <div className="mt-2">
                                        <FileAttachment
                                            url={file}
                                            fileName={fileName || undefined}
                                            fileType={fileType || undefined}
                                            fileSize={fileSize || undefined}
                                        />
                                    </div>
                                )}
                                {updatedAt ? (
                                    <span className="text-xs text-ink/50">
                                        (edited)
                                    </span>
                                ) : null}
                                <Reactions data={reactions} onChange={handleReaction} />
                                <ThreadBar
                                    count={threadCount}
                                    image={threadImage}
                                    timestamp={threadTimestamp}
                                    name={threadName}
                                    onClick={() => onOpenMessage(id)}
                                />
                            </div>
                        )}
                    </div>
                    {!isEditing && (
                        <Toolbar2
                            isAuthor={isAuthor}
                            canModerate={canModerate}
                            isPending={false}
                            handleEdit={() => setEditingId(id)}
                            handleThread={() => onOpenMessage(id)}
                            handleCreateTask={() => setShowTaskModal(true)}
                            handleDelete={handleRemove}
                            handleReaction={handleReaction}
                            hideThreadButton={hideThreadButton}
                            handlePin={hideThreadButton ? undefined : marks.pin}
                            handleSave={marks.save}
                            isPinned={marks.isPinned}
                            isSaved={marks.isSaved}
                        />
                    )}
                </div>
            </>
        );
    }
    const fallbackInitial = authorName.charAt(0).toUpperCase();

    return (
        <>
            <ConfirmDialog />
                {showTaskModal && (
                    <MessageToTaskModal
                        open={showTaskModal}
                        onClose={() => setShowTaskModal(false)}
                        messageId={id}
                        body={body}
                        authorName={authorName}
                    />
                )}
            <div
                id={`msg-${id}`}
                className={cn(
                    "flex flex-col gap-2 p-1.5 px-5 max-md:pl-3 max-md:pr-11 max-md:min-h-10 hover:bg-cream/70 group relative",
                    isEditing && "bg-[#ff5018]/10 hover:bg-[#ff5018]/10",
                    marks.isPinned && !isEditing && "bg-[#ff5018]/[0.06] hover:bg-[#ff5018]/[0.09]",
                    isRemovingMessage &&
                        "bg-rose-500/50 transform transition-all scale-y-0 origin-bottom duration-200"
                )}
            >
                <div className="flex items-start gap-2">
                    <button type="button" aria-label={`View ${authorName} profile`} disabled={isBot} className={isBot ? "cursor-default" : undefined} onClick={() => onOpenProfile(memberId)}>
                        <Avatar className="rounded-md mr-1 size-9">
                            <AvatarImage className="rounded-md" src={authorImage} />
                            <AvatarFallback className="rounded-md bg-[#381d2a] dark:bg-[#4a2838] text-white text-center text-sm font-semibold">
                                {fallbackInitial}
                            </AvatarFallback>
                        </Avatar>
                    </button>
                    {isEditing ? (
                        <div className="w-full h-full">
                            <Editor
                                onSubmit={handleUpdate}
                                disabled={isPending}
                                defaultValue={parseDelta(body)}
                                onCancel={() => setEditingId(null)}
                                variant="update"
                            />
                        </div>
                    ) : (
                        <div className="flex flex-col w-full overflow-hidden">
                            <div className="text-sm">
                                <button
                                    disabled={isBot}
                                    onClick={() => onOpenProfile(memberId)}
                                    className={cn("font-semibold tracking-tight text-ink", isBot ? "cursor-default" : "hover:underline")}
                                >
                                    {authorName}
                                </button>
                                {isBot && <span className="ml-1.5 rounded bg-plum/10 px-1.5 py-0.5 align-middle text-[10px] font-bold uppercase tracking-wide text-plum dark:bg-white/10 dark:text-white/70">App</span>}
                                <span>&nbsp;&nbsp;</span>
                                <Hint label={formatFullTime(new Date(createdAt))}>
                                    <button className="text-xs text-ink/50 hover:underline">
                                        {format(new Date(createdAt), "h:mm a")}
                                    </button>
                                </Hint>
                                {marks.isPinned && (
                                    <span className="ml-2 inline-flex items-center gap-1 text-[11px] font-medium text-orange-ink">
                                        <Pin className="size-3 fill-current" aria-hidden /> Pinned
                                    </span>
                                )}
                            </div>
                            <Renderer value={body} />
                            <Thumbnail url={image} />
                            {/* File Attachment */}
                            {file && (
                                <div className="mt-2">
                                    <FileAttachment
                                        url={file}
                                        fileName={fileName || undefined}
                                        fileType={fileType || undefined}
                                        fileSize={fileSize || undefined}
                                    />
                                </div>
                            )}
                            {updatedAt ? (
                                <span className="text-xs text-ink/50">
                                    (edited)
                                </span>
                            ) : null}
                            <Reactions data={reactions} onChange={handleReaction} />
                            <ThreadBar
                                count={threadCount}
                                image={threadImage}
                                timestamp={threadTimestamp}
                                onClick={() => onOpenMessage(id)}
                            />
                        </div>
                    )}
                </div>
                {!isEditing && (
                    <Toolbar2
                        isAuthor={isAuthor}
                            canModerate={canModerate}
                        isPending={isPending}
                        handleEdit={() => setEditingId(id)}
                        handleThread={() => onOpenMessage(id)}
                            handleCreateTask={() => setShowTaskModal(true)}
                        handleDelete={handleRemove}
                        handleReaction={handleReaction}
                        hideThreadButton={hideThreadButton}
                        handlePin={hideThreadButton ? undefined : marks.pin}
                        handleSave={marks.save}
                        isPinned={marks.isPinned}
                        isSaved={marks.isSaved}
                    />
                )}
            </div>
        </>
    );
};

export const Message = memo(MessageImpl);
