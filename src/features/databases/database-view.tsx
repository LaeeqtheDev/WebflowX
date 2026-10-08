"use client"
import { useCallback, useMemo, useState } from "react"
import { useMutation, useQuery, useQueries } from "convex/react"
import { CalendarDays, Columns3, Copy, Download, LayoutGrid, List as ListIcon, Loader, MoreHorizontal, Pencil, Plus, Search, Table2, Trash2, Upload } from "lucide-react"
import { toast } from "sonner"
import { api } from "../../../convex/_generated/api"
import type { Id } from "../../../convex/_generated/dataModel"
import { COLORS, newId, type Option, type Prop, type View, type ViewType } from "../../../convex/dbTypes"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { useWorkspaceId } from "@/hooks/use-workspace-id"
import { friendlyError, useLimitHandler } from "@/hooks/use-limit-handler"
import { useGetMembers } from "@/features/members/api/use-get-members"
import { useCurrentMember } from "@/features/members/api/use-current-member"
import { cn } from "@/lib/utils"
import { applyFilter, applySorts, makeComputer, type Env, type MemberLite, type Related, type Row } from "./engine"
import type { DbCtx } from "./ctx"
import { PropertyDialog } from "./property-editor"
import { FilterControl, GroupControl, PropertiesControl, SortControl } from "./view-controls"
import { TableView } from "./table-view"
import { BoardView } from "./board-view"
import { GalleryView, ListView } from "./list-gallery"
import { CalendarView } from "./calendar-view"
import { RowPeek } from "./row-peek"
import { ImportDialog } from "./import-dialog"
import { toCsv } from "./csv"

const NO_ROWS: Row[] = []
const USER_COLORS = ["#ff5018", "#3b82f6", "#10b981", "#f59e0b", "#8b5cf6", "#ef4444", "#06b6d4", "#ec4899"]

const VIEW_META: Record<ViewType, { label: string; icon: React.ComponentType<{ className?: string }> }> = {
  table: { label: "Table", icon: Table2 },
  board: { label: "Board", icon: Columns3 },
  list: { label: "List", icon: ListIcon },
  gallery: { label: "Gallery", icon: LayoutGrid },
  calendar: { label: "Calendar", icon: CalendarDays },
}

const blankView = (type: ViewType, props: Prop[], name?: string): View => ({
  id: newId(), name: name ?? VIEW_META[type].label, type, filter: { match: "and", conditions: [] }, sorts: [], hidden: [], order: [], widths: {},
  ...(type === "board" ? { groupBy: props.find((p) => p.type === "status")?.id ?? props.find((p) => p.type === "select")?.id } : {}),
  ...(type === "calendar" ? { dateProp: props.find((p) => p.type === "date")?.id } : {}),
})

const relationTargets = (props: Prop[], exclude: string[]) =>
  [...new Set(props.flatMap((p) => (p.type === "relation" && p.relation && !exclude.includes(p.relation.databaseId) ? [p.relation.databaseId] : [])))]

type Stage = Record<string, unknown>

// Databases referenced by the relations of the databases loaded in `res`.
const nextHop = (ids: string[], res: Stage, seen: string[]) => {
  const out = new Set<string>()
  for (const id of ids) {
    const c = res[`c:${id}`] as { properties: Prop[] } | null | undefined | Error
    if (c && !(c instanceof Error)) for (const t of relationTargets(c.properties, seen)) out.add(t)
  }
  return [...out]
}

const useRelatedStage = (ids: string[]): Stage => {
  const queries = useMemo(() => {
    const q: Record<string, { query: typeof api.databases.config | typeof api.databases.rows; args: { docId: Id<"docs"> } }> = {}
    for (const id of ids) {
      q[`c:${id}`] = { query: api.databases.config, args: { docId: id as Id<"docs"> } }
      q[`r:${id}`] = { query: api.databases.rows, args: { docId: id as Id<"docs"> } }
    }
    return q
  }, [ids])
  return useQueries(queries as Parameters<typeof useQueries>[0]) as Stage
}

const peekFromUrl = () => (typeof window === "undefined" ? null : new URLSearchParams(window.location.search).get("row"))
const setPeekUrl = (id: string | null) => {
  const u = new URL(window.location.href)
  if (id) u.searchParams.set("row", id); else u.searchParams.delete("row")
  window.history.replaceState(null, "", u.toString())
}

