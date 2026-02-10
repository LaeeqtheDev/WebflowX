import { Button } from "@/components/ui/button"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,

} from "@/components/ui/dropdown-menu"
import { Doc } from "../../../../../../convex/_generated/dataModel"
import { ChevronDown, ListFilter, SquarePen } from "lucide-react"

interface WorkspaceHeaderProps {
    workspace: Doc<"workspaces">
    isAdmin: boolean
}


export const WorkspaceHeader = ({workspace, isAdmin}: WorkspaceHeaderProps) => {
  return (
    <div className="flex items-center justify-baseline px-4 h-12.25 gap-.05">
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button className="font-semibold text-lg w-auto p-1.5 overflow-hidden cursor-pointer" size="sm" variant={"trasnparent"}>
                    <span className="truncate flex items-center ">
                    {workspace.name}
                    <ChevronDown className="text-[#ff5018] size-4 ml-1 mt-1 shrink-0 cursor-pointer" />
                    </span>
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent side="bottom" align="start" className="w-64">
                <DropdownMenuItem className="cursor-pointer capitalize">
                    <div className="size-9 relative overflow-hidden bg-[#381d2a]/80 text-white font-semibold text-xl rounded-md flex items-center justify-center mr-2">
                        {workspace.name.charAt(0).toUpperCase()}
                    </div>

                    <div className="flex flex-col items-start">
                        <p className="font-bol">{workspace.name}</p>
                        <p className="text-xs text-muted-foreground">Active Workspace</p>
                    </div>
                </DropdownMenuItem>
               
                {isAdmin && (
                    <>
                     <DropdownMenuSeparator />
                     <DropdownMenuItem className="cursor-pointer py-2" onClick={()=>{}}>
                    Invite People to {workspace.name}
                </DropdownMenuItem>
                <DropdownMenuItem className="cursor-pointer py-2" onClick={()=>{}}>
                    Preferences
                </DropdownMenuItem>
                    </>
                )}
            </DropdownMenuContent>
        </DropdownMenu>
        <div className="flex items-center gap-0.5">
        <Button variant={"trasnparent"} size={"iconSm"}>
                <ListFilter className="size-4 text-[#ff5018]"/>
            </Button>
            <Button variant={"trasnparent"} size={"iconSm"}>
                <SquarePen className="size-4 text-[#ff5018]"/>
            </Button>

        </div>
      
    </div>
  )
}

