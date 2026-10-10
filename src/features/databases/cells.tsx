"use client"
import { useEffect, useRef, useState } from "react"
import {
  AlignLeft, ArrowUpRight, Calendar, CircleChevronDown, CircleDot, Clock, Hash, Link2, List, Mail, Phone,
  Plus, Sigma, SquareCheck, SquareFunction, User, Check,
} from "lucide-react"
import type { DateValue, Option, OptionColor, Prop, PropType } from "../../../convex/dbTypes"
import { COLORS } from "../../../convex/dbTypes"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { CHIP, DOT } from "./colors"
import type { DbCtx } from "./ctx"
import { isErr, optionOf, toDateStr, type Row } from "./engine"

export const PROP_ICON: Record<PropType, React.ComponentType<{ className?: string }>> = {
  text: AlignLeft, number: Hash, select: CircleChevronDown, multiSelect: List, status: CircleDot, date: Calendar,
  person: User, checkbox: SquareCheck, url: Link2, email: Mail, phone: Phone, relation: ArrowUpRight,
  rollup: Sigma, formula: SquareFunction, createdTime: Clock, lastEdited: Clock, createdBy: User,
}

export const PROP_LABEL: Record<PropType, string> = {
  text: "Text", number: "Number", select: "Select", multiSelect: "Multi-select", status: "Status", date: "Date",
  person: "Person", checkbox: "Checkbox", url: "URL", email: "Email", phone: "Phone", relation: "Relation",
  rollup: "Rollup", formula: "Formula", createdTime: "Created time", lastEdited: "Last edited", createdBy: "Created by",
}

export const Chip = ({ option, className }: { option: Pick<Option, "name" | "color">; className?: string }) => (
  <span className={cn("inline-flex max-w-full items-center truncate rounded px-1.5 py-0.5 text-xs leading-4", CHIP[option.color], className)}>
    <span className="truncate">{option.name}</span>
  </span>
)

const Plain = ({ children }: { children: React.ReactNode }) => (
  <span className="inline-flex max-w-full items-center truncate rounded bg-cream-deep px-1.5 py-0.5 text-xs leading-4 text-ink">{children}</span>
)

const Avatar = ({ name, image }: { name: string; image?: string }) =>
  image ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={image} alt="" className="size-4 shrink-0 rounded-full object-cover" />
  ) : (
    <span className="flex size-4 shrink-0 items-center justify-center rounded-full bg-brand/20 text-[9px] font-semibold uppercase text-ink">{name.slice(0, 1)}</span>
  )

// ---- read-only rendering ----

