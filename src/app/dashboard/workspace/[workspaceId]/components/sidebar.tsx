"use client"
import { UserButton } from "@/features/auth/components/user-button"
import { WorkspaceSwitcher } from "./WorkspaceSwitcher"
import { SidebarButton } from "./SidebarButton"
import {
    Home24Regular, Home24Filled,
    Chat24Regular, Chat24Filled,
    Alert24Regular, Alert24Filled,
    TaskListSquareLtr24Regular, TaskListSquareLtr24Filled,
    Notebook24Regular, Notebook24Filled,
    DocumentText24Regular, DocumentText24Filled,
    Video24Regular, Video24Filled,
    MoreHorizontal24Regular,
} from "@fluentui/react-icons"
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
        <aside className="w-17.5 h-full bg-[#381d2a] border-r border-black/20 flex flex-col gap-y-2.5 items-center pt-2.25 pb-4">
            <WorkspaceSwitcher />
            <SidebarButton
                icon={Home24Regular}
                activeIcon={Home24Filled}
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
                icon={Chat24Regular}
                activeIcon={Chat24Filled}
                label="DMs"
                isActive={pathname.includes("/dms")}
                onClick={() => router.push(`/dashboard/workspace/${workspaceId}/dms`)}
                badge={totalDmUnread}
            />
            <SidebarButton
                icon={Alert24Regular}
                activeIcon={Alert24Filled}
                label="Activity"
                isActive={pathname.includes("/activity")}
                onClick={() => router.push(`/dashboard/workspace/${workspaceId}/activity`)}
                badge={unreadCount}
            />

            <SidebarButton
                icon={TaskListSquareLtr24Regular}
                activeIcon={TaskListSquareLtr24Filled}
                label="Tasks"
                isActive={pathname.includes("/tasks")}
                onClick={() => router.push(`/dashboard/workspace/${workspaceId}/tasks`)}
            />
                        <SidebarButton
                icon={Notebook24Regular}
                activeIcon={Notebook24Filled}
                label="Notes"
                isActive={pathname.includes("/notes")}
                onClick={() => router.push(`/dashboard/workspace/${workspaceId}/notes`)}
            />
            <SidebarButton
                icon={DocumentText24Regular}
                activeIcon={DocumentText24Filled}
                label="Docs"
                isActive={pathname.includes("/docs")}
                onClick={() => router.push(`/dashboard/workspace/${workspaceId}/docs`)}
            />

                        <SidebarButton
                icon={Video24Regular}
                activeIcon={Video24Filled}
                label="Meetings"
                isActive={pathname.includes("/meeting")}
                onClick={() => router.push(`/dashboard/workspace/${workspaceId}/meeting`)}
            />
            <SidebarButton
                icon={MoreHorizontal24Regular}
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