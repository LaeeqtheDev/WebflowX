"use client"
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
import { Hint } from "./hints"
import { PreferencesModal } from "./preferences-modal"
import { useState } from "react"
import { InviteModal } from "./inviteModal"

interface WorkspaceHeaderProps {
  workspace: Doc<"workspaces"> & { imageUrl?: string | null }
  isAdmin: boolean
  canInvite: boolean
  canEdit: boolean
}

export const WorkspaceHeader = ({ workspace, isAdmin, canInvite, canEdit }: WorkspaceHeaderProps) => {
  const [preferencesOpen, setPreferencesOpen] =useState(false)
  const [inviteOpen, setInviteOpen] = useState(false)
  return (
   <>
   <InviteModal open={inviteOpen} setOpen={setInviteOpen}
   name={workspace.name} joinCode={workspace.joinCode}
   joinCodeExpiresAt={workspace.joinCodeExpiresAt}
   invitesDisabled={workspace.invitesDisabled}
   isAdmin={canInvite}
   />
   <PreferencesModal open={preferencesOpen} setOpen={setPreferencesOpen}  initialValue={workspace.name}/>
    <div className="flex items-center justify-between px-3 h-14 gap-2 w-full border-b border-white/10">
      
      {/* Workspace Name Dropdown */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            className="font-semibold tracking-tight text-base text-white hover:bg-white/10 rounded-lg w-auto px-2 py-1.5 overflow-hidden cursor-pointer"
            size="sm"
            variant="trasnparent"
          >
<span className="flex items-center truncate max-w-fit">
  {workspace.name}
  <ChevronDown className="text-white/55 size-4 ml-1 shrink-0 cursor-pointer" />
</span>

          </Button>
        </DropdownMenuTrigger>

        <DropdownMenuContent side="bottom" align="start" className="w-64 rounded-xl p-1.5">
          <DropdownMenuItem className="cursor-pointer capitalize rounded-lg">
            <div className="size-9 relative overflow-hidden bg-[#381d2a] text-white font-semibold text-lg rounded-lg flex items-center justify-center mr-2">
              {workspace.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={workspace.imageUrl} alt="" className="size-full object-cover" />
              ) : workspace.name.charAt(0).toUpperCase()}
            </div>
            <div className="flex flex-col items-start">
              <p className="font-semibold tracking-tight">{workspace.name}</p>
              <p className="text-xs text-muted-foreground">Active Workspace</p>
            </div>
          </DropdownMenuItem>

          <DropdownMenuSeparator />
          {canInvite && (
            <DropdownMenuItem className="cursor-pointer py-2 rounded-lg"
            onClick={() => setInviteOpen(true)}>
              Invite People to {workspace.name}
            </DropdownMenuItem>
          )}
          <DropdownMenuItem className="cursor-pointer py-2 rounded-lg" onClick={() => setPreferencesOpen(true)}>
            {isAdmin || canEdit ? "Workspace settings" : "Members & info"}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Action Buttons */}
      <div className="flex items-center gap-1 shrink-0">
      <Hint label="Filter Conversations" side="bottom">
        <Button variant="trasnparent" size="iconSm" className="rounded-lg hover:bg-white/10">
          <ListFilter className="size-4 text-white/70" />
        </Button>
        </Hint>
        <Hint label="New Message" side="bottom">
          <Button variant="trasnparent" size="iconSm" className="rounded-lg hover:bg-white/10">
            <SquarePen className="size-4 text-white/70" />
          </Button>
        </Hint>
      </div>

    </div>
    </>
  )
}
