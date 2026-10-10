"use client"
import { ArrowDown, ArrowUp, Eye, EyeOff, Group, ListFilter, ArrowUpDown, Plus, X } from "lucide-react"
import { newId, type Condition, type Prop, type View } from "../../../convex/dbTypes"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { PROP_ICON } from "./cells"
import { groupable, kindOf, opsFor, TITLE } from "./engine"
import type { DbCtx } from "./ctx"

const sel = "h-8 rounded-md border border-input bg-transparent px-1.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-brand/50"

const ToolbarButton = ({ active, count, icon: Icon, label }: { active?: boolean; count?: number; icon: React.ComponentType<{ className?: string }>; label: string }) => (
  <Button type="button" variant="ghost" size="sm" className={cn("h-8 gap-1.5 px-2 text-xs", active && "bg-brand/10 text-[#c73a0a]")}>
    <Icon className="size-3.5" /> <span className="hidden sm:inline">{label}</span>{!!count && <span className="rounded-full bg-brand px-1.5 text-[10px] font-semibold text-white">{count}</span>}
  </Button>
)

const allProps = (ctx: DbCtx): Prop[] => [TITLE, ...ctx.props]

const ConditionValue = ({ c, prop, ctx, onChange }: { c: Condition; prop: Prop; ctx: DbCtx; onChange: (v: string) => void }) => {
  const def = opsFor(prop).find((o) => o.id === c.op)
  if (!def?.needsValue) return null
  const val = typeof c.value === "string" || typeof c.value === "number" ? String(c.value) : ""
  const kind = c.propId === "title" ? "text" : kindOf(prop)
  if (kind === "select") return (
    <select aria-label="Value" className={cn(sel, "min-w-0 flex-1")} value={val} onChange={(e) => onChange(e.target.value)}>
      <option value="">Choose…</option>{(prop.options ?? []).map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
    </select>
  )
  if (kind === "multiSelect") return (
    <select aria-label="Value" className={cn(sel, "min-w-0 flex-1")} value={val} onChange={(e) => onChange(e.target.value)}>
      <option value="">Choose…</option>{(prop.options ?? []).map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
    </select>
  )
  if (kind === "person") return (
    <select aria-label="Value" className={cn(sel, "min-w-0 flex-1")} value={val} onChange={(e) => onChange(e.target.value)}>
      <option value="">Choose…</option><option value={ctx.me.id}>Me</option>{ctx.members.filter((m) => m.id !== ctx.me.id).map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
    </select>
  )
  if (kind === "relation") {
    const rel = prop.relation && ctx.related.get(prop.relation.databaseId)
    return (
      <select aria-label="Value" className={cn(sel, "min-w-0 flex-1")} value={val} onChange={(e) => onChange(e.target.value)}>
        <option value="">Choose…</option>{(rel?.rows ?? []).slice(0, 300).map((r) => <option key={r._id} value={r._id}>{r.title || "Untitled"}</option>)}
      </select>
    )
  }
  if (kind === "date") return (
    <div className="flex min-w-0 flex-1 gap-1">
      <select aria-label="Day" className={cn(sel, "w-24")} value={["today", "yesterday", "tomorrow"].includes(val) ? val : "date"} onChange={(e) => onChange(e.target.value === "date" ? new Date().toISOString().slice(0, 10) : e.target.value)}>
        <option value="today">Today</option><option value="yesterday">Yesterday</option><option value="tomorrow">Tomorrow</option><option value="date">Pick…</option>
      </select>
      {!["today", "yesterday", "tomorrow"].includes(val) && <Input aria-label="Date" type="date" className="h-8 min-w-0 flex-1" value={val.slice(0, 10)} onChange={(e) => onChange(e.target.value)} />}
    </div>
  )
  return <Input aria-label="Value" type={kind === "number" ? "number" : "text"} className="h-8 min-w-0 flex-1" value={val} onChange={(e) => onChange(e.target.value)} />
}

export const FilterControl = ({ view, ctx, onChange }: { view: View; ctx: DbCtx; onChange: (v: View) => void }) => {
  const cs = view.filter.conditions
  const set = (conditions: Condition[], match = view.filter.match) => onChange({ ...view, filter: { match, conditions } })
  const upd = (id: string, patch: Partial<Condition>) => set(cs.map((c) => (c.id === id ? { ...c, ...patch } : c)))
  const propOf = (id: string) => (id === "title" ? TITLE : ctx.props.find((p) => p.id === id) ?? TITLE)
  return (
    <Popover>
      <PopoverTrigger asChild><span><ToolbarButton icon={ListFilter} label="Filter" count={cs.length} active={cs.length > 0} /></span></PopoverTrigger>
      <PopoverContent align="start" className="w-[min(92vw,34rem)] space-y-2 p-3">
        {cs.length === 0 && <p className="text-sm text-ink/60">No filters. Add one to narrow down what this view shows.</p>}
        {cs.map((c, i) => {
          const p = propOf(c.propId)
          return (
            <div key={c.id} className="flex flex-wrap items-center gap-1.5">
              <span className="w-12 shrink-0 text-xs text-ink/55">
                {i === 0 ? "Where" : i === 1 ? (
                  <select aria-label="Match" className={cn(sel, "w-16 px-1 text-xs")} value={view.filter.match} onChange={(e) => set(cs, e.target.value === "or" ? "or" : "and")}><option value="and">and</option><option value="or">or</option></select>
                ) : view.filter.match}
              </span>
              <select aria-label="Property" className={cn(sel, "w-32")} value={c.propId} onChange={(e) => { const np = propOf(e.target.value); upd(c.id, { propId: e.target.value, op: opsFor(np)[0].id, value: undefined }) }}>
                {allProps(ctx).map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}
              </select>
              <select aria-label="Condition" className={cn(sel, "w-36")} value={c.op} onChange={(e) => upd(c.id, { op: e.target.value })}>
                {opsFor(p).map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
              </select>
              <ConditionValue c={c} prop={p} ctx={ctx} onChange={(value) => upd(c.id, { value })} />
              <Button type="button" variant="ghost" size="icon" className="ml-auto size-8" aria-label="Remove filter" onClick={() => set(cs.filter((x) => x.id !== c.id))}><X className="size-3.5" /></Button>
            </div>
          )
        })}
        <div className="flex items-center justify-between pt-1">
          <Button type="button" variant="outline" size="sm" className="h-8" onClick={() => set([...cs, { id: newId(), propId: "title", op: "contains", value: "" }])}><Plus className="mr-1 size-3.5" /> Add filter</Button>
          {cs.length > 0 && <Button type="button" variant="ghost" size="sm" className="h-8 text-xs" onClick={() => set([])}>Clear all</Button>}
        </div>
      </PopoverContent>
    </Popover>
  )
}

export const SortControl = ({ view, ctx, onChange }: { view: View; ctx: DbCtx; onChange: (v: View) => void }) => {
  const ss = view.sorts
  const set = (sorts: View["sorts"]) => onChange({ ...view, sorts })
  return (
    <Popover>
      <PopoverTrigger asChild><span><ToolbarButton icon={ArrowUpDown} label="Sort" count={ss.length} active={ss.length > 0} /></span></PopoverTrigger>
      <PopoverContent align="start" className="w-[min(92vw,22rem)] space-y-2 p-3">
        {ss.length === 0 && <p className="text-sm text-ink/60">Rows keep the order you dragged them into.</p>}
        {ss.map((s, i) => (
          <div key={i} className="flex items-center gap-1.5">
            <select aria-label="Sort by" className={cn(sel, "min-w-0 flex-1")} value={s.propId} onChange={(e) => set(ss.map((x, j) => (j === i ? { ...x, propId: e.target.value } : x)))}>
              {allProps(ctx).map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}
            </select>
            <Button type="button" variant="outline" size="sm" className="h-8 w-24 gap-1 text-xs" onClick={() => set(ss.map((x, j) => (j === i ? { ...x, dir: x.dir === "asc" ? "desc" : "asc" } : x)))}>
              {s.dir === "asc" ? <><ArrowUp className="size-3" /> Ascending</> : <><ArrowDown className="size-3" /> Descending</>}
            </Button>
            <Button type="button" variant="ghost" size="icon" className="size-8" aria-label="Remove sort" onClick={() => set(ss.filter((_, j) => j !== i))}><X className="size-3.5" /></Button>
          </div>
        ))}
        {ss.length < 5 && <Button type="button" variant="outline" size="sm" className="h-8" onClick={() => set([...ss, { propId: ctx.props.find((p) => !ss.some((s) => s.propId === p.id))?.id ?? "title", dir: "asc" }])}><Plus className="mr-1 size-3.5" /> Add sort</Button>}
      </PopoverContent>
    </Popover>
  )
}

export const GroupControl = ({ view, ctx, onChange }: { view: View; ctx: DbCtx; onChange: (v: View) => void }) => (
  <Popover>
    <PopoverTrigger asChild><span><ToolbarButton icon={Group} label="Group" active={!!view.groupBy} /></span></PopoverTrigger>
    <PopoverContent align="start" className="w-64 space-y-2 p-3">
      <label className="block text-xs font-medium text-ink/60" htmlFor="group-by">Group by</label>
      <select id="group-by" className={cn(sel, "w-full")} value={view.groupBy ?? ""} onChange={(e) => onChange({ ...view, groupBy: e.target.value || undefined })}>
        <option value="">None</option>
        {ctx.props.filter(groupable).map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
      </select>
      {view.type === "board" && !view.groupBy && <p className="text-xs text-ink/55">A board needs a property to make its columns from.</p>}
    </PopoverContent>
  </Popover>
)

export const PropertiesControl = ({ view, ctx, onChange, onAdd }: { view: View; ctx: DbCtx; onChange: (v: View) => void; onAdd?: () => void }) => {
  const hidden = new Set(view.hidden)
  const toggle = (id: string) => onChange({ ...view, hidden: hidden.has(id) ? view.hidden.filter((x) => x !== id) : [...view.hidden, id] })
  return (
    <Popover>
      <PopoverTrigger asChild><span><ToolbarButton icon={Eye} label="Properties" count={hidden.size || undefined} active={hidden.size > 0} /></span></PopoverTrigger>
      <PopoverContent align="start" className="w-64 p-2">
        <div className="max-h-72 space-y-0.5 overflow-y-auto">
          {ctx.props.map((p) => {
            const Icon = PROP_ICON[p.type]
            return (
              <button key={p.id} type="button" onClick={() => toggle(p.id)} className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-cream-deep">
                <Icon className="size-3.5 text-ink/55" /><span className="flex-1 truncate">{p.name}</span>
                {hidden.has(p.id) ? <EyeOff className="size-3.5 text-ink/40" /> : <Eye className="size-3.5 text-brand" />}
              </button>
            )
          })}
          {!ctx.props.length && <p className="px-2 py-1 text-xs text-ink/55">No properties yet.</p>}
        </div>
        {onAdd && ctx.canEditSchema && <Button type="button" variant="ghost" size="sm" className="mt-1 h-8 w-full justify-start text-xs" onClick={onAdd}><Plus className="mr-1 size-3.5" /> New property</Button>}
      </PopoverContent>
    </Popover>
  )
}
