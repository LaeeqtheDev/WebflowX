"use client"
import { useMemo, useRef, useState } from "react"
import { useMutation } from "convex/react"
import { Loader, Upload } from "lucide-react"
import { toast } from "sonner"
import { api } from "../../../convex/_generated/api"
import type { Id } from "../../../convex/_generated/dataModel"
import { COLORS, MAX_ROWS_PER_DB, newId, type Option, type Prop, type PropType } from "../../../convex/dbTypes"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { useLimitHandler } from "@/hooks/use-limit-handler"
import { parseCsv } from "./csv"
import { PROP_LABEL } from "./cells"
import { toDateStr } from "./engine"
import type { DbCtx } from "./ctx"

const TYPES: PropType[] = ["text", "number", "select", "date", "checkbox", "url", "email"]
const NUM = /^-?[$€£]?\s?-?\d[\d,]*(\.\d+)?%?$/
const DATE = /^(\d{4}-\d{1,2}-\d{1,2}([ T][\d:.]+Z?)?|\d{1,2}\/\d{1,2}\/\d{2,4})$/
const BOOL = /^(true|false|yes|no|checked|unchecked|x|1|0)$/i

const infer = (vals: string[]): PropType => {
  const v = vals.map((x) => x.trim()).filter(Boolean)
  if (!v.length) return "text"
  if (v.every((x) => NUM.test(x))) return "number"
  if (v.every((x) => DATE.test(x) && !Number.isNaN(Date.parse(x)))) return "date"
  if (v.every((x) => BOOL.test(x)) && v.some((x) => !/^[01]$/.test(x))) return "checkbox"
  if (v.every((x) => /^https?:\/\/\S+$/i.test(x))) return "url"
  if (v.every((x) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(x))) return "email"
  const distinct = new Set(v.map((x) => x.toLowerCase()))
  if (v.length >= 8 && distinct.size <= 10 && distinct.size <= v.length / 2 && v.every((x) => x.length <= 40)) return "select"
  return "text"
}

const toNumber = (s: string) => { const n = Number(s.replace(/[$€£,%\s]/g, "")); return Number.isFinite(n) ? (s.includes("%") ? n / 100 : n) : undefined }
const toDate = (s: string) => {
  const t = s.trim()
  if (!t) return undefined
  const ms = Date.parse(t)
  if (Number.isNaN(ms)) return undefined
  return /^\d{4}-\d{2}-\d{2}$/.test(t) ? { start: t } : { start: toDateStr(ms) }
}
const truthy = (s: string) => /^(true|yes|checked|x|1)$/i.test(s.trim())

type Target = string // "__skip" | "__title" | "__new" | property id

