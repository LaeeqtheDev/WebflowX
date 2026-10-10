import { useCurrentMember } from "@/features/members/api/use-current-member"
import { useGetWorkspace } from "@/features/workspaces/api/use-get-workspace"
import { useWorkspaceId } from "@/hooks/use-workspace-id"
import { AlertTriangle, Loader } from "lucide-react"
import { CommentMultiple20Regular, Send20Regular } from "@fluentui/react-icons"
import { channelIcon, cleanChannelName } from "./channel-icon"
import { WorkspaceHeader } from "./WorkspaceHeader"
import { SidebarItem } from "./SidebarItem"
import { useGetChannels } from "@/features/channels/api/use-get-channels"
import { WorkspaceSection } from "./workspaceSection"
import { useGetMembers } from "@/features/members/api/use-get-members"
import { UserItem } from "./user-item"
import { useCreateChannelModal } from "@/features/channels/store/use-create-channel-modal"
import { useChannelId } from '@/hooks/use-channel-id'
import { useMemberId } from "@/hooks/use-member-id"
import { useRouter } from "next/navigation"
import { Bookmark, CalendarDays, Files, Lock, Megaphone } from "lucide-react"
import { usePermissions } from "@/hooks/use-permissions"
import { usePathname } from "next/navigation"
import { useGetConversations } from "@/features/conversations/api/use-get-conversations"
import { useQuickSwitcher } from "@/features/workspaces/store/use-quick-switcher"

export const WorkSpaceSidebar = () => {
    const workspaceId = useWorkspaceId()
    const channelId = useChannelId()
    const memberId = useMemberId()
    const router = useRouter()

    const { data: member, isLoading: memberLoading } = useCurrentMember({ workspaceId })
    const { data: workspace, isLoading: workspaceLoading } = useGetWorkspace({ id: workspaceId })
    const { data: channels } = useGetChannels({ workspaceId })
    const { data: members } = useGetMembers({ workspaceId })
    const [_isOpen, setIsOpen] = useCreateChannelModal()
    const perms = usePermissions()
    const pathname = usePathname()
    const { data: conversations } = useGetConversations({ workspaceId })
    const [, setSwitcher] = useQuickSwitcher()

    if (memberLoading || workspaceLoading) {
        return (
            <div className="flex flex-col bg-sidebar h-full items-center justify-center">
                <Loader className="size-7 animate-spin text-brand" />
            </div>
        )
    }

    if (!member || !workspace) {
        return (
            <div className="flex flex-col bg-sidebar h-full items-center justify-center">
                <AlertTriangle className="size-7 text-brand" />
                <p className="text-white text-sm">Workspace Not Found</p>
            </div>
        )
    }

    return (
        <div className="flex flex-col h-full min-w-0 bg-sidebar pb-4">
            <WorkspaceHeader workspace={workspace} isAdmin={perms.isAdmin} canInvite={perms.can("invite")} canEdit={perms.can("editWorkspace")} />

            <div className="flex flex-col px-2 mt-3 gap-0.5">
                {!perms.isGuest && (
                <SidebarItem
                    label="Threads"
                    icon={CommentMultiple20Regular}
                    id="threads"
                    variant={pathname.endsWith("/threads") ? "active" : "default"}
                    onClick={() => router.push(`/dashboard/workspace/${workspaceId}/threads`)}
                />
                )}
                {!perms.isGuest && (
                <SidebarItem
                    label="Drafts & Sent"
                    icon={Send20Regular}
                    id="drafts"
                    variant={pathname.endsWith("/drafts") ? "active" : "default"}
                    onClick={() => router.push(`/dashboard/workspace/${workspaceId}/drafts`)}
                />
                )}
                {!perms.isGuest && (
                <SidebarItem
                    label="Calendar"
                    icon={CalendarDays}
                    id="calendar"
                    variant={pathname.endsWith("/calendar") ? "active" : "default"}
                    onClick={() => router.push(`/dashboard/workspace/${workspaceId}/calendar`)}
                />
                )}
                {!perms.isGuest && (
                <SidebarItem
                    label="Files"
                    icon={Files}
                    id="files"
                    variant={pathname.endsWith("/files") ? "active" : "default"}
                    onClick={() => router.push(`/dashboard/workspace/${workspaceId}/files`)}
                />
                )}
                <SidebarItem
                    label="Saved"
                    icon={Bookmark}
                    id="saved"
                    variant={pathname.endsWith("/saved") ? "active" : "default"}
                    onClick={() => router.push(`/dashboard/workspace/${workspaceId}/saved`)}
                />
            </div>

            <WorkspaceSection
                label="Channels"
                hint="New Channel"
                onNew={perms.can("createChannels") ? () => setIsOpen(true) : undefined}
            >
                {channels?.map((item) => (
                    <SidebarItem
                        key={item._id}
                        label={cleanChannelName(item.name)}
                        icon={item.isPrivate ? Lock : item.readOnly ? Megaphone : channelIcon(item.name)}
                        id={item._id}
                        variant={channelId === item._id ? "active" : "default"}
                    />
                ))}
            </WorkspaceSection>

            {!perms.isGuest && <WorkspaceSection
                label="Direct Messages"
                hint="New Direct Message"
                onNew={() => setSwitcher({ open: true, mode: "dm" })}
            >
                {[...(members ?? [])]
                    // you first, then everyone else A to Z
                    .sort((a, b) => (a._id === member._id ? -1 : b._id === member._id ? 1 : (a.user.name ?? "").localeCompare(b.user.name ?? "")))
                    .map((item) => {
                        // unread DMs from this person (conversation lookup is by the other member)
                        const unread = conversations?.find((c) => c.otherMember?._id === item._id)?.unreadCount ?? 0
                        return (
                            <UserItem
                                key={item._id}
                                id={item._id}
                                label={item.user.name}
                                image={item.user.image}
                                unread={unread}
                                isSelf={item._id === member._id}
                                variant={item._id === memberId ? "active" : "default"}
                            />
                        )
                    })}
            </WorkspaceSection>}
        </div>
    )
}