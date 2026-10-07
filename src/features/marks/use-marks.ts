"use client"
import { useMemo } from "react"
import { useMutation, useQuery } from "convex/react"
import { toast } from "sonner"
import { api } from "../../../convex/_generated/api"
import { Id } from "../../../convex/_generated/dataModel"
import { useWorkspaceId } from "@/hooks/use-workspace-id"
import { errMsg } from "@/lib/errors"

// Everything pinned in this workspace and what I saved. Every message shares the one subscription.
export const useMarkSets = () => {
  const workspaceId = useWorkspaceId()
  const marks = useQuery(api.marks.mine, { workspaceId })
  return useMemo(
    () => ({ pinned: new Set<string>(marks?.pinned ?? []), saved: new Set<string>(marks?.saved ?? []) }),
    [marks]
  )
}

export const useMessageMarks = (messageId: Id<"messages">) => {
  const sets = useMarkSets()
  const togglePin = useMutation(api.marks.togglePin)
  const toggleSave = useMutation(api.marks.toggleSave)
  return {
    isPinned: sets.pinned.has(messageId),
    isSaved: sets.saved.has(messageId),
    pin: async () => {
      try {
        const r = await togglePin({ messageId })
        toast.success(r.pinned ? "Message pinned" : "Message unpinned")
      } catch (e) { toast.error(errMsg(e, "Couldn't pin that message")) }
    },
    save: async () => {
      try {
        const r = await toggleSave({ messageId })
        toast.success(r.saved ? "Saved for later" : "Removed from saved")
      } catch (e) { toast.error(errMsg(e, "Couldn't save that message")) }
    },
  }
}