export const ImportDialog = ({ open, onOpenChange, ctx, existingRows }: { open: boolean; onOpenChange: (o: boolean) => void; ctx: DbCtx; existingRows: number }) => {
  const saveProperty = useMutation(api.databases.saveProperty)
  const importRows = useMutation(api.databases.importRows)
  const { handleLimitError } = useLimitHandler()
  const fileRef = useRef<HTMLInputElement>(null)
  const [data, setData] = useState<string[][] | null>(null)
  const [map, setMap] = useState<Target[]>([])
  const [types, setTypes] = useState<PropType[]>([])
  const [busy, setBusy] = useState<string | null>(null)

  const headers = data?.[0] ?? []
  const body = useMemo(() => data?.slice(1) ?? [], [data])
  const room = Math.max(0, MAX_ROWS_PER_DB - existingRows)
  const editable = ctx.props.filter((p) => ["text", "number", "select", "multiSelect", "status", "date", "checkbox", "url", "email", "phone"].includes(p.type))

  const reset = () => { setData(null); setMap([]); setTypes([]); setBusy(null) }

  const load = async (file: File) => {
    if (file.size > 8 * 1024 * 1024) return toast.error("That file is over 8 MB. Split it into smaller files.")
    const rows = parseCsv(await file.text())
    if (rows.length < 2) return toast.error("That file has no rows")
    const hs = rows[0].map((h) => h.trim())
    let titleSet = false
    const m: Target[] = hs.map((h) => {
      const low = h.toLowerCase()
      if (!titleSet && (low === "name" || low === "title")) { titleSet = true; return "__title" }
      const p = editable.find((x) => x.name.toLowerCase() === low)
      if (p) return p.id
      return ctx.canEditSchema && h ? "__new" : "__skip"
    })
    if (!titleSet) { const i = m.findIndex((x) => x === "__new" || x === "__skip"); if (i >= 0) m[i] = "__title"; else m[0] = "__title" }
    setData(rows); setMap(m)
    setTypes(hs.map((_, i) => infer(rows.slice(1, 400).map((r) => r[i] ?? ""))))
  }

  const run = async () => {
    if (!data) return
    setBusy("Preparing…")
    try {
      const docId = ctx.docId as Id<"docs">
      const taken = new Set(["name", ...ctx.props.map((p) => p.name.toLowerCase())])
      const colProp: (Prop | null)[] = []
      const optionMap = new Map<string, Map<string, string>>() // propId -> lower name -> option id

      for (let i = 0; i < headers.length; i++) {
        const t = map[i]
        if (t === "__new") {
          let name = headers[i] || `Column ${i + 1}`, n = 2
          while (taken.has(name.toLowerCase())) name = `${headers[i] || "Column"} (${n++})`
          taken.add(name.toLowerCase())
          const prop: Prop = { id: newId(), name: name.slice(0, 60), type: types[i] }
          if (prop.type === "number") prop.numberFormat = "number"
          if (prop.type === "select") {
            const names = [...new Set(body.map((r) => (r[i] ?? "").trim()).filter(Boolean))].slice(0, 60)
            prop.options = names.map((nm, k): Option => ({ id: newId(), name: nm.slice(0, 40), color: COLORS[k % COLORS.length] }))
          }
          setBusy(`Adding property “${prop.name}”…`)
          await saveProperty({ docId, property: prop })
          colProp[i] = prop
        } else if (t !== "__skip" && t !== "__title") {
          const p = ctx.props.find((x) => x.id === t) ?? null
          colProp[i] = p
          if (p && (p.type === "select" || p.type === "status" || p.type === "multiSelect") && ctx.canEditSchema) {
            const have = new Set((p.options ?? []).map((o) => o.name.toLowerCase()))
            const names = new Set<string>()
            for (const r of body) for (const part of p.type === "multiSelect" ? (r[i] ?? "").split(",") : [r[i] ?? ""]) { const s = part.trim(); if (s && !have.has(s.toLowerCase())) names.add(s.slice(0, 40)) }
            const extra = [...names].slice(0, Math.max(0, 60 - (p.options?.length ?? 0)))
            if (extra.length) {
              const opts: Option[] = [...(p.options ?? []), ...extra.map((nm, k): Option => ({ id: newId(), name: nm, color: COLORS[((p.options?.length ?? 0) + k) % COLORS.length], ...(p.type === "status" ? { group: "todo" as const } : {}) }))]
              await saveProperty({ docId, property: { ...p, options: opts } })
              colProp[i] = { ...p, options: opts }
            }
          }
        } else colProp[i] = null
        const cp = colProp[i]
        if (cp?.options) optionMap.set(cp.id, new Map(cp.options.map((o) => [o.name.toLowerCase(), o.id])))
      }

      const titleCol = map.indexOf("__title")
      const out = body.slice(0, room).map((r) => {
        const values: Record<string, unknown> = {}
        colProp.forEach((p, i) => {
          const s = (r[i] ?? "").trim()
          if (!p || !s) return
          switch (p.type) {
            case "number": { const n = toNumber(s); if (n !== undefined) values[p.id] = n; break }
            case "date": { const d = toDate(s); if (d) values[p.id] = d; break }
            case "checkbox": if (truthy(s)) values[p.id] = true; break
            case "select": case "status": { const id = optionMap.get(p.id)?.get(s.toLowerCase()); if (id) values[p.id] = id; break }
            case "multiSelect": { const ids = s.split(",").map((x) => optionMap.get(p.id)?.get(x.trim().toLowerCase())).filter(Boolean); if (ids.length) values[p.id] = ids; break }
            default: values[p.id] = s
          }
        })
        return { title: (titleCol >= 0 ? r[titleCol] ?? "" : "").trim().slice(0, 200), values }
      })

      let done = 0
      for (let i = 0; i < out.length; i += 200) {
        setBusy(`Importing rows… ${done} of ${out.length}`)
        await importRows({ docId, rows: out.slice(i, i + 200) })
        done += Math.min(200, out.length - i)
      }
      toast.success(`Imported ${done} ${done === 1 ? "row" : "rows"}${body.length > room ? ` (${body.length - room} skipped: row limit)` : ""}`)
      onOpenChange(false); reset()
    } catch (e) {
      if (handleLimitError(e, "The import stopped part-way. Rows added so far are kept.")) onOpenChange(false)
      setBusy(null)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!busy) { onOpenChange(o); if (!o) reset() } }}>
      <DialogContent className="max-h-[88dvh] max-w-xl overflow-y-auto rounded-2xl border-plum/12">
        <DialogHeader>
          <DialogTitle>Import CSV</DialogTitle>
          <DialogDescription>Rows are added to this database. Nothing existing is changed.</DialogDescription>
        </DialogHeader>
        {!data ? (
          <button type="button" onClick={() => fileRef.current?.click()} className="flex h-36 w-full flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-plum/20 text-sm text-ink/70 hover:border-brand/50">
            <Upload className="size-5" /> Choose a .csv file
            <input ref={fileRef} type="file" accept=".csv,text/csv" hidden onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ""; if (f) void load(f) }} />
          </button>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-ink/70">{body.length} {body.length === 1 ? "row" : "rows"} found{body.length > room ? ` · only ${room} fit in this database` : ""}. Choose where each column goes.</p>
            <div className="max-h-72 space-y-2 overflow-y-auto pr-1">
              {headers.map((h, i) => (
                <div key={i} className="grid grid-cols-[1fr_1fr] items-center gap-2 sm:grid-cols-[1fr_1fr_6.5rem]">
                  <div className="min-w-0"><p className="truncate text-sm font-medium">{h || `Column ${i + 1}`}</p><p className="truncate text-xs text-ink/60">{body[0]?.[i] ?? ""}</p></div>
                  <select aria-label={`Destination for ${h}`} value={map[i]} onChange={(e) => setMap((m) => m.map((x, j) => (j === i ? e.target.value : e.target.value === "__title" && x === "__title" ? "__skip" : x)))} className="h-9 rounded-md border border-input bg-transparent px-2 text-sm">
                    <option value="__skip">Skip</option>
                    <option value="__title">Name</option>
                    {ctx.canEditSchema && <option value="__new">New property</option>}
                    {editable.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                  {map[i] === "__new" ? (
                    <select aria-label={`Type for ${h}`} value={types[i]} onChange={(e) => setTypes((t) => t.map((x, j) => (j === i ? (e.target.value as PropType) : x)))} className="col-span-2 h-9 rounded-md border border-input bg-transparent px-2 text-sm sm:col-span-1">
                      {TYPES.map((t) => <option key={t} value={t}>{PROP_LABEL[t]}</option>)}
                    </select>
                  ) : <span className="hidden sm:block" />}
                </div>
              ))}
            </div>
          </div>
        )}
        <DialogFooter>
          <Button type="button" variant="outline" disabled={!!busy} onClick={() => { onOpenChange(false); reset() }}>Cancel</Button>
          {data && <Button type="button" disabled={!!busy || room === 0 || !map.includes("__title")} onClick={run} className="bg-brand text-white hover:bg-brand-hover">{busy ? <><Loader className="mr-1 size-4 animate-spin" />{busy}</> : `Import ${Math.min(body.length, room)} rows`}</Button>}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