export const CellValue = ({ prop, row, ctx }: { prop: Prop; row: Row; ctx: DbCtx }) => {
  const v = ctx.comp.valueOf(row, prop.id)
  if (isErr(v)) return <span className="text-xs text-destructive" title={v.__error}>⚠ {v.__error}</span>
  if (v === undefined || v === null || v === "" || (Array.isArray(v) && !v.length && prop.type !== "rollup")) {
    return prop.type === "checkbox" ? <Box checked={false} /> : null
  }
  switch (prop.type) {
    case "select": case "status": {
      const o = optionOf(prop, v)
      return o ? <Chip option={o} /> : null
    }
    case "multiSelect":
      return <span className="flex flex-wrap gap-1">{(v as string[]).map((id) => { const o = optionOf(prop, id); return o ? <Chip key={id} option={o} /> : null })}</span>
    case "person":
      return <span className="flex flex-wrap gap-1">{(v as string[]).map((id) => { const m = ctx.env.members.get(id); return <Plain key={id}><Avatar name={m?.name ?? "?"} image={m?.image} /><span className="ml-1">{m?.name ?? "Unknown"}</span></Plain> })}</span>
    case "createdBy": {
      const m = ctx.env.members.get(v as string)
      return <span className="inline-flex items-center gap-1.5 text-sm"><Avatar name={m?.name ?? "?"} image={m?.image} />{m?.name ?? "Unknown"}</span>
    }
    case "checkbox": return <Box checked={v === true} />
    case "url": return <a href={/^https?:\/\//i.test(String(v)) ? String(v) : `https://${v}`} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} className="truncate text-sm text-sky-700 underline underline-offset-2">{String(v)}</a>
    case "email": return <a href={`mailto:${v}`} onClick={(e) => e.stopPropagation()} className="truncate text-sm text-sky-700 underline underline-offset-2">{String(v)}</a>
    case "relation": {
      const rel = prop.relation && ctx.related.get(prop.relation.databaseId)
      return <span className="flex flex-wrap gap-1">{(v as string[]).map((id) => { const r = rel?.rows.find((x) => x._id === id); return r ? <Plain key={id}>{r.title || "Untitled"}</Plain> : null })}</span>
    }
    default: return <span className={cn("truncate text-sm", prop.type === "number" && "tabular-nums")}>{ctx.comp.display(row, prop)}</span>
  }
}

const Box = ({ checked }: { checked: boolean }) => (
  <span className={cn("flex size-4 items-center justify-center rounded border", checked ? "border-brand bg-brand text-white" : "border-ink/30 bg-surface")}>
    {checked && <Check className="size-3" strokeWidth={3} />}
  </span>
)

// ---- editors ----

const OptionPicker = ({ prop, value, multi, ctx, onChange }: { prop: Prop; value: string[]; multi: boolean; ctx: DbCtx; onChange: (v: string[]) => void }) => {
  const [q, setQ] = useState("")
  const [busy, setBusy] = useState(false)
  const opts = (prop.options ?? []).filter((o) => o.name.toLowerCase().includes(q.trim().toLowerCase()))
  const exact = (prop.options ?? []).some((o) => o.name.toLowerCase() === q.trim().toLowerCase())
  const toggle = (id: string) => onChange(multi ? (value.includes(id) ? value.filter((x) => x !== id) : [...value, id]) : value[0] === id ? [] : [id])
  const create = async () => {
    setBusy(true)
    try { const o = await ctx.addOption(prop, q.trim()); if (o) { toggle(o.id); setQ("") } } finally { setBusy(false) }
  }
  return (
    <div className="space-y-1">
      <Input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder={ctx.canEditSchema ? "Search or create…" : "Search…"} className="h-8 text-sm"
        onKeyDown={(e) => { if (e.key === "Enter" && q.trim() && !exact && ctx.canEditSchema) { e.preventDefault(); void create() } }} />
      <div className="max-h-56 space-y-0.5 overflow-y-auto">
        {opts.map((o) => (
          <button key={o.id} type="button" onClick={() => toggle(o.id)} className="flex w-full items-center justify-between rounded-md px-2 py-1 hover:bg-cream-deep">
            <Chip option={o} />
            {value.includes(o.id) && <Check className="size-3.5 text-brand" />}
          </button>
        ))}
        {!opts.length && !q && <p className="px-2 py-1 text-xs text-ink/50">No options yet.</p>}
        {q.trim() && !exact && ctx.canEditSchema && (
          <button type="button" disabled={busy} onClick={create} className="flex w-full items-center gap-1.5 rounded-md px-2 py-1 text-left text-sm hover:bg-cream-deep">
            <Plus className="size-3.5" /> Create <Chip option={{ name: q.trim(), color: "gray" }} />
          </button>
        )}
      </div>
      {value.length > 0 && <Button variant="ghost" size="sm" className="h-7 w-full text-xs" onClick={() => onChange([])}>Clear</Button>}
    </div>
  )
}

const ListPicker = ({ items, value, multi, onChange, placeholder }: {
  items: { id: string; label: string; image?: string }[]; value: string[]; multi: boolean; onChange: (v: string[]) => void; placeholder: string
}) => {
  const [q, setQ] = useState("")
  const shown = items.filter((i) => i.label.toLowerCase().includes(q.trim().toLowerCase())).slice(0, 100)
  const toggle = (id: string) => onChange(multi ? (value.includes(id) ? value.filter((x) => x !== id) : [...value, id]) : value[0] === id ? [] : [id])
  return (
    <div className="space-y-1">
      <Input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder={placeholder} className="h-8 text-sm" />
      <div className="max-h-56 space-y-0.5 overflow-y-auto">
        {shown.map((i) => (
          <button key={i.id} type="button" onClick={() => toggle(i.id)} className="flex w-full items-center justify-between gap-2 rounded-md px-2 py-1 text-left text-sm hover:bg-cream-deep">
            <span className="flex min-w-0 items-center gap-1.5">{i.image !== undefined && <Avatar name={i.label} image={i.image || undefined} />}<span className="truncate">{i.label || "Untitled"}</span></span>
            {value.includes(i.id) && <Check className="size-3.5 shrink-0 text-brand" />}
          </button>
        ))}
        {!shown.length && <p className="px-2 py-1 text-xs text-ink/50">Nothing found.</p>}
      </div>
      {value.length > 0 && <Button variant="ghost" size="sm" className="h-7 w-full text-xs" onClick={() => onChange([])}>Clear</Button>}
    </div>
  )
}

const DateEditor = ({ value, onChange }: { value?: DateValue; onChange: (v: DateValue | null) => void }) => {
  const timed = !!value?.start.includes("T")
  const [end, setEnd] = useState(!!value?.end)
  const kind = timed ? "datetime-local" : "date"
  const cut = (s?: string) => (s ? (timed ? s.slice(0, 16) : s.slice(0, 10)) : "")
  const set = (patch: Partial<DateValue>) => {
    const next = { ...(value ?? { start: toDateStr(Date.now()) }), ...patch }
    if (!end) delete next.end
    onChange(next.start ? next : null)
  }
  const setTimed = (t: boolean) => {
    if (!value) return
    const conv = (s: string) => (t ? (s.includes("T") ? s : `${s}T09:00`) : s.slice(0, 10))
    onChange({ start: conv(value.start), ...(value.end ? { end: conv(value.end) } : {}) })
  }
  return (
    <div className="space-y-2 text-sm">
      <Input type={kind} value={cut(value?.start)} onChange={(e) => e.target.value && set({ start: e.target.value })} className="h-8" aria-label="Start" />
      {end && <Input type={kind} value={cut(value?.end)} min={cut(value?.start)} onChange={(e) => set({ end: e.target.value || undefined })} className="h-8" aria-label="End" />}
      <label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={end} onChange={(e) => { setEnd(e.target.checked); if (!e.target.checked && value) onChange({ start: value.start }) }} /> End date</label>
      <label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={timed} disabled={!value} onChange={(e) => setTimed(e.target.checked)} /> Include time</label>
      {value && <Button variant="ghost" size="sm" className="h-7 w-full text-xs" onClick={() => onChange(null)}>Clear</Button>}
    </div>
  )
}

const TextEditor = ({ prop, initial, onDone }: { prop: Prop; initial: string; onDone: (v: string | null) => void }) => {
  const [v, setV] = useState(initial)
  const ref = useRef<HTMLInputElement>(null)
  useEffect(() => { ref.current?.focus(); ref.current?.select() }, [])
  const type = prop.type === "number" ? "number" : prop.type === "email" ? "email" : prop.type === "url" ? "url" : prop.type === "phone" ? "tel" : "text"
  return (
    <input
      ref={ref} type={type} value={v} step="any" onChange={(e) => setV(e.target.value)}
      onBlur={() => onDone(v)}
      onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); onDone(v) } else if (e.key === "Escape") onDone(null) }}
      className="h-full w-full bg-transparent px-2 text-sm outline-none ring-2 ring-brand/60"
    />
  )
}