export const DatabaseView = ({ docId }: { docId: Id<"docs"> }) => {
  const workspaceId = useWorkspaceId()
  const { handleLimitError } = useLimitHandler()
  const config = useQuery(api.databases.config, { docId })
  const rowsRaw = useQuery(api.databases.rows, { docId })
  const databases = useQuery(api.databases.list, { workspaceId })
  const { data: members } = useGetMembers({ workspaceId })
  const { data: current } = useCurrentMember({ workspaceId })

  const saveView = useMutation(api.databases.saveView)
  const deleteView = useMutation(api.databases.deleteView)
  const saveProperty = useMutation(api.databases.saveProperty)
  const addRowM = useMutation(api.databases.addRow)
  const setCellM = useMutation(api.databases.setCell)
  const setTitleM = useMutation(api.databases.setTitle)
  const moveRowM = useMutation(api.databases.moveRow)

  const [activeId, setActiveId] = useState<string | null>(null)
  const [pending, setPending] = useState<{ src: unknown; map: Record<string, View> }>({ src: undefined, map: {} })
  const [search, setSearch] = useState("")
  const [peekId, setPeekId] = useState<string | null>(peekFromUrl)
  const [propDlg, setPropDlg] = useState<string | null>(null)
  const [importOpen, setImportOpen] = useState(false)
  const [renaming, setRenaming] = useState<View | null>(null)
  const [renameText, setRenameText] = useState("")

  // optimistic view edits last until the server's copy of the views changes
  const local = pending.src === config?.views ? pending.map : {}

  const props = useMemo(() => config?.properties ?? [], [config?.properties])
  const views: View[] = useMemo(() => {
    const v = (config?.views ?? []) as View[]
    return v.length ? v : [blankView("table", props, "Table")]
  }, [config?.views, props])
  const baseView = views.find((v) => v.id === activeId) ?? views[0]
  const view: View = local[baseView.id] ?? baseView

  // other databases that relations (and so rollups) point at, up to three hops away
  const ids1 = useMemo(() => relationTargets(props, []), [props])
  const r1 = useRelatedStage(ids1)
  const ids2 = useMemo(() => nextHop(ids1, r1, [...ids1]), [ids1, r1])
  const r2 = useRelatedStage(ids2)
  const ids3 = useMemo(() => nextHop(ids2, r2, [...ids1, ...ids2]), [ids1, ids2, r2])
  const r3 = useRelatedStage(ids3)

  const memberList: MemberLite[] = useMemo(() => (members ?? []).map((m) => ({ id: m._id, name: m.user.name ?? "Member", image: m.user.image ?? undefined })), [members])
  const rows = (rowsRaw ?? NO_ROWS) as Row[]

  const related = useMemo(() => {
    const map = new Map<string, Related>()
    for (const [ids, res] of [[ids1, r1], [ids2, r2], [ids3, r3]] as const) {
      for (const id of ids) {
        const c = res[`c:${id}`] as { properties: Prop[] } | null | undefined | Error
        const r = res[`r:${id}`] as Row[] | undefined | Error
        if (c && !(c instanceof Error) && r && !(r instanceof Error) && !map.has(id)) map.set(id, { props: c.properties, rows: r })
      }
    }
    return map
  }, [ids1, ids2, ids3, r1, r2, r3])

  const env: Env = useMemo(() => ({ props, members: new Map(memberList.map((m) => [m.id, m])), related }), [props, memberList, related])
  const comp = useMemo(() => makeComputer(env), [env])

  const me = useMemo(() => {
    const id = current?._id ?? ""
    const m = memberList.find((x) => x.id === id)
    return { id, name: m?.name ?? "Anonymous", image: m?.image, color: USER_COLORS[Math.abs(id.split("").reduce((a, c) => a + c.charCodeAt(0), 0)) % USER_COLORS.length] }
  }, [current?._id, memberList])

  const guard = useCallback(async <T,>(fn: () => Promise<T>, fallback: string): Promise<T | undefined> => {
    try { return await fn() } catch (e) {
      if (!handleLimitError(e, friendlyError(e, fallback))) { /* handler already toasted */ }
      return undefined
    }
  }, [handleLimitError])

  const updateView = useCallback((v: View) => {
    setPending((p) => ({ src: config?.views, map: { ...(p.src === config?.views ? p.map : {}), [v.id]: v } }))
    void guard(() => saveView({ docId, view: v }), "Couldn't update the view")
  }, [docId, guard, saveView, config?.views])

  const openRow = useCallback((id: string | null) => { setPeekId(id); setPeekUrl(id) }, [])

  const ctx: DbCtx | null = useMemo(() => {
    if (!config) return null
    return {
      docId, workspaceId, props, env, comp, members: memberList, related,
      databases: (databases ?? []) as DbCtx["databases"], canEditSchema: config.canEditSchema, me,
      setCell: async (rowId, propId, value) => { await guard(() => setCellM({ rowId: rowId as Id<"dbRows">, propId, value }), "Couldn't save that change") },
      setTitle: async (rowId, title) => { await guard(() => setTitleM({ rowId: rowId as Id<"dbRows">, title }), "Couldn't rename the row") },
      addOption: async (prop, name) => {
        const opt: Option = { id: newId(), name: name.slice(0, 40), color: COLORS[(prop.options?.length ?? 0) % COLORS.length], ...(prop.type === "status" ? { group: "todo" as const } : {}) }
        const ok = await guard(() => saveProperty({ docId, property: { ...prop, options: [...(prop.options ?? []), opt] } }), "Couldn't add that option")
        return ok ? opt : null
      },
      openRow: (id) => openRow(id),
      editProp: (id) => setPropDlg(id),
    }
  }, [config, docId, workspaceId, props, env, comp, memberList, related, databases, me, guard, setCellM, setTitleM, saveProperty, openRow])

  const shown = useMemo(() => {
    if (!ctx) return []
    let list = applyFilter(rows, view, env, comp)
    const q = search.trim().toLowerCase()
    if (q) list = list.filter((r) => r.title.toLowerCase().includes(q) || props.some((p) => comp.display(r, p).toLowerCase().includes(q)))
    return applySorts(list, view, env, comp)
  }, [ctx, rows, view, env, comp, search, props])

  if (config === undefined || rowsRaw === undefined) return <div className="flex h-full items-center justify-center"><Loader className="size-5 animate-spin text-[#ff5018]" /></div>
  if (!config || !ctx) return <div className="flex h-full items-center justify-center p-6 text-sm text-ink/60">This database isn&apos;t available to you.</div>

  const addRow = async (values?: Record<string, unknown>, afterPosition?: number) => {
    const id = await guard(() => addRowM({ docId, values, position: afterPosition }), "Couldn't add a row")
    if (id) openRow(id as string)
  }
  const onMove = (rowId: string, position: number, values?: Record<string, unknown>) => {
    void guard(() => moveRowM({ rowId: rowId as Id<"dbRows">, position, values }), "Couldn't move that row")
  }

  const addView = (type: ViewType) => {
    const v = blankView(type, props)
    void guard(() => saveView({ docId, view: v }), "Couldn't add the view").then((r) => { if (r) setActiveId(v.id) })
  }
  const duplicateView = (v: View) => {
    const copy = { ...v, id: newId(), name: `${v.name} copy`.slice(0, 40) }
    void guard(() => saveView({ docId, view: copy }), "Couldn't duplicate the view").then((r) => { if (r) setActiveId(copy.id) })
  }
  const removeView = (v: View) => {
    setActiveId(null)
    void guard(() => deleteView({ docId, viewId: v.id }), "Couldn't delete the view")
  }

  const exportCsv = () => {
    const header = ["Name", ...props.map((p) => p.name)]
    const body = shown.map((r) => [r.title, ...props.map((p) => comp.display(r, p))])
    const blob = new Blob(["﻿", toCsv([header, ...body])], { type: "text/csv;charset=utf-8" })
    const a = document.createElement("a")
    a.href = URL.createObjectURL(blob)
    a.download = `${(config.title || "database").replace(/[^\w\- ]+/g, "").trim() || "database"}.csv`
    a.click()
    setTimeout(() => URL.revokeObjectURL(a.href), 2000)
    toast.success(`Exported ${shown.length} ${shown.length === 1 ? "row" : "rows"}`)
  }

  const vp = { view, rows: shown, ctx, onView: updateView, onAdd: addRow, onMove }
  const peek = peekId ? rows.find((r) => r._id === peekId) ?? null : null

  return (
    <div className="flex h-full min-h-0 flex-col bg-surface">
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 border-b border-plum/12 px-3 py-1.5">
        <div role="tablist" aria-label="Views" className="flex min-w-0 max-w-full items-center gap-0.5 overflow-x-auto">
          {views.map((v) => {
            const Icon = VIEW_META[v.type].icon
            const active = v.id === baseView.id
            return (
              <div key={v.id} className={cn("flex shrink-0 items-center rounded-md", active && "bg-cream-deep")}>
                <button type="button" role="tab" aria-selected={active} onClick={() => setActiveId(v.id)} className={cn("flex h-8 items-center gap-1.5 px-2 text-sm", active ? "font-medium text-ink" : "text-ink/60 hover:text-ink")}>
                  <Icon className="size-3.5" />{v.name}
                </button>
                {active && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild><button type="button" aria-label="View options" className="mr-1 rounded p-1 text-ink/55 hover:bg-surface"><MoreHorizontal className="size-3.5" /></button></DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="w-48">
                      <DropdownMenuItem onClick={() => { setRenaming(baseView); setRenameText(baseView.name) }}><Pencil className="mr-2 size-3.5" /> Rename</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => duplicateView(view)}><Copy className="mr-2 size-3.5" /> Duplicate</DropdownMenuItem>
                      <DropdownMenuSeparator />
                      {(Object.keys(VIEW_META) as ViewType[]).filter((t) => t !== view.type).map((t) => {
                        const I = VIEW_META[t].icon
                        return <DropdownMenuItem key={t} onClick={() => updateView({ ...view, type: t, ...(t === "board" && !view.groupBy ? { groupBy: blankView("board", props).groupBy } : {}), ...(t === "calendar" && !view.dateProp ? { dateProp: blankView("calendar", props).dateProp } : {}) })}><I className="mr-2 size-3.5" /> Show as {VIEW_META[t].label.toLowerCase()}</DropdownMenuItem>
                      })}
                      {views.length > 1 && (<><DropdownMenuSeparator /><DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => removeView(baseView)}><Trash2 className="mr-2 size-3.5" /> Delete view</DropdownMenuItem></>)}
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>
            )
          })}
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild><Button type="button" variant="ghost" size="icon" className="size-8 shrink-0" aria-label="Add a view"><Plus className="size-4" /></Button></DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-40">
            {(Object.keys(VIEW_META) as ViewType[]).map((t) => { const I = VIEW_META[t].icon; return <DropdownMenuItem key={t} onClick={() => addView(t)}><I className="mr-2 size-3.5" /> {VIEW_META[t].label}</DropdownMenuItem> })}
          </DropdownMenuContent>
        </DropdownMenu>

        <div className="ml-auto flex items-center gap-0.5">
          <div className="relative hidden sm:block">
            <Search className="pointer-events-none absolute left-2 top-2 size-3.5 text-ink/45" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search" aria-label="Search rows" className="h-8 w-36 pl-7 text-sm" />
          </div>
          <FilterControl view={view} ctx={ctx} onChange={updateView} />
          <SortControl view={view} ctx={ctx} onChange={updateView} />
          {view.type !== "calendar" && <GroupControl view={view} ctx={ctx} onChange={updateView} />}
          <PropertiesControl view={view} ctx={ctx} onChange={updateView} onAdd={() => setPropDlg("new")} />
          <DropdownMenu>
            <DropdownMenuTrigger asChild><Button type="button" variant="ghost" size="icon" className="size-8" aria-label="More"><MoreHorizontal className="size-4" /></Button></DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44">
              <DropdownMenuItem onClick={() => setImportOpen(true)}><Upload className="mr-2 size-3.5" /> Import CSV</DropdownMenuItem>
              <DropdownMenuItem onClick={exportCsv}><Download className="mr-2 size-3.5" /> Export CSV</DropdownMenuItem>
              {config.canEditSchema && <DropdownMenuItem onClick={() => setPropDlg("new")}><Plus className="mr-2 size-3.5" /> New property</DropdownMenuItem>}
            </DropdownMenuContent>
          </DropdownMenu>
          <Button type="button" size="sm" className="ml-1 h-8 bg-[#ff5018] text-white hover:bg-[#e6430f]" onClick={() => void addRow()}><Plus className="mr-1 size-3.5" /> New</Button>
        </div>
      </div>

      <div className="min-h-0 flex-1">
        {view.type === "table" && <TableView {...vp} />}
        {view.type === "board" && <BoardView {...vp} />}
        {view.type === "list" && <ListView {...vp} />}
        {view.type === "gallery" && <GalleryView {...vp} />}
        {view.type === "calendar" && <CalendarView {...vp} />}
      </div>

      <RowPeek row={peek} ctx={ctx} onClose={() => openRow(null)} onOpenRow={openRow} />
      <PropertyDialog open={propDlg !== null} onOpenChange={(o) => { if (!o) setPropDlg(null) }} ctx={ctx} propId={propDlg} />
      <ImportDialog open={importOpen} onOpenChange={setImportOpen} ctx={ctx} existingRows={rows.length} />

      <Dialog open={!!renaming} onOpenChange={(o) => { if (!o) setRenaming(null) }}>
        <DialogContent className="max-w-sm rounded-2xl border-plum/12">
          <DialogHeader><DialogTitle>Rename view</DialogTitle><DialogDescription className="sr-only">Give this view a name</DialogDescription></DialogHeader>
          <Input aria-label="View name" autoFocus value={renameText} maxLength={40} onChange={(e) => setRenameText(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && renaming && renameText.trim()) { updateView({ ...(local[renaming.id] ?? renaming), name: renameText.trim() }); setRenaming(null) } }} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRenaming(null)}>Cancel</Button>
            <Button className="bg-[#ff5018] text-white hover:bg-[#e6430f]" disabled={!renameText.trim()} onClick={() => { if (renaming) { updateView({ ...(local[renaming.id] ?? renaming), name: renameText.trim() }); setRenaming(null) } }}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
