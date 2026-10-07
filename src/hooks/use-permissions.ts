"use client"
import { useQuery } from "convex/react"
import { api } from "../../convex/_generated/api"
import { Id } from "../../convex/_generated/dataModel"
import { useWorkspaceId } from "@/hooks/use-workspace-id"

export type PermissionKey =
  | "createChannels" | "manageChannels" | "viewPrivateChannels" | "deleteMessages"
  | "manageMembers" | "invite" | "editWorkspace" | "moderateMeetings" | "manageContent"
  | "postInReadOnly" | "mentionEveryone" | "uploadFiles" | "startMeetings" | "createDocs"

// Single source of truth for UI gates. The server re-checks everything; this only decides what to show.
export const usePermissions = (workspaceIdArg?: Id<"workspaces">) => {
  const fromUrl = useWorkspaceId()
  const workspaceId = workspaceIdArg ?? fromUrl
  const data = useQuery(api.permissions.mine, { workspaceId })
  const list = (data?.permissions ?? []) as string[]
  return {
    isLoading: data === undefined,
    role: data?.role ?? null,
    memberId: data?.memberId ?? null,
    isOwner: !!data?.isOwner,
    isAdmin: !!data?.isAdmin,
    isGuest: data?.role === "guest",
    can: (perm: PermissionKey) => !!data && (data.isAdmin || list.includes(perm)),
  }
}
