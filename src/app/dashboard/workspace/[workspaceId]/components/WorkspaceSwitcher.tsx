"use client"
import { Button } from "@/components/ui/button"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useGetWorkspace } from "@/features/workspaces/api/use-get-workspace"
import { useGetWorkspaces } from "@/features/workspaces/api/use-get-workspaces"
import { useCreateWorkspaceModal } from "@/features/workspaces/store/use-create-workspace-modal"
import { useWorkspaceId } from "@/hooks/use-workspace-id"
import { Loader, Plus } from "lucide-react"
import { useRouter } from "next/navigation"

export const WorkspaceSwitcher = () => {
    const router = useRouter()
    const workspaceId = useWorkspaceId()
    const [_open, setOpen] = useCreateWorkspaceModal()
    const {data: workspace, isLoading: workspaceLoading}  = useGetWorkspace({id:workspaceId})

    const {data:workspaces, isLoading: workspacesLoading} = useGetWorkspaces();

    const filteredWorkspaces = workspaces?.filter(
        (workspace) => workspace?._id !== workspaceId
    )
    return(
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button className="size-9 relative overflow-hidden bg-black/60 text-white hover:bg-black/80 font-semibold text-xl ">
                    {workspaceLoading ? (
                        <Loader className="size-5 animate-spin shrink-0"/>
                    ):(
                       workspace?.name.charAt(0).toUpperCase()
                    )}
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent side="bottom" align="start" className="w-64">
                <DropdownMenuItem
                onClick={() => router.push(`/dashboard/workspace/${workspaceId}`)}
                 className="cursor-pointer flex-col justify-start items-start capitalize">
                    {workspace?.name}
                    <span className="text-xs text-muted-foreground">Active Workspace</span>
                </DropdownMenuItem>
                {filteredWorkspaces?.map((workspace)=>(
                    <DropdownMenuItem key={workspace._id}
                    className="cursor-pointer capitalize overflow-hidden "
                    onClick={()=> router.push(`/dashboard/workspace/${workspace._id}`)}
                    >
                        <div className=" shrink-0 size-9 bg-[#ff5018] text-white rounded-md flex items-center justify-center">
                            {workspace.name.charAt(0).toUpperCase()}
                        </div>
                        <p className="truncate">{workspace.name}</p>

                    </DropdownMenuItem>
                ))}

            <DropdownMenuItem
            className="cursor-pointer flex items-center gap-2"
            onClick={() => setOpen(true)}>
            <div className="size-9 bg-[#F2F2F2] text-slate-900 rounded-md flex items-center justify-center">
                <Plus />
            </div>

            <span className="text-sm font-semibold">
                Create a new workspace
            </span>
            </DropdownMenuItem>
            </DropdownMenuContent>

        </DropdownMenu>
    )
}