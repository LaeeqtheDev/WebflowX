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
import { useEffect, useState } from "react"
import dynamic from "next/dynamic"
import { usePermissions } from "@/hooks/use-permissions"

const MoreModal = dynamic(() => import("./more-modal").then((m) => m.MoreModal), { ssr: false })

const Divider = () => <div aria-hidden className="my-0.5 h-px w-8 bg-white/[0.08]" />

export const Sidebar = () => {
    const pathname = usePathname()
    const router = useRouter()
    const workspaceId = useWorkspaceId()
    const { count: unreadCount } = useGetUnreadCount({ workspaceId })
    const { data: conversations } = useGetConversations({ workspaceId })
    const totalDmUnread = conversations?.reduce((acc, c) => acc + (c.unreadCount ?? 0), 0) ?? 0
    const [showMore, setShowMore] = useState(false)
    const { isGuest } = usePermissions()

    // Warm up every section once the shell is idle so navigation feels instant.
    useEffect(() => {
        const base = `/dashboard/workspace/${workspaceId}`
        const routes = ["", "/dms", "/activity", "/tasks", "/notes", "/docs", "/meeting"]
        const run = () => routes.forEach((r) => router.prefetch(`${base}${r}`))
        const w = window as Window & { requestIdleCallback?: (cb: () => void) => number }
        if (w.requestIdleCallback) w.requestIdleCallback(run)
        else setTimeout(run, 400)
    }, [router, workspaceId])

    return (
        <aside className="w-[72px] h-full shrink-0 bg-rail border-r border-white/[0.06] flex flex-col gap-y-1.5 items-center pt-3 pb-4">
            <div className="mb-1.5">
                <WorkspaceSwitcher />
            </div>
            <Divider />
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
            {!isGuest && (
            <SidebarButton
                icon={Chat24Regular}
                activeIcon={Chat24Filled}
                label="DMs"
                isActive={pathname.includes("/dms")}
                onClick={() => router.push(`/dashboard/workspace/${workspaceId}/dms`)}
                badge={totalDmUnread}
            />
            )}
            <SidebarButton
                icon={Alert24Regular}
                activeIcon={Alert24Filled}
                label="Activity"
                isActive={pathname.includes("/activity")}
                onClick={() => router.push(`/dashboard/workspace/${workspaceId}/activity`)}
                badge={unreadCount}
            />
            <Divider />
            {!isGuest && (
            <SidebarButton
                icon={TaskListSquareLtr24Regular}
                activeIcon={TaskListSquareLtr24Filled}
                label="Tasks"
                isActive={pathname.includes("/tasks")}
                onClick={() => router.push(`/dashboard/workspace/${workspaceId}/tasks`)}
            />
            )}
            {!isGuest && (
            <SidebarButton
                icon={Notebook24Regular}
                activeIcon={Notebook24Filled}
                label="Notes"
                isActive={pathname.includes("/notes")}
                onClick={() => router.push(`/dashboard/workspace/${workspaceId}/notes`)}
            />
            )}
            {!isGuest && (
            <SidebarButton
                icon={DocumentText24Regular}
                activeIcon={DocumentText24Filled}
                label="Docs"
                isActive={pathname.includes("/docs")}
                onClick={() => router.push(`/dashboard/workspace/${workspaceId}/docs`)}
            />
            )}
            {!isGuest && (
            <SidebarButton
                icon={Video24Regular}
                activeIcon={Video24Filled}
                label="Meetings"
                isActive={pathname.includes("/meeting")}
                onClick={() => router.push(`/dashboard/workspace/${workspaceId}/meeting`)}
            />
            )}
            <Divider />
            <SidebarButton
                icon={MoreHorizontal24Regular}
                label="More"
                onClick={() => setShowMore(true)}
            />
            <div className="mt-auto flex w-full flex-col items-center justify-center gap-y-3 border-t border-white/[0.08] pt-4">
                <UserButton />
            </div>
            {showMore && <MoreModal open={showMore} onClose={() => setShowMore(false)} />}
        </aside>
    )
}