const rawText = (prop: Prop, v: unknown) => (v === undefined || v === null ? "" : prop.type === "number" ? String(v) : String(v))

// One editable cell. `plain` strips the padding for use inside forms (the row page).
export const Cell = ({ prop, row, ctx, className, block }: { prop: Prop; row: Row; ctx: DbCtx; className?: string; block?: boolean }) => {
  const [editing, setEditing] = useState(false)
  const [open, setOpen] = useState(false)
  const raw = ctx.comp.valueOf(row, prop.id)
  const save = (value: unknown) => ctx.setCell(row._id, prop.id, value)
  const base = cn("flex min-h-8 w-full items-center px-2 py-1", block && "min-h-9 rounded-md hover:bg-cream-deep", className)

  const computed = ["formula", "rollup", "createdTime", "lastEdited", "createdBy"].includes(prop.type)
  if (computed) return <div className={cn(base, "cursor-default text-ink/80")}><CellValue prop={prop} row={row} ctx={ctx} /></div>

  if (prop.type === "checkbox") {
    return (
      <div className={base}>
        <button type="button" role="checkbox" aria-checked={raw === true} aria-label={prop.name} onClick={(e) => { e.stopPropagation(); void save(raw !== true) }}>
          <Box checked={raw === true} />
        </button>
      </div>
    )
  }

  if (["text", "number", "url", "email", "phone"].includes(prop.type)) {
    if (editing) {
      return (
        <div className={cn("h-8 w-full", block && "h-9")}>
          <TextEditor prop={prop} initial={rawText(prop, raw)} onDone={(v) => { setEditing(false); if (v !== null && v !== rawText(prop, raw)) void save(prop.type === "number" ? (v === "" ? null : Number(v)) : v === "" ? null : v) }} />
        </div>
      )
    }
    return (
      <div role="button" tabIndex={0} className={cn(base, "cursor-text")} onClick={() => setEditing(true)} onKeyDown={(e) => { if (e.key === "Enter") setEditing(true) }}>
        <CellValue prop={prop} row={row} ctx={ctx} />
      </div>
    )
  }

  const body = (() => {
    switch (prop.type) {
      case "select": case "status": case "multiSelect": {
        const val = prop.type === "multiSelect" ? ((raw as string[] | undefined) ?? []) : raw ? [raw as string] : []
        const multi = prop.type === "multiSelect"
        return <OptionPicker prop={prop} value={val} multi={multi} ctx={ctx} onChange={(ids) => { void save(multi ? (ids.length ? ids : null) : ids[0] ?? null); if (!multi) setOpen(false) }} />
      }
      case "person":
        return <ListPicker multi placeholder="Search people…" value={(raw as string[] | undefined) ?? []} items={ctx.members.map((m) => ({ id: m.id, label: m.name, image: m.image ?? "" }))} onChange={(ids) => void save(ids.length ? ids : null)} />
      case "relation": {
        const rel = prop.relation && ctx.related.get(prop.relation.databaseId)
        const many = prop.relation?.many !== false
        return <ListPicker multi={many} placeholder="Search rows…" value={(raw as string[] | undefined) ?? []} items={(rel?.rows ?? []).map((r) => ({ id: r._id, label: r.title }))} onChange={(ids) => { void save(ids.length ? ids : null); if (!many) setOpen(false) }} />
      }
      case "date":
        return <DateEditor value={raw as DateValue | undefined} onChange={(d) => void save(d)} />
      default: return null
    }
  })()

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <div role="button" tabIndex={0} className={cn(base, "cursor-pointer")}>
          <CellValue prop={prop} row={row} ctx={ctx} />
        </div>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-64 p-2">{body}</PopoverContent>
    </Popover>
  )
}

export const OPTION_COLORS: OptionColor[] = [...COLORS]
export const ColorDot = ({ color, className }: { color: OptionColor; className?: string }) => <span className={cn("inline-block size-2.5 rounded-full", DOT[color], className)} />
