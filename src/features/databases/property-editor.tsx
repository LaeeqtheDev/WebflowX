"use client"
import { useEffect, useState } from "react"
import { useMutation, useQuery } from "convex/react"
import { Plus, Trash2, Loader } from "lucide-react"
import { toast } from "sonner"
import { api } from "../../../convex/_generated/api"
import type { Id } from "../../../convex/_generated/dataModel"
import { COLORS, PROP_TYPES, ROLLUP_FNS, newId, type Option, type OptionColor, type Prop, type PropType, type RollupFn, type StatusGroup } from "../../../convex/dbTypes"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { friendlyError, useLimitHandler } from "@/hooks/use-limit-handler"
import { DOT } from "./colors"
import { PROP_LABEL } from "./cells"
import { FORMULA_FUNCTIONS } from "./formula"
import { TITLE } from "./engine"
import type { DbCtx } from "./ctx"

const sel = "h-9 w-full rounded-md border border-input bg-transparent px-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-brand/50"

const ROLLUP_LABEL: Record<RollupFn, string> = {
  count: "Count all", countValues: "Count values", countUnique: "Count unique", countEmpty: "Count empty",
  percentEmpty: "Percent empty", percentNotEmpty: "Percent filled", sum: "Sum", average: "Average", median: "Median",
  min: "Min", max: "Max", range: "Range", earliest: "Earliest date", latest: "Latest date",
  checked: "Checked", unchecked: "Unchecked", percentChecked: "Percent checked", showOriginal: "Show original",
}

const GROUP_LABEL: Record<StatusGroup, string> = { todo: "To do", progress: "In progress", done: "Complete" }

const defaultStatus = (): Option[] => [
  { id: newId(), name: "Not started", color: "gray", group: "todo" },
  { id: newId(), name: "In progress", color: "blue", group: "progress" },
  { id: newId(), name: "Done", color: "green", group: "done" },
]

