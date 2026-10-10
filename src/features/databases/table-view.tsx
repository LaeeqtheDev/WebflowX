"use client"
import { useRef, useState } from "react"
import { ChevronDown, ChevronRight, EyeOff, GripVertical, Maximize2, Pencil, Plus, SortAsc, SortDesc, Trash2 } from "lucide-react"
import { useMutation } from "convex/react"
import { toast } from "sonner"
import { api } from "../../../convex/_generated/api"
import type { Id } from "../../../convex/_generated/dataModel"
import type { Prop, RollupFn } from "../../../convex/dbTypes"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { friendlyError } from "@/hooks/use-limit-handler"
import { Cell, Chip, PROP_ICON } from "./cells"
import { groupRows, kindOf, summarize, TITLE, valueForGroup, type Row } from "./engine"
import { positionBetween, visibleProps, type ViewProps } from "./shared"

const TITLE_W = 280
const DEF_W = 180

const CALC_LABEL: Partial<Record<RollupFn, string>> = {
  count: "Count all", countValues: "Count values", countUnique: "Count unique", countEmpty: "Count empty",
  percentEmpty: "Percent empty", percentNotEmpty: "Percent filled", sum: "Sum", average: "Average", median: "Median",
  min: "Min", max: "Max", range: "Range", earliest: "Earliest", latest: "Latest",
  checked: "Checked", unchecked: "Unchecked", percentChecked: "Percent checked",
}
const calcsFor = (p: Prop | typeof TITLE): RollupFn[] => {
  const base: RollupFn[] = ["count", "countValues", "countUnique", "countEmpty", "percentEmpty", "percentNotEmpty"]
  if (p.id === "title") return ["count", "countEmpty"]
  const k = kindOf(p as Prop)
  if (k === "number") return [...base, "sum", "average", "median", "min", "max", "range"]
  if (k === "date") return [...base, "earliest", "latest", "range"]
  if (k === "checkbox") return ["count", "checked", "unchecked", "percentChecked"]
  return base
}

const TitleCell = ({ row, ctx }: { row: Row; ctx: ViewProps["ctx"] }) => {
  const [edit, setEdit] = useState(false)
  const [v, setV] = useState(row.title)
  const done = (commit: boolean) => { setEdit(false); if (commit && v.trim() !== row.title) void ctx.setTitle(row._id, v.trim()) }
  return edit ? (
    <input autoFocus value={v} maxLength={200} onChange={(e) => setV(e.target.value)} onBlur={() => done(true)}
      onKeyDown={(e) => { if (e.key === "Enter") done(true); else if (e.key === "Escape") { setV(row.title); done(false) } }}
      className="h-8 w-full bg-transparent px-2 text-sm font-medium outline-none ring-2 ring-brand/60" />
  ) : (
    <div className="group/t flex min-h-8 w-full items-center gap-1 px-2">
      <span role="button" tabIndex={0} onClick={() => { setV(row.title); setEdit(true) }} onKeyDown={(e) => { if (e.key === "Enter") { setV(row.title); setEdit(true) } }}
        className={cn("min-w-0 flex-1 cursor-text truncate text-sm font-medium", !row.title && "text-ink/35")}>{row.title || "Untitled"}</span>
      <button type="button" onClick={() => ctx.openRow(row._id)} aria-label={`Open ${row.title || "row"}`}
        className="flex shrink-0 items-center gap-1 rounded border border-plum/15 bg-surface px-1.5 py-0.5 text-[11px] text-ink/70 opacity-0 hover:bg-cream-deep focus-visible:opacity-100 group-hover/t:opacity-100 max-md:opacity-100">
        <Maximize2 className="size-3" /> Open
      </button>
    </div>
  )
}

