"use client"
import { useMutation, useQuery } from "convex/react"
import { toast } from "sonner"
import { api } from "../../../convex/_generated/api"
import { Id } from "../../../convex/_generated/dataModel"
import { useWorkspaceId } from "@/hooks/use-workspace-id"
import { errMsg } from "@/lib/errors"

type Marks = { pinned: string[]; saved: string[] } | undefined
type Sets = { pinned: Set<string>; saved: Set<string> }
const EMPTY: Sets = { pinned: new Set(), saved: new Set() }
// Built once per result and shared by every message on screen. Building them inside each message meant copying up to
// 1,000 ids for every message in the list each time a pin or save changed.
const built = new WeakMap<object, Sets>()
const toSets = (marks: Marks): Sets => {
  if (!marks) return EMPTY
  let s = built.get(marks)
  if (!s) { s = { pinned: new Set(marks.pinned), saved: new Set(marks.saved) }; built.set(marks, s) }
  return s
}

// Everything pinned in this workspace and what I saved. Every message shares the one subscription.
export const useMarkSets = (): Sets => {
  const workspaceId = useWorkspaceId()
  return toSets(useQuery(api.marks.mine, { workspaceId }))
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