const OptionsEditor = ({ status, options, onChange }: { status: boolean; options: Option[]; onChange: (o: Option[]) => void }) => {
  const upd = (id: string, patch: Partial<Option>) => onChange(options.map((o) => (o.id === id ? { ...o, ...patch } : o)))
  return (
    <div className="space-y-1.5">
      {options.map((o) => (
        <div key={o.id} className="flex items-center gap-1.5">
          <select aria-label="Colour" value={o.color} onChange={(e) => upd(o.id, { color: e.target.value as OptionColor })} className="h-9 w-24 rounded-md border border-input bg-transparent px-1.5 text-xs">
            {COLORS.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <span className={`size-2.5 shrink-0 rounded-full ${DOT[o.color]}`} aria-hidden />
          <Input value={o.name} maxLength={40} onChange={(e) => upd(o.id, { name: e.target.value })} className="h-9 min-w-0 flex-1" aria-label="Option name" />
          {status && (
            <select aria-label="Group" value={o.group ?? "todo"} onChange={(e) => upd(o.id, { group: e.target.value as StatusGroup })} className="h-9 w-28 rounded-md border border-input bg-transparent px-1.5 text-xs">
              {(Object.keys(GROUP_LABEL) as StatusGroup[]).map((g) => <option key={g} value={g}>{GROUP_LABEL[g]}</option>)}
            </select>
          )}
          <Button type="button" variant="ghost" size="icon" className="size-8 shrink-0" aria-label="Remove option" onClick={() => onChange(options.filter((x) => x.id !== o.id))}><Trash2 className="size-3.5" /></Button>
        </div>
      ))}
      <Button type="button" variant="outline" size="sm" className="h-8" onClick={() => onChange([...options, { id: newId(), name: "", color: COLORS[options.length % COLORS.length], ...(status ? { group: "todo" as StatusGroup } : {}) }])}>
        <Plus className="mr-1 size-3.5" /> Add option
      </Button>
    </div>
  )
}

export const PropertyDialog = ({ open, onOpenChange, ctx, propId }: { open: boolean; onOpenChange: (o: boolean) => void; ctx: DbCtx; propId: string | "new" | null }) => {
  const save = useMutation(api.databases.saveProperty)
  const remove = useMutation(api.databases.deleteProperty)
  const { handleLimitError } = useLimitHandler()
  const existing = propId && propId !== "new" ? ctx.props.find((p) => p.id === propId) : undefined
  const [draft, setDraft] = useState<Prop>({ id: newId(), name: "", type: "text" })
  const [busy, setBusy] = useState(false)
  const [confirmDel, setConfirmDel] = useState(false)

  useEffect(() => {
    if (!open) return
    setConfirmDel(false)
    setDraft(existing ? structuredClone(existing) : { id: newId(), name: "", type: "text" })
  }, [open, existing, propId])

  const relProp = draft.type === "rollup" ? ctx.props.find((p) => p.id === draft.rollup?.relationId && p.type === "relation") : undefined
  const targetDb = relProp?.relation?.databaseId
  const targetProps = useQuery(api.databases.propertiesOf, targetDb ? { docId: targetDb as Id<"docs"> } : "skip")
  const relations = ctx.props.filter((p) => p.type === "relation" && p.id !== draft.id)

  const setType = (type: PropType) => {
    setDraft((d) => {
      const n: Prop = { id: d.id, name: d.name, type }
      if (type === "select" || type === "multiSelect") n.options = d.options ?? []
      if (type === "status") n.options = d.options?.length ? d.options : defaultStatus()
      if (type === "number") n.numberFormat = d.numberFormat ?? "number"
      if (type === "relation") n.relation = d.relation ?? { databaseId: ctx.databases.find((x) => x._id !== ctx.docId)?._id ?? ctx.docId, many: true }
      if (type === "rollup") n.rollup = d.rollup ?? { relationId: relations[0]?.id ?? "", targetId: "title", fn: "count" }
      if (type === "formula") n.formula = d.formula ?? ""
      return n
    })
  }

  const submit = async () => {
    const name = draft.name.trim()
    if (!name) return toast.error("Give the property a name")
    if ((draft.type === "select" || draft.type === "multiSelect" || draft.type === "status") && (draft.options ?? []).some((o) => !o.name.trim())) return toast.error("Every option needs a name")
    setBusy(true)
    try {
      await save({ docId: ctx.docId as Id<"docs">, property: { ...draft, name } })
      onOpenChange(false)
    } catch (e) {
      if (!handleLimitError(e, "Couldn't save the property")) { /* toast shown by handler */ }
      else onOpenChange(false)
    } finally { setBusy(false) }
  }

  const del = async () => {
    if (!existing) return
    setBusy(true)
    try { await remove({ docId: ctx.docId as Id<"docs">, propId: existing.id }); onOpenChange(false) }
    catch (e) { toast.error(friendlyError(e, "Couldn't delete the property")) }
    finally { setBusy(false) }
  }

  const insertFn = (fn: string) => setDraft((d) => ({ ...d, formula: `${d.formula ?? ""}${fn}(` }))

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[88dvh] max-w-lg overflow-y-auto rounded-2xl border-plum/12">
        <DialogHeader>
          <DialogTitle>{existing ? "Edit property" : "New property"}</DialogTitle>
          <DialogDescription className="sr-only">Name, type and settings</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="prop-name">Name</Label>
            <Input id="prop-name" autoFocus value={draft.name} maxLength={60} onChange={(e) => setDraft({ ...draft, name: e.target.value })} placeholder="Property name" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="prop-type">Type</Label>
            <select id="prop-type" className={sel} value={draft.type} onChange={(e) => setType(e.target.value as PropType)}>
              {PROP_TYPES.map((t) => <option key={t} value={t}>{PROP_LABEL[t]}</option>)}
            </select>
            {existing && existing.type !== draft.type && <p className="text-xs text-ink/60">Existing values are converted where that makes sense, and cleared otherwise.</p>}
          </div>

          {(draft.type === "select" || draft.type === "multiSelect" || draft.type === "status") && (
            <div className="space-y-1.5">
              <Label>Options</Label>
              <OptionsEditor status={draft.type === "status"} options={draft.options ?? []} onChange={(options) => setDraft({ ...draft, options })} />
            </div>
          )}

          {draft.type === "number" && (
            <div className="space-y-1.5">
              <Label htmlFor="prop-fmt">Format</Label>
              <select id="prop-fmt" className={sel} value={draft.numberFormat ?? "number"} onChange={(e) => setDraft({ ...draft, numberFormat: e.target.value as Prop["numberFormat"] })}>
                <option value="number">Number</option><option value="percent">Percent</option><option value="usd">US dollar</option><option value="eur">Euro</option><option value="gbp">Pound</option>
              </select>
            </div>
          )}

          {draft.type === "relation" && (
            <div className="space-y-2">
              <Label htmlFor="prop-rel">Related database</Label>
              <select id="prop-rel" className={sel} value={draft.relation?.databaseId ?? ""} onChange={(e) => setDraft({ ...draft, relation: { databaseId: e.target.value, many: draft.relation?.many ?? true } })}>
                {ctx.databases.map((d) => <option key={d._id} value={d._id}>{d.icon ?? "🗃️"} {d.title || "Untitled"}{d._id === ctx.docId ? " (this one)" : ""}</option>)}
              </select>
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={draft.relation?.many !== false} onChange={(e) => setDraft({ ...draft, relation: { databaseId: draft.relation?.databaseId ?? ctx.docId, many: e.target.checked } })} /> Allow linking several rows</label>
            </div>
          )}

          {draft.type === "rollup" && (
            <div className="space-y-3">
              {relations.length === 0 ? (
                <p className="rounded-lg bg-cream-deep p-3 text-sm text-ink/70">A rollup works through a relation. Add a relation property first.</p>
              ) : (
                <>
                  <div className="space-y-1.5">
                    <Label htmlFor="ru-rel">Relation</Label>
                    <select id="ru-rel" className={sel} value={draft.rollup?.relationId ?? ""} onChange={(e) => setDraft({ ...draft, rollup: { relationId: e.target.value, targetId: "title", fn: draft.rollup?.fn ?? "count" } })}>
                      {relations.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="ru-prop">Property</Label>
                    <select id="ru-prop" className={sel} value={draft.rollup?.targetId ?? "title"} onChange={(e) => setDraft({ ...draft, rollup: { ...(draft.rollup as NonNullable<Prop["rollup"]>), targetId: e.target.value } })}>
                      <option value={TITLE.id}>Name</option>
                      {(targetProps ?? []).map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="ru-fn">Calculate</Label>
                    <select id="ru-fn" className={sel} value={draft.rollup?.fn ?? "count"} onChange={(e) => setDraft({ ...draft, rollup: { ...(draft.rollup as NonNullable<Prop["rollup"]>), fn: e.target.value as RollupFn } })}>
                      {ROLLUP_FNS.map((f) => <option key={f} value={f}>{ROLLUP_LABEL[f]}</option>)}
                    </select>
                  </div>
                </>
              )}
            </div>
          )}

          {draft.type === "formula" && (
            <div className="space-y-2">
              <Label htmlFor="prop-formula">Formula</Label>
              <Textarea id="prop-formula" rows={4} value={draft.formula ?? ""} onChange={(e) => setDraft({ ...draft, formula: e.target.value })} className="font-mono text-sm" placeholder={'if(prop("Done"), "✅", dateBetween(prop("Due"), now(), "days"))'} />
              <p className="text-xs text-ink/60">Refer to another property with <code className="rounded bg-cream-deep px-1">prop(&quot;Name&quot;)</code>.</p>
              <div className="flex max-h-24 flex-wrap gap-1 overflow-y-auto">
                {FORMULA_FUNCTIONS.map((f) => <button key={f} type="button" onClick={() => insertFn(f)} className="rounded bg-cream-deep px-1.5 py-0.5 font-mono text-[11px] hover:bg-brand/15">{f}</button>)}
              </div>
            </div>
          )}
        </div>
        <DialogFooter className="gap-2 sm:justify-between">
          {existing ? (
            confirmDel ? (
              <Button type="button" variant="destructive" disabled={busy} onClick={del}>Yes, delete property</Button>
            ) : (
              <Button type="button" variant="ghost" className="text-destructive" onClick={() => setConfirmDel(true)}><Trash2 className="mr-1 size-4" />Delete</Button>
            )
          ) : <span />}
          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="button" disabled={busy} onClick={submit} className="bg-brand text-white hover:bg-brand-hover">{busy && <Loader className="mr-1 size-4 animate-spin" />}{existing ? "Save" : "Add property"}</Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
