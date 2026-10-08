"use client"
import { Plus } from "lucide-react"
import { cn } from "@/lib/utils"
import { CellValue, Chip } from "./cells"
import { Card } from "./board-view"
import { groupRows, valueForGroup, type Group, type Row } from "./engine"
import { visibleProps, type ViewProps } from "./shared"

const sections = (rows: Row[], view: ViewProps["view"], ctx: ViewProps["ctx"]): { group?: Group; rows: Row[]; key: string }[] => {
  const gp = ctx.props.find((p) => p.id === view.groupBy)
  if (!gp) return [{ rows, key: "all" }]
  return groupRows(rows, gp, ctx.env, ctx.comp, { showEmpty: false }).filter((g) => g.rows.length).map((g) => ({ group: g, rows: g.rows, key: g.key }))
}

const Heading = ({ g }: { g?: Group }) =>
  g ? <div className="mb-2 mt-4 flex items-center gap-2 first:mt-0">{g.option ? <Chip option={g.option} /> : <span className="text-sm font-medium">{g.label}</span>}<span className="text-xs text-ink/50">{g.rows.length}</span></div> : null

export const ListView = ({ view, rows, ctx, onAdd }: ViewProps) => {
  const props = visibleProps(view, ctx)
  const gp = ctx.props.find((p) => p.id === view.groupBy)
  return (
    <div className="h-full overflow-y-auto p-4">
      <div className="mx-auto max-w-4xl">
        {sections(rows, view, ctx).map((s) => (
          <div key={s.key}>
            <Heading g={s.group} />
            <div className="overflow-hidden rounded-xl border border-plum/12 bg-surface">
              {s.rows.map((r) => (
                <div key={r._id} role="button" tabIndex={0} onClick={() => ctx.openRow(r._id)} onKeyDown={(e) => { if (e.key === "Enter") ctx.openRow(r._id) }}
                  className="flex cursor-pointer flex-wrap items-center gap-x-4 gap-y-1 border-b border-plum/10 px-3 py-2 last:border-b-0 hover:bg-cream-soft">
                  <span className={cn("min-w-[8rem] flex-1 truncate text-sm font-medium", !r.title && "text-ink/35")}>{r.title || "Untitled"}</span>
                  {props.map((p) => <span key={p.id} className="flex max-w-[14rem] min-w-0 items-center"><CellValue prop={p} row={r} ctx={ctx} /></span>)}
                </div>
              ))}
              <button type="button" onClick={() => onAdd(gp && s.group ? { [gp.id]: valueForGroup(gp, s.group.key) } : undefined)} className="flex h-9 w-full items-center gap-1.5 px-3 text-sm text-ink/55 hover:bg-cream-soft hover:text-ink">
                <Plus className="size-3.5" /> New
              </button>
            </div>
          </div>
        ))}
        {rows.length === 0 && <p className="py-6 text-center text-sm text-ink/55">No rows to show.</p>}
      </div>
    </div>
  )
}

export const GalleryView = ({ view, rows, ctx, onAdd }: ViewProps) => {
  const props = visibleProps(view, ctx)
  const gp = ctx.props.find((p) => p.id === view.groupBy)
  const size = view.cardSize ?? "md"
  const grid = size === "sm" ? "grid-cols-2 md:grid-cols-4 xl:grid-cols-6" : size === "lg" ? "grid-cols-1 md:grid-cols-2" : "grid-cols-1 sm:grid-cols-2 xl:grid-cols-4"
  return (
    <div className="h-full overflow-y-auto p-4">
      {sections(rows, view, ctx).map((s) => (
        <div key={s.key}>
          <Heading g={s.group} />
          <div className={cn("grid gap-3", grid)}>
            {s.rows.map((r) => <Card key={r._id} row={r} props={props} ctx={ctx} className={cn(size === "lg" ? "min-h-40" : size === "sm" ? "min-h-20" : "min-h-28")} onClick={() => ctx.openRow(r._id)} />)}
            <button type="button" onClick={() => onAdd(gp && s.group ? { [gp.id]: valueForGroup(gp, s.group.key) } : undefined)}
              className="flex min-h-20 items-center justify-center gap-1.5 rounded-lg border border-dashed border-plum/20 text-sm text-ink/55 hover:border-[#ff5018]/50 hover:text-ink">
              <Plus className="size-4" /> New
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}
