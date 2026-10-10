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
                <Button aria-label={`Switch workspace. Current: ${workspace?.name ?? "loading"}`} className="size-10 relative overflow-hidden rounded-xl bg-brand text-white hover:bg-brand-hover font-semibold text-lg tracking-tight shadow-[0_8px_18px_-8px_rgba(255,80,24,0.9)] ring-1 ring-white/15 transition-all hover:scale-[1.04] active:scale-95">
                    {workspaceLoading ? (
                        <Loader className="size-5 animate-spin shrink-0"/>
                    ):(
                       workspace?.imageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={workspace.imageUrl} alt="" className="absolute inset-0 size-full object-cover" />
                       ) : workspace?.name.charAt(0).toUpperCase()
                    )}
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent side="bottom" align="start" className="w-64 rounded-xl p-1.5">
                <DropdownMenuItem
                onClick={() => router.push(`/dashboard/workspace/${workspaceId}`)}
                 className="cursor-pointer flex-col justify-start items-start capitalize rounded-lg font-semibold">
                    {workspace?.name}
                    <span className="text-xs text-muted-foreground">Active Workspace</span>
                </DropdownMenuItem>
                {filteredWorkspaces?.map((workspace)=>(
                    <DropdownMenuItem key={workspace._id}
                    className="cursor-pointer capitalize overflow-hidden rounded-lg"
                    onClick={()=> router.push(`/dashboard/workspace/${workspace._id}`)}
                    >
                        <div className=" shrink-0 size-9 overflow-hidden bg-avatar text-white font-semibold rounded-lg flex items-center justify-center">
                            {workspace.imageUrl ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={workspace.imageUrl} alt="" className="size-full object-cover" />
                            ) : workspace.name.charAt(0).toUpperCase()}
                        </div>
                        <p className="truncate">{workspace.name}</p>

                    </DropdownMenuItem>
                ))}

            <DropdownMenuItem
            className="cursor-pointer flex items-center gap-2 rounded-lg"
            onClick={() => setOpen(true)}>
            <div className="size-9 bg-cream text-ink rounded-lg flex items-center justify-center">
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