export const TableView = ({ view, rows, ctx, onView, onAdd, onMove }: ViewProps) => {
  const props = visibleProps(view, ctx)
  const deleteRows = useMutation(api.databases.deleteRows)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set())
  const dragId = useRef<string | null>(null)
  const [over, setOver] = useState<string | null>(null)
  const dragRow = useRef<string | null>(null)
  const [rowOver, setRowOver] = useState<{ id: string; after: boolean } | null>(null)
  const canReorder = view.sorts.length === 0
  const w = (id: string) => view.widths[id] ?? (id === "title" ? TITLE_W : DEF_W)
  const cols = `52px ${w("title")}px ${props.map((p) => `${w(p.id)}px`).join(" ")} 44px`
  const total = 52 + w("title") + props.reduce((a, p) => a + w(p.id), 0) + 44

  const groupProp = view.groupBy ? ctx.props.find((p) => p.id === view.groupBy) : undefined
  const groups = groupProp ? groupRows(rows, groupProp, ctx.env, ctx.comp, { showEmpty: true }).filter((g) => g.rows.length || groupProp.options) : [{ key: "__all", label: "", rows, option: undefined }]

  const startResize = (e: React.PointerEvent, id: string) => {
    e.preventDefault(); e.stopPropagation()
    const startX = e.clientX, start = w(id)
    let cur = start
    const move = (ev: PointerEvent) => { cur = Math.min(800, Math.max(80, start + ev.clientX - startX)); (e.target as HTMLElement).closest<HTMLElement>("[data-col]")?.style.setProperty("width", `${cur}px`) }
    const up = () => { window.removeEventListener("pointermove", move); window.removeEventListener("pointerup", up); if (cur !== start) onView({ ...view, widths: { ...view.widths, [id]: cur } }) }
    window.addEventListener("pointermove", move); window.addEventListener("pointerup", up)
  }

  const reorder = (target: string) => {
    const from = dragId.current
    dragId.current = null; setOver(null)
    if (!from || from === target) return
    const ids = props.map((p) => p.id).filter((i) => i !== from)
    ids.splice(ids.indexOf(target), 0, from)
    const rest = ctx.props.filter((p) => !ids.includes(p.id)).map((p) => p.id)
    onView({ ...view, order: [...ids, ...rest] })
  }

  const remove = async () => {
    const ids = [...selected]
    try { await deleteRows({ docId: ctx.docId as Id<"docs">, rowIds: ids as Id<"dbRows">[] }); setSelected(new Set()); toast.success(ids.length === 1 ? "Row deleted" : `${ids.length} rows deleted`) }
    catch (e) { toast.error(friendlyError(e, "Couldn't delete")) }
  }

  const setCalc = (id: string, fn: RollupFn | null) => {
    const calcs = { ...(view.calcs ?? {}) }
    if (fn) calcs[id] = fn; else delete calcs[id]
    onView({ ...view, calcs })
  }
  const calcCell = (p: Prop | typeof TITLE) => {
    const fn = p.id === "title" && !view.calcs?.title ? ("count" as RollupFn) : view.calcs?.[p.id]
    const shownFn = p.id === "title" ? (view.calcs?.title ?? "count") : fn
    const value = shownFn ? summarize(rows, p as Prop, shownFn, ctx.comp) : ""
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button type="button" className="group/c flex h-8 w-full items-center gap-1 px-2 text-left text-ink/55 hover:bg-cream-deep">
            {shownFn ? <><span className="truncate">{CALC_LABEL[shownFn]}</span><span className="ml-auto truncate font-medium text-ink">{value}</span></> : <span className="opacity-0 hover:opacity-100 focus-visible:opacity-100 group-hover/c:opacity-100">Calculate</span>}
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-44">
          {p.id !== "title" && <DropdownMenuItem onClick={() => setCalc(p.id, null)}>None</DropdownMenuItem>}
          {calcsFor(p).map((f) => <DropdownMenuItem key={f} onClick={() => setCalc(p.id, f)}>{CALC_LABEL[f]}</DropdownMenuItem>)}
        </DropdownMenuContent>
      </DropdownMenu>
    )
  }

  const setSort = (p: Prop | typeof TITLE, dir: "asc" | "desc") => onView({ ...view, sorts: [{ propId: p.id, dir }] })

  const header = (p: Prop | typeof TITLE) => {
    const isTitle = p.id === "title"
    const Icon = isTitle ? PROP_ICON.text : PROP_ICON[(p as Prop).type]
    return (
      <div data-col style={{ width: w(p.id) }}
        draggable={!isTitle} onDragStart={() => { dragId.current = p.id }} onDragOver={(e) => { if (!isTitle && dragId.current) { e.preventDefault(); setOver(p.id) } }}
        onDragLeave={() => setOver((o) => (o === p.id ? null : o))} onDrop={() => reorder(p.id)} onDragEnd={() => { dragId.current = null; setOver(null) }}
        className={cn("relative min-w-0", over === p.id && "bg-brand/10")}>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button type="button" className="flex h-8 w-full items-center gap-1.5 px-2 text-left text-xs font-medium text-ink/65 hover:bg-cream-deep">
              <Icon className="size-3.5 shrink-0" /><span className="truncate">{p.name}</span>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-44">
            {!isTitle && ctx.canEditSchema && <DropdownMenuItem onClick={() => ctx.editProp(p.id)}><Pencil className="mr-2 size-3.5" /> Edit property</DropdownMenuItem>}
            <DropdownMenuItem onClick={() => setSort(p, "asc")}><SortAsc className="mr-2 size-3.5" /> Sort ascending</DropdownMenuItem>
            <DropdownMenuItem onClick={() => setSort(p, "desc")}><SortDesc className="mr-2 size-3.5" /> Sort descending</DropdownMenuItem>
            {!isTitle && <DropdownMenuItem onClick={() => onView({ ...view, hidden: [...view.hidden, p.id] })}><EyeOff className="mr-2 size-3.5" /> Hide in view</DropdownMenuItem>}
          </DropdownMenuContent>
        </DropdownMenu>
        <span role="separator" aria-orientation="vertical" onPointerDown={(e) => startResize(e, p.id)} className="absolute right-0 top-0 h-full w-1.5 cursor-col-resize hover:bg-brand/40" />
      </div>
    )
  }

  const dropRow = (target: Row, after: boolean, groupKey: string) => {
    const id = dragRow.current
    dragRow.current = null; setRowOver(null)
    if (!id || id === target._id) return
    const list = rows.filter((x) => x._id !== id)
    const at = list.findIndex((x) => x._id === target._id) + (after ? 1 : 0)
    const pos = positionBetween(list[at - 1]?.position, list[at]?.position)
    let values: Record<string, unknown> | undefined
    if (groupProp && groupProp.type !== "multiSelect" && groupProp.type !== "person") {
      const cur = groupKeyOf(rows.find((x) => x._id === id))
      if (cur !== groupKey) values = { [groupProp.id]: valueForGroup(groupProp, groupKey) }
    }
    onMove(id, pos, values)
  }
  const groupKeyOf = (r: Row | undefined) => (r && groupProp ? groups.find((g) => g.rows.some((x) => x._id === r._id))?.key ?? "" : "")

  const rowEl = (r: Row, groupKey: string) => (
    <div key={r._id} role="row" style={{ gridTemplateColumns: cols }}
      onDragOver={(e) => { if (dragRow.current) { e.preventDefault(); const b = e.currentTarget.getBoundingClientRect(); setRowOver({ id: r._id, after: e.clientY > b.top + b.height / 2 }) } }}
      onDrop={(e) => { e.preventDefault(); dropRow(r, rowOver?.id === r._id ? rowOver.after : false, groupKey) }}
      className={cn("group grid border-b border-plum/10 hover:bg-cream-soft/60", rowOver?.id === r._id && (rowOver.after ? "border-b-2 border-b-brand" : "border-t-2 border-t-brand"))}>
      <div className="flex items-center justify-end gap-0.5 pr-1">
        <span
          draggable={canReorder}
          title={canReorder ? "Drag to reorder" : "Clear sorting to reorder rows"}
          aria-hidden={!canReorder}
          onDragStart={(e) => { dragRow.current = r._id; e.dataTransfer.effectAllowed = "move"; const row = e.currentTarget.closest("[role=row]"); if (row) e.dataTransfer.setDragImage(row, 20, 12) }}
          onDragEnd={() => { dragRow.current = null; setRowOver(null) }}
          className={cn("flex h-6 w-4 items-center justify-center text-ink/35 opacity-0 group-hover:opacity-100 max-md:hidden", canReorder ? "cursor-grab hover:text-ink" : "cursor-not-allowed")}>
          <GripVertical className="size-3.5" />
        </span>
        <input type="checkbox" aria-label="Select row" checked={selected.has(r._id)}
          onChange={(e) => setSelected((s) => { const n = new Set(s); if (e.target.checked) n.add(r._id); else n.delete(r._id); return n })}
          className={cn("size-3.5 accent-brand", !selected.has(r._id) && "opacity-0 group-hover:opacity-100 focus-visible:opacity-100 max-md:opacity-60")} />
      </div>
      <div className="sticky left-0 z-[1] min-w-0 border-r border-plum/10 bg-surface group-hover:bg-cream-soft"><TitleCell row={r} ctx={ctx} /></div>
      {props.map((p) => <div key={p.id} className="min-w-0 border-r border-plum/5"><Cell prop={p} row={r} ctx={ctx} /></div>)}
      <div />
    </div>
  )

  return (
    <div className="flex h-full flex-col">
      {selected.size > 0 && (
        <div className="flex items-center gap-3 border-b border-plum/12 bg-brand/8 px-4 py-1.5 text-sm">
          <span>{selected.size} selected</span>
          <Button size="sm" variant="ghost" className="h-7 text-destructive" onClick={remove}><Trash2 className="mr-1 size-3.5" /> Delete</Button>
          <Button size="sm" variant="ghost" className="h-7" onClick={() => setSelected(new Set())}>Clear</Button>
        </div>
      )}
      <div className="flex-1 overflow-auto">
        <div style={{ minWidth: total }} role="table">
          <div role="row" style={{ gridTemplateColumns: cols }} className="sticky top-0 z-[2] grid border-b border-plum/12 bg-surface">
            <div />
            <div className="sticky left-0 z-[3] border-r border-plum/10 bg-surface">{header(TITLE)}</div>
            {props.map((p) => <div key={p.id} className="min-w-0 border-r border-plum/5">{header(p)}</div>)}
            <div className="flex items-center justify-center">
              {ctx.canEditSchema && <Button type="button" variant="ghost" size="icon" className="size-7" aria-label="Add property" onClick={() => ctx.editProp("new")}><Plus className="size-4" /></Button>}
            </div>
          </div>

          {groups.map((g) => (
            <div key={g.key}>
              {groupProp && (
                <div className="flex items-center gap-2 border-b border-plum/10 bg-cream-soft px-3 py-1.5">
                  <button type="button" aria-label="Toggle group" onClick={() => setCollapsed((s) => { const n = new Set(s); if (n.has(g.key)) n.delete(g.key); else n.add(g.key); return n })}>
                    {collapsed.has(g.key) ? <ChevronRight className="size-4" /> : <ChevronDown className="size-4" />}
                  </button>
                  {g.option ? <Chip option={g.option} /> : <span className="text-sm font-medium">{g.label}</span>}
                  <span className="text-xs text-ink/50">{g.rows.length}</span>
                </div>
              )}
              {!collapsed.has(g.key) && g.rows.map((r) => rowEl(r, g.key))}
              {!collapsed.has(g.key) && (
                <button type="button" onClick={() => onAdd(groupProp ? { [groupProp.id]: valueForGroup(groupProp, g.key) } : undefined)}
                  className="sticky left-0 flex h-8 w-full items-center gap-1.5 px-3 text-sm text-ink/55 hover:bg-cream-soft hover:text-ink">
                  <Plus className="size-3.5" /> New
                </button>
              )}
            </div>
          ))}
          {rows.length === 0 && !groupProp && <p className="px-4 py-6 text-sm text-ink/55">No rows to show. Add one with “New”, or clear the filters.</p>}
        </div>
      </div>
      <div className="overflow-x-auto border-t border-plum/12 bg-surface">
        <div style={{ minWidth: total, gridTemplateColumns: cols }} className="grid text-xs">
          <div />
          <div className="sticky left-0 z-[1] bg-surface">{calcCell(TITLE)}</div>
          {props.map((p) => <div key={p.id} className="min-w-0">{calcCell(p)}</div>)}
          <div />
        </div>
      </div>
    </div>
  )
}
