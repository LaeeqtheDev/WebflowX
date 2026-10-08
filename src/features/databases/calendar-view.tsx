"use client"
import { useMemo, useState } from "react"
import { ChevronLeft, ChevronRight, Plus } from "lucide-react"
import type { DateValue } from "../../../convex/dbTypes"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { parseDateMs, startOfDay, toDateStr, type Row } from "./engine"
import type { ViewProps } from "./shared"

const DAY = 86_400_000

export const CalendarView = ({ view, rows, ctx, onView, onAdd }: ViewProps) => {
  const dateProps = ctx.props.filter((p) => p.type === "date")
  const dateProp = ctx.props.find((p) => p.id === view.dateProp && p.type === "date") ?? dateProps[0]
  const [cursor, setCursor] = useState(() => { const d = new Date(); d.setDate(1); d.setHours(0, 0, 0, 0); return d.getTime() })
  const [today] = useState(() => startOfDay(Date.now()))
  const [drag, setDrag] = useState<string | null>(null)
  const [over, setOver] = useState<number | null>(null)

  const days = useMemo(() => {
    const first = new Date(cursor)
    const lead = (first.getDay() + 6) % 7 // weeks start on Monday
    const start = new Date(first.getFullYear(), first.getMonth(), 1 - lead).getTime()
    const lastDay = new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate()
    const n = Math.ceil((lead + lastDay) / 7) * 7
    return Array.from({ length: n }, (_, i) => new Date(new Date(start).getFullYear(), new Date(start).getMonth(), new Date(start).getDate() + i).getTime())
  }, [cursor])

  if (!dateProp) {
    return <div className="flex h-full items-center justify-center p-6 text-center text-sm text-ink/60">A calendar needs a Date property. {ctx.canEditSchema ? "Add one with the + button in the table view." : "Ask an admin to add one."}</div>
  }

  const span = (r: Row): [number, number] | null => {
    const v = ctx.comp.valueOf(r, dateProp.id) as DateValue | undefined
    if (!v?.start) return null
    const s = startOfDay(parseDateMs(v.start))
    const e = v.end ? Math.max(s, startOfDay(parseDateMs(v.end))) : s
    return Number.isFinite(s) ? [s, e] : null
  }

  const byDay = new Map<number, Row[]>()
  let undated = 0
  for (const r of rows) {
    const sp = span(r)
    if (!sp) { undated++; continue }
    for (let d = sp[0], i = 0; d <= sp[1] && i < 62; d += DAY, i++) {
      const key = startOfDay(d)
      const a = byDay.get(key); if (a) a.push(r); else byDay.set(key, [r])
    }
  }

  const moveTo = (rowId: string, day: number) => {
    const r = rows.find((x) => x._id === rowId)
    const sp = r && span(r)
    if (!r || !sp) return
    const old = r.values[dateProp.id] as DateValue
    const delta = Math.round((day - sp[0]) / DAY)
    if (!delta) return
    const shift = (s: string) => {
      const ms = parseDateMs(s) + delta * DAY
      const d = new Date(ms)
      if (!s.includes("T")) return toDateStr(ms)
      const p = (n: number) => String(n).padStart(2, "0")
      return `${toDateStr(ms)}T${p(d.getHours())}:${p(d.getMinutes())}`
    }
    void ctx.setCell(rowId, dateProp.id, { start: shift(old.start), ...(old.end ? { end: shift(old.end) } : {}) })
  }

  const add = (day: number) => onAdd({ [dateProp.id]: { start: toDateStr(day) } })

  const month = new Date(cursor).toLocaleDateString(undefined, { month: "long", year: "numeric" })
  const step = (n: number) => setCursor((c) => { const d = new Date(c); d.setMonth(d.getMonth() + n); return d.getTime() })

  return (
    <div className="flex h-full flex-col">
      <div className="flex flex-wrap items-center gap-2 border-b border-plum/12 px-4 py-2">
        <Button variant="outline" size="icon" className="size-8" aria-label="Previous month" onClick={() => step(-1)}><ChevronLeft className="size-4" /></Button>
        <Button variant="outline" size="icon" className="size-8" aria-label="Next month" onClick={() => step(1)}><ChevronRight className="size-4" /></Button>
        <Button variant="outline" size="sm" className="h-8" onClick={() => { const d = new Date(); d.setDate(1); d.setHours(0, 0, 0, 0); setCursor(d.getTime()) }}>Today</Button>
        <h3 className="text-sm font-semibold">{month}</h3>
        {dateProps.length > 1 && (
          <select aria-label="Date property" value={dateProp.id} onChange={(e) => onView({ ...view, dateProp: e.target.value })} className="ml-auto h-8 rounded-md border border-input bg-transparent px-2 text-xs">
            {dateProps.map((p) => <option key={p.id} value={p.id}>By {p.name}</option>)}
          </select>
        )}
      </div>
      <div className="flex-1 overflow-auto">
        <div className="grid min-w-[44rem] grid-cols-7 border-b border-plum/12 text-center text-[11px] font-medium uppercase tracking-wide text-ink/50">
          {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => <div key={d} className="py-1.5">{d}</div>)}
        </div>
        <div className="grid min-w-[44rem] grid-cols-7" style={{ gridAutoRows: "minmax(6.5rem, 1fr)" }}>
          {days.map((d) => {
            const inMonth = new Date(d).getMonth() === new Date(cursor).getMonth()
            const list = byDay.get(d) ?? []
            return (
              <div key={d}
                onDragOver={(e) => { if (drag) { e.preventDefault(); setOver(d) } }}
                onDrop={(e) => { e.preventDefault(); if (drag) moveTo(drag, d); setDrag(null); setOver(null) }}
                className={cn("group/day min-w-0 border-b border-r border-plum/10 p-1", !inMonth && "bg-cream-soft/60", over === d && "bg-[#ff5018]/10")}>
                <div className="flex items-center justify-between px-0.5">
                  <span className={cn("flex size-6 items-center justify-center rounded-full text-xs", d === today ? "bg-[#ff5018] font-semibold text-white" : inMonth ? "text-ink" : "text-ink/40")}>{new Date(d).getDate()}</span>
                  <button type="button" aria-label={`Add on ${toDateStr(d)}`} onClick={() => add(d)} className="rounded p-0.5 text-ink/40 opacity-0 hover:bg-cream-deep hover:text-ink focus-visible:opacity-100 group-hover/day:opacity-100 max-md:opacity-60"><Plus className="size-3.5" /></button>
                </div>
                <div className="mt-0.5 space-y-0.5">
                  {list.slice(0, 4).map((r) => (
                    <button key={r._id} type="button" draggable onDragStart={() => setDrag(r._id)} onDragEnd={() => { setDrag(null); setOver(null) }} onClick={() => ctx.openRow(r._id)}
                      className="block w-full truncate rounded bg-[#ff5018]/12 px-1.5 py-0.5 text-left text-xs text-ink hover:bg-[#ff5018]/25">{r.title || "Untitled"}</button>
                  ))}
                  {list.length > 4 && <p className="px-1 text-[11px] text-ink/50">+{list.length - 4} more</p>}
                </div>
              </div>
            )
          })}
        </div>
      </div>
      {undated > 0 && <div className="border-t border-plum/12 px-4 py-1.5 text-xs text-ink/55">{undated} {undated === 1 ? "row has" : "rows have"} no date and {undated === 1 ? "isn't" : "aren't"} shown.</div>}
    </div>
  )
}
