"use client"
import { useState } from "react"
import { useMutation, useQuery } from "convex/react"
import { Loader, RotateCcw, Trash2 } from "lucide-react"
import { toast } from "sonner"
import { api } from "../../../convex/_generated/api"
import type { Id } from "../../../convex/_generated/dataModel"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { useWorkspaceId } from "@/hooks/use-workspace-id"
import { friendlyError } from "@/hooks/use-limit-handler"
import { PageIcon } from "./page-tree"

export const TrashDialog = ({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) => {
  const workspaceId = useWorkspaceId()
  const items = useQuery(api.docs.trash, open ? { workspaceId } : "skip")
  const restore = useMutation(api.docs.restore)
  const erase = useMutation(api.docs.deleteForever)
  const [busy, setBusy] = useState<string | null>(null)
  const [confirm, setConfirm] = useState<string | null>(null)

  const run = async (id: Id<"docs">, fn: () => Promise<unknown>, ok: string) => {
    setBusy(id)
    try { await fn(); toast.success(ok) } catch (e) { toast.error(friendlyError(e, "Something went wrong")) } finally { setBusy(null); setConfirm(null) }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[80dvh] max-w-lg overflow-hidden rounded-2xl border-plum/12 p-0">
        <DialogHeader className="border-b border-plum/12 px-5 py-4 text-left">
          <DialogTitle className="text-[17px] font-semibold tracking-tight">Trash</DialogTitle>
          <DialogDescription>Deleted pages stay here for 30 days, then they&apos;re erased for good.</DialogDescription>
        </DialogHeader>
        <div className="max-h-[60dvh] overflow-y-auto p-3">
          {items === undefined ? (
            <div className="flex justify-center py-8"><Loader className="size-5 animate-spin text-brand" /></div>
          ) : items.length === 0 ? (
            <p className="py-10 text-center text-sm text-ink/60">The trash is empty.</p>
          ) : items.map((d) => (
            <div key={d._id} className="flex items-center gap-3 rounded-lg px-2 py-2 hover:bg-cream-soft">
              <PageIcon node={{ icon: d.icon, type: d.type }} className="size-5 text-lg" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-ink">{d.title || "Untitled"}</p>
                <p className="text-xs text-ink/60">
                  {d.inside > 0 ? `+ ${d.inside} page${d.inside === 1 ? "" : "s"} inside · ` : ""}{d.daysLeft} day{d.daysLeft === 1 ? "" : "s"} left
                </p>
              </div>
              {confirm === d._id ? (
                <Button size="sm" variant="destructive" className="h-8" disabled={busy === d._id} onClick={() => run(d._id, () => erase({ id: d._id }), "Deleted forever")}>Delete forever</Button>
              ) : (
                <>
                  <Button size="sm" variant="outline" className="h-8 gap-1" disabled={busy === d._id} onClick={() => run(d._id, () => restore({ id: d._id }), "Restored")}><RotateCcw className="size-3.5" /> Restore</Button>
                  <Button size="icon" variant="ghost" className="size-8 text-destructive" aria-label="Delete forever" onClick={() => setConfirm(d._id)}><Trash2 className="size-4" /></Button>
                </>
              )}
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  )
}
