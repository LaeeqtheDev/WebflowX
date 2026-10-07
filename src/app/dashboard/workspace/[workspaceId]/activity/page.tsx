"use client"

import { useWorkspaceId } from "@/hooks/use-workspace-id"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { format } from "date-fns"
import { toast } from "sonner"
import { useRouter } from "next/navigation"
import {
    Bell, MessageSquare, Smile, CheckSquare,
    FileText, RefreshCw, Loader, BellOff,
    CheckCheck, MessagesSquare
} from "lucide-react"
import { Id } from "../../../../../../convex/_generated/dataModel"
import { useClearAll } from "@/features/notifications/use-clear-all"
import { useGetNotifications } from "@/features/notifications/use-get-notifications"
import { useMarkAllRead } from "@/features/notifications/use-mark-all-read"
import { useMarkRead } from "@/features/notifications/use-mark-read"
import { useGetUnreadCount } from "@/features/notifications/use-get-unread-count"

// ─── Config ──────────────────────────────────────────────────────────────────

const TYPE_CONFIG = {
    thread_reply: {
        icon: MessagesSquare,
        color: "text-[#ff5018]",
        bg: "bg-[#ff5018]/10",
        label: "replied to your message"
    },
    reaction: {
        icon: Smile,
        color: "text-[#381d2a]",
        bg: "bg-[#efe8e3]",
        label: "reacted to your message"
    },
    task_assigned: {
        icon: CheckSquare,
        color: "text-[#ff5018]",
        bg: "bg-[#ff5018]/10",
        label: "assigned a task to you"
    },
    task_comment: {
        icon: MessageSquare,
        color: "text-[#381d2a]",
        bg: "bg-[#efe8e3]",
        label: "commented on your task"
    },
    note_added: {
        icon: FileText,
        color: "text-[#381d2a]",
        bg: "bg-[#efe8e3]",
        label: "added a workspace note"
    },
    dm_received: {
        icon: MessageSquare,
        color: "text-[#ff5018]",
        bg: "bg-[#ff5018]/10",
        label: "sent you a direct message"
    },
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ActivityPage() {
    const workspaceId = useWorkspaceId()
    const router = useRouter()

    const { data: notifications, isLoading } = useGetNotifications({ workspaceId })
    const { count: unreadCount } = useGetUnreadCount({ workspaceId })
    const { mutate: markRead } = useMarkRead()
    const { mutate: markAllRead, isPending: isMarkingAll } = useMarkAllRead()
    const { mutate: clearAll, isPending: isClearing } = useClearAll()

    const handleMarkAllRead = () => {
        markAllRead(workspaceId, {
            onSuccess: () => toast.success("All marked as read"),
            onError: () => toast.error("Failed to mark all as read")
        })
    }

    const handleClearAll = () => {
        clearAll(workspaceId, {
            onSuccess: () => toast.success("Cleared all notifications"),
            onError: () => toast.error("Failed to clear notifications")
        })
    }

    const handleClick = async (notification: NonNullable<typeof notifications>[number]) => {
        if (!notification.read) {
            markRead(notification._id)
        }

        const base = `/dashboard/workspace/${workspaceId}`
        const msg = notification.messageId ? `?message=${notification.messageId}` : ""
        switch (notification.type) {
            case "thread_reply":
            case "reaction":
                if (notification.channelId) {
                    router.push(`${base}/channel/${notification.channelId}${msg}`)
                } else if (notification.senderId) {
                    router.push(`${base}/member/${notification.senderId}${msg}`)
                } else {
                    toast.info("This conversation is no longer available")
                }
                break
            case "dm_received":
                router.push(`${base}/member/${notification.senderId}${msg}`)
                break
            case "task_assigned":
            case "task_comment":
                router.push(`${base}/tasks${notification.taskId ? `?task=${notification.taskId}` : ""}`)
                break
            case "note_added":
                router.push(`${base}/notes`)
                break
        }
    }

    return (
        <div className="h-full flex flex-col overflow-hidden bg-[#fbf9f7]">
            {/* Header */}
            <div className="flex items-center justify-between px-6 h-14 border-b bg-white shrink-0 shadow-none">
                <div className="flex items-center gap-3">
                    <div className="size-8 rounded-lg bg-[#ff5018]/10 flex items-center justify-center">
                        <Bell className="size-4 text-[#ff5018]" />
                    </div>
                    <div>
                        <h1 className="tracking-tight text-[17px] font-semibold leading-none text-[#1b1017]">Activity</h1>
                        <p className="text-[11px] text-[#1b1017]/60 mt-1">
                            {unreadCount > 0 ? `${unreadCount} unread notification${unreadCount > 1 ? "s" : ""}` : "All caught up!"}
                        </p>
                    </div>
                    {unreadCount > 0 && (
                        <Badge className="bg-[#ff5018] text-white text-[11px] h-5 px-2 rounded-md">
                            {unreadCount}
                        </Badge>
                    )}
                </div>

                <div className="flex items-center gap-2">
                    <Button
                        variant="outline"
                        size="sm"
                        className="h-8 text-xs gap-1.5 rounded-lg border-[#381d2a]/15 hover:bg-[#f3eeea]"
                        onClick={() => window.location.reload()}
                    >
                        <RefreshCw className="size-3" /> Refresh
                    </Button>
                    {unreadCount > 0 && (
                        <Button
                            variant="outline"
                            size="sm"
                            className="h-8 text-xs gap-1.5 rounded-lg border-[#381d2a]/15 hover:bg-[#f3eeea]"
                            onClick={handleMarkAllRead}
                            disabled={isMarkingAll}
                        >
                            <CheckCheck className="size-3" /> Mark all read
                        </Button>
                    )}
                    {notifications && notifications.length > 0 && (
                        <Button
                            variant="outline"
                            size="sm"
                            className="h-8 text-xs gap-1.5 rounded-lg border-[#381d2a]/15 hover:bg-red-50 text-red-600 hover:text-red-700"
                            onClick={handleClearAll}
                            disabled={isClearing}
                        >
                            <BellOff className="size-3" /> Clear all
                        </Button>
                    )}
                </div>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto">
                {isLoading ? (
                    <div className="flex items-center justify-center h-full">
                        <Loader className="size-5 animate-spin text-[#ff5018]" />
                    </div>
                ) : !notifications || notifications.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full gap-4 text-[#1b1017]/60">
                        <div className="size-14 rounded-2xl bg-[#ff5018]/10 text-[#ff5018] flex items-center justify-center">
                            <Bell className="size-6 text-[#ff5018]" />
                        </div>
                        <div className="text-center">
                            <p className="font-semibold tracking-tight text-[#1b1017]">No activity yet</p>
                            <p className="text-sm mt-1 max-w-xs">
                                You&apos;ll be notified when someone replies to your messages,
                                reacts, assigns tasks, or adds workspace notes
                            </p>
                        </div>
                    </div>
                ) : (
                    <div className="divide-y divide-[#381d2a]/10 bg-white">
                        {notifications.map(notification => {
                            const config = TYPE_CONFIG[notification.type as keyof typeof TYPE_CONFIG]
                            if (!config) return null
                            const Icon = config.icon

                            return (
                                <div
                                    key={notification._id}
                                    onClick={() => handleClick(notification)}
                                    className={cn(
                                        "flex items-start gap-4 px-6 py-4 cursor-pointer hover:bg-[#f7f2ee] transition-colors",
                                        !notification.read && "border-l-2 border-l-[#ff5018] bg-[#ff5018]/5"
                                    )}
                                >
                                    {/* Avatar with type icon */}
                                    <div className="relative shrink-0">
                                        <Avatar className="size-9 rounded-md">
                                            <AvatarImage src={notification.sender?.user?.image} />
                                            <AvatarFallback className="text-xs rounded-md bg-[#381d2a] text-white">
                                                {notification.sender?.user?.name?.[0] ?? "?"}
                                            </AvatarFallback>
                                        </Avatar>
                                        <div className={cn(
                                            "absolute -bottom-0.5 -right-0.5 size-4 rounded-md flex items-center justify-center border border-white",
                                            config.bg
                                        )}>
                                            <Icon className={cn("size-2.5", config.color)} />
                                        </div>
                                    </div>

                                    {/* Content */}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-start justify-between gap-2">
                                            <p className="text-sm leading-snug">
                                                <span className="font-semibold">
                                                    {notification.sender?.user?.name ?? "Someone"}
                                                </span>
                                                {" "}
                                                <span className="text-[#1b1017]/60">
                                                    {config.label}
                                                </span>
                                            </p>
                                            <div className="flex items-center gap-1.5 shrink-0">
                                                {!notification.read && (
                                                    <div className="size-2 rounded-full bg-[#ff5018]" />
                                                )}
                                                <span className="text-[11px] text-[#1b1017]/60 whitespace-nowrap">
                                                    {format(notification._creationTime, "MMM d, h:mm a")}
                                                </span>
                                            </div>
                                        </div>

                                        {/* Preview */}
                                        {notification.body && (
                                            <p className="text-xs text-muted-foreground mt-0.5 truncate max-w-md">
                                                {notification.type === "reaction"
                                                    ? `Reacted with ${notification.body}`
                                                    : notification.body.startsWith("{")
                                                        ? "Sent a message"
                                                        : notification.body
                                                }
                                            </p>
                                        )}

                                        {/* Type badge */}
                                        <span className={cn(
                                            "inline-block mt-1.5 text-[11px] px-2 py-0.5 rounded-md font-medium",
                                            config.bg,
                                            config.color
                                        )}>
                                            {notification.type.replace(/_/g, " ")}
                                        </span>
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