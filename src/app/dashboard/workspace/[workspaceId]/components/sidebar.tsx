"use client"
import { UserButton } from "@/features/auth/components/user-button"
import { WorkspaceSwitcher } from "./WorkspaceSwitcher"
import { SidebarButton } from "./SidebarButton"
import { Bell, CheckSquare, FileText, Home, MessageSquare, MoreHorizontal, Video, BookOpen } from "lucide-react"
import { usePathname, useRouter } from "next/navigation"
import { useWorkspaceId } from "@/hooks/use-workspace-id"
import { useGetUnreadCount } from "@/features/notifications/use-get-unread-count"
import { useGetConversations } from "@/features/conversations/api/use-get-conversations"
import { useState } from "react"
import { MoreModal } from "./more-modal"

export const Sidebar = () => {
    const pathname = usePathname()
    const router = useRouter()
    const workspaceId = useWorkspaceId()
    const { count: unreadCount } = useGetUnreadCount({ workspaceId })
    const { data: conversations } = useGetConversations({ workspaceId })
    const totalDmUnread = conversations?.reduce((acc, c) => acc + (c.unreadCount ?? 0), 0) ?? 0
    const [showMore, setShowMore] = useState(false)

    return (
        <aside className="w-17.5 h-full bg-[#381d2a] flex flex-col gap-y-4 items-center pt-2.25 pb-4">
            <WorkspaceSwitcher />
            <SidebarButton
                icon={Home}
                label="Home"
                isActive={
                    pathname.includes("/dashboard/workspace") &&
                    !pathname.includes("/meeting") &&
                    !pathname.includes("/activity") &&
                    !pathname.includes("/tasks") &&
                    !pathname.includes("/notes") &&
                    !pathname.includes("/docs") &&
                    !pathname.includes("/member") &&
                    !pathname.includes("/dms")
                }
                onClick={() => router.push(`/dashboard/workspace/${workspaceId}`)}
            />
            <SidebarButton
                icon={MessageSquare}
                label="DMs"
                isActive={pathname.includes("/dms")}
                onClick={() => router.push(`/dashboard/workspace/${workspaceId}/dms`)}
                badge={totalDmUnread}
            />
            <SidebarButton
                icon={Bell}
                label="Activity"
                isActive={pathname.includes("/activity")}
                onClick={() => router.push(`/dashboard/workspace/${workspaceId}/activity`)}
                badge={unreadCount}
            />

            <SidebarButton
                icon={CheckSquare}
                label="Tasks"
                isActive={pathname.includes("/tasks")}
                onClick={() => router.push(`/dashboard/workspace/${workspaceId}/tasks`)}
            />
                        <SidebarButton
                icon={BookOpen}
                label="Notes"
                isActive={pathname.includes("/notes")}
                onClick={() => router.push(`/dashboard/workspace/${workspaceId}/notes`)}
            />
            <SidebarButton
                icon={FileText}
                label="Docs"
                isActive={pathname.includes("/docs")}
                onClick={() => router.push(`/dashboard/workspace/${workspaceId}/docs`)}
            />

                        <SidebarButton
                icon={Video}
                label="Meetings"
                isActive={pathname.includes("/meeting")}
                onClick={() => router.push(`/dashboard/workspace/${workspaceId}/meeting`)}
            />
            <SidebarButton
                icon={MoreHorizontal}
                label="More"
                onClick={() => setShowMore(true)}
            />
            <div className="flex flex-col items-center justify-center gap-y-1 mt-auto">
                <UserButton />
            </div>
            <MoreModal open={showMore} onClose={() => setShowMore(false)} />
        </aside>
    )
}