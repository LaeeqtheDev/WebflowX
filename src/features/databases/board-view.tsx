"use client"
import { useRef, useState } from "react"
import { Plus } from "lucide-react"
import { cn } from "@/lib/utils"
import { CellValue, Chip } from "./cells"
import { groupRows, valueForGroup, type Row } from "./engine"
import { positionBetween, visibleProps, type ViewProps } from "./shared"
import type { Prop } from "../../../convex/dbTypes"

export const Card = ({ row, props, ctx, className, onClick }: { row: Row; props: Prop[]; ctx: ViewProps["ctx"]; className?: string; onClick: () => void }) => {
  const shown = props.filter((p) => {
    const v = ctx.comp.valueOf(row, p.id)
    return !(v === undefined || v === null || v === "" || v === false || (Array.isArray(v) && !v.length))
  })
  return (
    <div role="button" tabIndex={0} onClick={onClick} onKeyDown={(e) => { if (e.key === "Enter") onClick() }}
      className={cn("cursor-pointer rounded-lg border border-plum/12 bg-surface p-2.5 text-left shadow-sm transition-shadow hover:shadow-md", className)}>
      <p className={cn("text-sm font-medium leading-snug", !row.title && "text-ink/35")}>{row.title || "Untitled"}</p>
      {shown.length > 0 && (
        <div className="mt-2 space-y-1">
          {shown.map((p) => <div key={p.id} className="flex min-w-0 items-center text-xs"><CellValue prop={p} row={row} ctx={ctx} /></div>)}
        </div>
      )}
    </div>
  )
}

export const BoardView = ({ view, rows, ctx, onView, onAdd, onMove }: ViewProps) => {
  const groupProp = ctx.props.find((p) => p.id === view.groupBy)
  const props = visibleProps(view, ctx).filter((p) => p.id !== view.groupBy)
  const [dragging, setDragging] = useState<string | null>(null)
  const [overCol, setOverCol] = useState<string | null>(null)
  const [overCard, setOverCard] = useState<string | null>(null)
  const from = useRef<{ key: string } | null>(null)

  if (!groupProp) {
    const candidates = ctx.props.filter((p) => p.type === "select" || p.type === "status" || p.type === "multiSelect" || p.type === "person")
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 p-6 text-center">
        <p className="max-w-sm text-sm text-ink/70">A board needs a property to make its columns from.</p>
        {candidates.length ? (
          <div className="flex flex-wrap justify-center gap-2">
            {candidates.map((p) => <button key={p.id} type="button" onClick={() => onView({ ...view, groupBy: p.id })} className="rounded-lg border border-plum/15 bg-surface px-3 py-1.5 text-sm hover:border-brand/50">Group by {p.name}</button>)}
          </div>
        ) : <p className="text-xs text-ink/55">Add a Select or Status property first.</p>}
      </div>
    )
  }

  const groups = groupRows(rows, groupProp, ctx.env, ctx.comp, { showEmpty: true }).filter((g) => g.key !== "" || g.rows.length)
  const multi = groupProp.type === "multiSelect" || groupProp.type === "person"

  const drop = (toKey: string, beforeId?: string) => {
    const id = dragging
    setDragging(null); setOverCol(null); setOverCard(null)
    if (!id) return
    const row = rows.find((r) => r._id === id)
    const col = groups.find((g) => g.key === toKey)
    if (!row || !col) return
    const list = col.rows.filter((r) => r._id !== id)
    const idx = beforeId ? list.findIndex((r) => r._id === beforeId) : list.length
    const pos = positionBetween(list[idx - 1]?.position, list[idx]?.position)
    const fromKey = from.current?.key ?? ""
    let values: Record<string, unknown> | undefined
    if (fromKey !== toKey) {
      if (multi) {
        const cur = ((ctx.comp.valueOf(row, groupProp.id) as string[] | undefined) ?? []).filter((x) => x !== fromKey && x !== toKey)
        const next = toKey ? [...cur, toKey] : cur
        values = { [groupProp.id]: next.length ? next : null }
      } else values = { [groupProp.id]: valueForGroup(groupProp, toKey) }
    }
    onMove(id, pos, values)
  }

  return (
    <div className="flex h-full gap-3 overflow-x-auto p-4">
      {groups.map((g) => (
        <section key={g.key} aria-label={g.label}
          onDragOver={(e) => { if (dragging) { e.preventDefault(); setOverCol(g.key) } }}
          onDrop={(e) => { e.preventDefault(); drop(g.key) }}
          className={cn("flex w-72 shrink-0 flex-col rounded-xl bg-cream-soft p-2", overCol === g.key && "ring-2 ring-brand/40")}>
          <header className="flex items-center gap-2 px-1.5 pb-2 pt-1">
            {g.option ? <Chip option={g.option} /> : <span className="text-sm font-medium">{g.label}</span>}
            <span className="text-xs text-ink/50">{g.rows.length}</span>
          </header>
          <div className="flex-1 space-y-2 overflow-y-auto">
            {g.rows.map((r) => (
              <div key={r._id} draggable
                onDragStart={(e) => { e.dataTransfer.effectAllowed = "move"; e.dataTransfer.setData("text/plain", r._id); setDragging(r._id); from.current = { key: g.key } }}
                onDragEnd={() => { setDragging(null); setOverCol(null); setOverCard(null) }}
                onDragOver={(e) => { if (dragging && dragging !== r._id) { e.preventDefault(); e.stopPropagation(); setOverCol(g.key); setOverCard(r._id) } }}
                onDrop={(e) => { e.preventDefault(); e.stopPropagation(); drop(g.key, r._id) }}
                className={cn(dragging === r._id && "opacity-40", overCard === r._id && "border-t-2 border-brand pt-1")}>
                <Card row={r} props={props} ctx={ctx} onClick={() => ctx.openRow(r._id)} />
              </div>
            ))}
          </div>
          <button type="button" onClick={() => onAdd(g.key === "" ? undefined : { [groupProp.id]: valueForGroup(groupProp, g.key) })}
            className="mt-2 flex h-8 items-center gap-1.5 rounded-md px-2 text-sm text-ink/55 hover:bg-cream-deep hover:text-ink">
            <Plus className="size-3.5" /> New
          </button>
        </section>
      ))}
    </div>
  )
}
