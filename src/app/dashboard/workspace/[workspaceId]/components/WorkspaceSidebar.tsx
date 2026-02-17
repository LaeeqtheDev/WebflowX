import { useCurrentMember } from "@/features/members/api/use-current-member"
import { useGetWorkspace } from "@/features/workspaces/api/use-get-workspace"
import { useWorkspaceId } from "@/hooks/use-workspace-id"
import { AlertTriangle, Loader, MessageSquareText, SendHorizonal } from "lucide-react"
import { WorkspaceHeader } from "./WorkspaceHeader"
import { SidebarItem } from "./Sidebar_Item"
import { useGetChannels } from "@/features/channels/api/use-get-channels"

export const WorkSpaceSidebar = () => {
    const workspaceId = useWorkspaceId()
    const {data: member, isLoading: memberLoading} = useCurrentMember({workspaceId})
    const {data: workspace, isLoading: workspaceLoading} = useGetWorkspace({id: workspaceId})
    const {data: channels, isLoading: channelsLoading} = useGetChannels({workspaceId})

    if(memberLoading || workspaceLoading) {
        return(
            <div className="flex flex-col bg-[#381d2a]/80 h-full items-center justify-center">
                <Loader className="size-7 animate-spin text-[#ff5018]"/>
            </div>
        )
    }

    if(!member || !workspace) {
        return(
            <div className="flex flex-col bg-[#381d2a]/80 h-full items-center justify-center">
                <AlertTriangle className="size-7 text-[#ff5018]"/>
                <p className="text-white text-sm">Workspace Not Found</p>
            </div>
        )
    }


    return (
        <div className="flex flex-col h-full bg-[#381d2a]/80">
            <WorkspaceHeader workspace={workspace} isAdmin={member.role === "admin"}/>
            <div className="flex flex-col px-2 mt-3 gap-1">
                <SidebarItem
                label="Threads"
                icon={MessageSquareText}
                id="threads"
                variant={"active"}
                />

                <SidebarItem
                label="Drafts & Sent"
                icon={SendHorizonal}
                id="drafts"
               
                />
                {channels?.map((item) => (
                    <SidebarItem
                    key={item._id}
                    label={item.name}
                    icon={MessageSquareText}
                    id={item._id}
                    />
                ))}
            </div>

        </div>
    )
}