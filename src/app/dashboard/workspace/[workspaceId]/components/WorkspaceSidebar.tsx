import { useCurrentMember } from "@/features/members/api/use-current-member"
import { useGetWorkspace } from "@/features/workspaces/api/use-get-workspace"
import { useWorkspaceId } from "@/hooks/use-workspace-id"
import { AlertTriangle, Loader } from "lucide-react"
import { WorkspaceHeader } from "./WorkspaceHeader"

export const WorkSpaceSidebar = () => {
    const workspaceId = useWorkspaceId()
    const {data: member, isLoading: memberLoading} = useCurrentMember({workspaceId})
    const {data: workspace, isLoading: workspaceLoading} = useGetWorkspace({id: workspaceId})

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
        </div>
    )
}