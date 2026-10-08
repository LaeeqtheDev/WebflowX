"use client"
import { useState } from "react"
import dynamic from "next/dynamic"
import { useMutation } from "convex/react"
import { Copy, Loader, Trash2 } from "lucide-react"
import { toast } from "sonner"
import { api } from "../../../convex/_generated/api"
import type { Id } from "../../../convex/_generated/dataModel"
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { friendlyError, useLimitHandler } from "@/hooks/use-limit-handler"
import { Cell, PROP_ICON } from "./cells"
import type { DbCtx } from "./ctx"
import type { Row } from "./engine"

const DocEditor = dynamic(() => import("@/app/dashboard/workspace/[workspaceId]/docs/components/doc-editor").then((m) => m.DocEditor), {
  ssr: false,
  loading: () => <div className="flex h-40 items-center justify-center"><Loader className="size-5 animate-spin text-[#ff5018]" /></div>,
})

const TitleInput = ({ row, ctx }: { row: Row; ctx: DbCtx }) => {
  const [title, setTitle] = useState(row.title)
  return (
    <input value={title} maxLength={200} placeholder="Untitled" aria-label="Row title" autoFocus={!row.title}
      onChange={(e) => setTitle(e.target.value)} onBlur={() => { if (title.trim() !== row.title) void ctx.setTitle(row._id, title.trim()) }}
      onKeyDown={(e) => { if (e.key === "Enter") (e.target as HTMLInputElement).blur() }}
      className="min-w-0 flex-1 bg-transparent text-2xl font-semibold tracking-tight outline-none placeholder:text-ink/30" />
  )
}

export const RowPeek = ({ row, ctx, onClose, onOpenRow }: { row: Row | null; ctx: DbCtx; onClose: () => void; onOpenRow: (id: string) => void }) => {
  const remove = useMutation(api.databases.deleteRows)
  const duplicate = useMutation(api.databases.duplicateRow)
  const { handleLimitError } = useLimitHandler()

  const del = async () => {
    if (!row) return
    try { await remove({ docId: ctx.docId as Id<"docs">, rowIds: [row._id as Id<"dbRows">] }); onClose() } catch (e) { toast.error(friendlyError(e, "Couldn't delete")) }
  }
  const dup = async () => {
    if (!row) return
    try { const id = await duplicate({ rowId: row._id as Id<"dbRows"> }); onOpenRow(id as string) } catch (e) { handleLimitError(e, "Couldn't duplicate") }
  }

  return (
    <Sheet open={!!row} onOpenChange={(o) => { if (!o) onClose() }}>
      <SheetContent side="right" className="flex w-[min(100vw,44rem)] max-w-none flex-col gap-0 p-0 sm:w-[44rem]">
        <SheetTitle className="sr-only">{row?.title || "Row"}</SheetTitle>
        <SheetDescription className="sr-only">Properties and notes for this row</SheetDescription>
        {row && (
          <>
            <div className="flex items-start gap-2 border-b border-plum/12 px-5 pb-3 pt-5 pr-12">
              <TitleInput key={`${row._id}:${row.title}`} row={row} ctx={ctx} />
              <Button type="button" variant="ghost" size="icon" className="size-8" aria-label="Duplicate row" onClick={dup}><Copy className="size-4" /></Button>
              <Button type="button" variant="ghost" size="icon" className="size-8 text-destructive" aria-label="Delete row" onClick={del}><Trash2 className="size-4" /></Button>
            </div>
            <div className="flex-1 overflow-y-auto">
              {ctx.props.length > 0 && (
                <div className="space-y-0.5 border-b border-plum/12 px-3 py-3">
                  {ctx.props.map((p) => {
                    const Icon = PROP_ICON[p.type]
                    return (
                      <div key={p.id} className="grid grid-cols-[8rem_1fr] items-start gap-2 sm:grid-cols-[10rem_1fr]">
                        <div className="flex min-h-9 items-center gap-1.5 px-2 text-xs text-ink/60"><Icon className="size-3.5 shrink-0" /><span className="truncate">{p.name}</span></div>
                        <div className="min-w-0"><Cell prop={p} row={row} ctx={ctx} block /></div>
                      </div>
                    )
                  })}
                </div>
              )}
              <div className="min-h-[300px]">
                <DocEditor key={row._id} rowId={row._id as Id<"dbRows">} roomId={row.roomId} compact userId={ctx.me.id} userName={ctx.me.name} userColor={ctx.me.color} userAvatar={ctx.me.image} />
              </div>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  )
}
