"use client"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { useMutation } from "convex/react"
import {
  ChevronRight, FileText, FileSpreadsheet, Table2, Plus, MoreHorizontal, Star, Pencil, Trash2, FolderInput, Smile, Copy, Home, Loader,
} from "lucide-react"
import { toast } from "sonner"
import { api } from "../../../convex/_generated/api"
import { Id } from "../../../convex/_generated/dataModel"
import { useWorkspaceId } from "@/hooks/use-workspace-id"
import { useLimitHandler, friendlyError } from "@/hooks/use-limit-handler"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"
import { usePageTree, descendantIds, ancestorsOf, PageNode } from "./use-page-tree"
import { IconPicker, RenderIcon } from "./page-icons"
import { NewPageDialog } from "./new-page-dialog"
import { TrashDialog } from "./trash-dialog"

type Zone = "before" | "inside" | "after"

export const PageIcon = ({ node, className }: { node: Pick<PageNode, "icon" | "type">; className?: string }) => {
  if (node.icon) return <RenderIcon value={node.icon} className={cn("text-ink/60", className)} />
  const Icon = node.type === "database" ? Table2 : node.type === "spreadsheet" ? FileSpreadsheet : FileText
  return <Icon className={cn("size-4 shrink-0 text-ink/60", className)} aria-hidden="true" />
}

export const PageTree = ({ onNavigate }: { onNavigate?: () => void }) => {
  const workspaceId = useWorkspaceId()
  const router = useRouter()
  const params = useParams()
  const activeId = params.docId as string | undefined
  const { isLoading, roots, byId, favorites, favoriteSet } = usePageTree(workspaceId)
  const { handleLimitError } = useLimitHandler()

  const rename = useMutation(api.docs.rename)
  const remove = useMutation(api.docs.remove)
  const restore = useMutation(api.docs.restore)
  const [trashOpen, setTrashOpen] = useState(false)
  const move = useMutation(api.docs.move)
  const setIcon = useMutation(api.docs.setIcon)
  const toggleFavorite = useMutation(api.docs.toggleFavorite)
  const createDoc = useMutation(api.docs.create)
  const duplicateDb = useMutation(api.databases.duplicate)

  const storeKey = `wfx-tree-${workspaceId}`
  const [open, setOpen] = useState<Set<string>>(() => {
    try { return new Set<string>(JSON.parse(localStorage.getItem(storeKey) ?? "[]")) } catch { return new Set<string>() }
  })
  const persist = (next: Set<string>) => {
    setOpen(next)
    try { localStorage.setItem(storeKey, JSON.stringify([...next].slice(0, 300))) } catch { /* storage unavailable */ }
  }
  const toggle = (id: string) => { const n = new Set(open); if (n.has(id)) n.delete(id); else n.add(id); persist(n) }

  // keep the current page visible: open everything above it once per page
  const revealed = useRef<string | null>(null)
  useEffect(() => {
    if (!activeId || revealed.current === activeId || byId.size === 0) return
    revealed.current = activeId
    const parents = ancestorsOf(byId, activeId).slice(0, -1).map((n) => n._id as string)
    if (parents.some((p) => !open.has(p))) persist(new Set([...open, ...parents]))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeId, byId])

  const [newOpen, setNewOpen] = useState(false)
  const [newParent, setNewParent] = useState<Id<"docs"> | undefined>()
  const [renaming, setRenaming] = useState<string | null>(null)
  const [draft, setDraft] = useState("")
  const renameDone = useRef(false)
  const [deleteNode, setDeleteNode] = useState<PageNode | null>(null)
  const [moveNode, setMoveNode] = useState<PageNode | null>(null)
  const [moveQuery, setMoveQuery] = useState("")
  const [dragId, setDragId] = useState<string | null>(null)
  const [drop, setDrop] = useState<{ id: string; zone: Zone } | null>(null)

  const go = (id: string) => { router.push(`/dashboard/workspace/${workspaceId}/docs/${id}`); onNavigate?.() }

  const addSub = async (parent: PageNode) => {
    try {
      const id = await createDoc({ workspaceId, title: "Untitled", type: "document", parentId: parent._id })
      persist(new Set([...open, parent._id]))
      go(id)
    } catch (e) { handleLimitError(e, "Couldn't create the page") }
  }

  const commitRename = async (node: PageNode) => {
    if (renameDone.current) return
    renameDone.current = true
    const t = draft.trim()
    setRenaming(null)
    if (!t || t === node.title) return
    try { await rename({ id: node._id, title: t }) } catch (e) { toast.error(friendlyError(e, "Couldn't rename")) }
  }

  const confirmDelete = async () => {
    if (!deleteNode) return
    const node = deleteNode
    setDeleteNode(null)
    const gone = new Set([node._id as string, ...descendantIds(node)])
    try {
      await remove({ id: node._id })
      toast.success(`Moved “${node.title || "Untitled"}” to the trash`, {
        duration: 8000,
        action: { label: "Undo", onClick: () => { restore({ id: node._id }).catch((e) => toast.error(friendlyError(e, "Couldn't restore it"))) } },
      })
      if (activeId && gone.has(activeId)) router.push(`/dashboard/workspace/${workspaceId}/docs`)
    } catch {
      toast.error("Only the creator or an admin can delete a page, including the pages inside it")
    }
  }

  const doMove = async (node: PageNode, parentId: Id<"docs"> | null, afterId?: Id<"docs"> | null) => {
    try {
      await move({ id: node._id, parentId, afterId })
      if (parentId) persist(new Set([...open, parentId]))
    } catch (e) { toast.error(friendlyError(e, "Couldn't move the page")) }
  }

  const onDrop = (target: PageNode, zone: Zone) => {
    const node = dragId ? byId.get(dragId) : undefined
    setDragId(null); setDrop(null)
    if (!node || node._id === target._id) return
    if (descendantIds(node).includes(target._id)) { toast.error("A page can't go inside itself"); return }
    if (zone === "inside") return void doMove(node, target._id)
    const sibs = (target.parentId ? byId.get(target.parentId)?.children : roots) ?? []
    const list = sibs.filter((s) => s._id !== node._id)
    const idx = list.findIndex((s) => s._id === target._id)
    if (zone === "after") return void doMove(node, target.parentId, target._id)
    const prev = idx > 0 ? list[idx - 1] : null
    void doMove(node, target.parentId, prev ? prev._id : null)
  }

  const zoneFor = useCallback((e: React.DragEvent<HTMLElement>): Zone => {
    const r = e.currentTarget.getBoundingClientRect()
    const y = (e.clientY - r.top) / r.height
    return y < 0.25 ? "before" : y > 0.75 ? "after" : "inside"
  }, [])

  const renderNode = (node: PageNode, depth: number, withChildren = true): React.ReactNode => {
    const expanded = withChildren && open.has(node._id)
    const active = activeId === node._id
    const isDrop = drop?.id === node._id
    return (
      <div key={`${withChildren ? "t" : "f"}-${node._id}`}>
        <div
          draggable={renaming !== node._id}
          onDragStart={(e) => { setDragId(node._id); e.dataTransfer.effectAllowed = "move"; e.dataTransfer.setData("text/plain", node._id) }}
          onDragEnd={() => { setDragId(null); setDrop(null) }}
          onDragOver={(e) => { if (!dragId || dragId === node._id) return; e.preventDefault(); const z = zoneFor(e); if (drop?.id !== node._id || drop.zone !== z) setDrop({ id: node._id, zone: z }) }}
          onDrop={(e) => { e.preventDefault(); onDrop(node, zoneFor(e)) }}
          className={cn(
            "group relative flex h-8 items-center gap-1 rounded-md pr-1 text-sm transition-colors",
            active ? "bg-brand/12 text-ink" : "text-ink/80 hover:bg-cream-deep",
            isDrop && drop?.zone === "inside" && "bg-brand/15 ring-1 ring-brand/50",
            isDrop && drop?.zone === "before" && "before:absolute before:inset-x-1 before:top-0 before:h-0.5 before:rounded before:bg-brand",
            isDrop && drop?.zone === "after" && "after:absolute after:inset-x-1 after:bottom-0 after:h-0.5 after:rounded after:bg-brand",
            dragId === node._id && "opacity-40"
          )}
          style={{ paddingLeft: 4 + depth * 14 }}
        >
          {withChildren ? (
            <button type="button" aria-label={expanded ? "Collapse" : "Expand"} aria-expanded={expanded} onClick={() => toggle(node._id)}
              className={cn("flex size-5 shrink-0 items-center justify-center rounded text-ink/60 hover:bg-plum/10", node.children.length === 0 && "opacity-30")}>
              <ChevronRight className={cn("size-3.5 transition-transform", expanded && "rotate-90")} />
            </button>
          ) : <span className="size-5 shrink-0" />}

          {renaming === node._id ? (
            <>
              <PageIcon node={node} />
              <Input
                aria-label="Page title" autoFocus value={draft} maxLength={120}
                onChange={(e) => setDraft(e.target.value)}
                onBlur={() => commitRename(node)}
                onKeyDown={(e) => { if (e.key === "Enter") void commitRename(node); if (e.key === "Escape") { renameDone.current = true; setRenaming(null) } }}
                className="h-6 min-w-0 flex-1 rounded px-1.5 text-sm"
              />
            </>
          ) : (
            <button type="button" onClick={() => go(node._id)} className="flex min-w-0 flex-1 items-center gap-1.5 text-left">
              <PageIcon node={node} />
              <span className={cn("truncate", active && "font-semibold")}>{node.title || "Untitled"}</span>
            </button>
          )}

          {renaming !== node._id && (
            <div className="flex shrink-0 items-center opacity-0 transition-opacity focus-within:opacity-100 group-hover:opacity-100 max-md:opacity-100">
              <button type="button" aria-label={`Add a page inside ${node.title}`} onClick={() => addSub(node)} className="rounded p-1 text-ink/60 hover:bg-plum/10 hover:text-ink">
                <Plus className="size-3.5" />
              </button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button type="button" aria-label={`Options for ${node.title}`} className="rounded p-1 text-ink/60 hover:bg-plum/10 hover:text-ink">
                    <MoreHorizontal className="size-3.5" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-52 text-sm">
                  <DropdownMenuItem onClick={() => { renameDone.current = false; setDraft(node.title); setRenaming(node._id) }}>
                    <Pencil className="mr-2 size-3.5" /> Rename
                  </DropdownMenuItem>
                  <IconPicker value={node.icon} onChange={(e) => void setIcon({ id: node._id, icon: e })}>
                    <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                      <Smile className="mr-2 size-3.5" /> Change icon
                    </DropdownMenuItem>
                  </IconPicker>
                  <DropdownMenuItem onClick={() => toggleFavorite({ id: node._id }).catch((e) => toast.error(friendlyError(e, "Couldn't update favorites")))}>
                    <Star className={cn("mr-2 size-3.5", favoriteSet.has(node._id) && "fill-brand text-brand")} />
                    {favoriteSet.has(node._id) ? "Remove from favorites" : "Add to favorites"}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => { setMoveQuery(""); setMoveNode(node) }}>
                    <FolderInput className="mr-2 size-3.5" /> Move to…
                  </DropdownMenuItem>
                  {node.type === "database" && (
                    <DropdownMenuItem onClick={async () => {
                      try { const id = await duplicateDb({ docId: node._id }); toast.success("Database duplicated"); go(id) } catch (e) { handleLimitError(e, "Couldn't duplicate the database") }
                    }}>
                      <Copy className="mr-2 size-3.5" /> Duplicate
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => setDeleteNode(node)}>
                    <Trash2 className="mr-2 size-3.5" /> Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )}
        </div>
        {expanded && node.children.map((c) => renderNode(c, depth + 1))}
      </div>
    )
  }

  const moveChoices = useMemo(() => {
    if (!moveNode) return []
    const blocked = new Set([moveNode._id as string, ...descendantIds(moveNode)])
    const out: { node: PageNode; depth: number }[] = []
    const walk = (list: PageNode[], depth: number) => list.forEach((n) => { if (!blocked.has(n._id)) { out.push({ node: n, depth }); walk(n.children, depth + 1) } })
    walk(roots, 0)
    const q = moveQuery.trim().toLowerCase()
    return q ? out.filter((o) => o.node.title.toLowerCase().includes(q)) : out
  }, [moveNode, roots, moveQuery])

  return (
    <div className="flex h-full flex-col bg-surface">
      <div className="flex h-14 shrink-0 items-center justify-between border-b border-plum/12 px-3">
        <span className="text-[15px] font-semibold tracking-tight text-ink">Pages</span>
        <Button size="sm" className="h-8 gap-1 rounded-lg bg-brand px-2.5 text-xs font-semibold text-white hover:bg-brand-hover"
          onClick={() => { setNewParent(undefined); setNewOpen(true) }}>
          <Plus className="size-3.5" /> New
        </Button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-2 py-2"
        onDragOver={(e) => { if (dragId) e.preventDefault() }}
        onDrop={(e) => {
          // dropped on empty space: move to the top level, at the end
          if (!dragId || e.target !== e.currentTarget) return
          const n = byId.get(dragId); setDragId(null); setDrop(null)
          if (n) void doMove(n, null)
        }}>
        <button type="button" onClick={() => { router.push(`/dashboard/workspace/${workspaceId}/docs`); onNavigate?.() }}
          className={cn("mb-1 flex h-8 w-full items-center gap-2 rounded-md px-2 text-sm text-ink/80 hover:bg-cream-deep", !activeId && "bg-brand/12 font-semibold text-ink")}>
          <Home className="size-4 text-ink/60" /> All pages
        </button>

        {isLoading ? (
          <div className="flex justify-center py-8"><Loader className="size-4 animate-spin text-brand" /></div>
        ) : (
          <>
            {favorites.length > 0 && (
              <div className="mb-2">
                <p className="px-2 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-wide text-ink/45">Favorites</p>
                {favorites.map((n) => renderNode(n, 0, false))}
              </div>
            )}
            <p className="px-2 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-wide text-ink/45">All pages</p>
            {roots.length === 0 ? (
              <div className="px-2 py-6 text-center">
                <p className="text-sm text-ink/60">No pages yet.</p>
                <Button variant="link" className="text-brand" onClick={() => { setNewParent(undefined); setNewOpen(true) }}>Create the first one</Button>
              </div>
            ) : roots.map((n) => renderNode(n, 0))}
          </>
        )}
      </div>

      <NewPageDialog open={newOpen} onOpenChange={setNewOpen} parentId={newParent} />

      <div className="shrink-0 border-t border-plum/12 p-2">
        <button type="button" onClick={() => setTrashOpen(true)} className="flex h-8 w-full items-center gap-2 rounded-md px-2 text-sm text-ink/70 hover:bg-cream-deep">
          <Trash2 className="size-4 text-ink/60" /> Trash
        </button>
      </div>
      <TrashDialog open={trashOpen} onOpenChange={setTrashOpen} />

      <Dialog open={!!deleteNode} onOpenChange={(o) => !o && setDeleteNode(null)}>
        <DialogContent className="mx-4 max-w-sm rounded-2xl border-plum/12">
          <DialogHeader>
            <DialogTitle className="text-[17px] font-semibold tracking-tight">Move &ldquo;{deleteNode?.title}&rdquo; to the trash?</DialogTitle>
            <DialogDescription className="text-sm text-ink/60">
              {deleteNode && descendantIds(deleteNode).length > 0
                ? `This also deletes the ${descendantIds(deleteNode).length} page${descendantIds(deleteNode).length === 1 ? "" : "s"} inside it, for everyone. You can restore it from the trash for 30 days.`
                : "This moves it to the trash for everyone in the workspace. You can restore it for 30 days."}
            </DialogDescription>
          </DialogHeader>
          <div className="mt-2 flex justify-end gap-2">
            <Button variant="outline" onClick={() => setDeleteNode(null)}>Cancel</Button>
            <Button variant="destructive" onClick={confirmDelete}>Move to trash</Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!moveNode} onOpenChange={(o) => !o && setMoveNode(null)}>
        <DialogContent className="mx-4 max-w-sm gap-3 rounded-2xl border-plum/12">
          <DialogHeader>
            <DialogTitle className="text-[17px] font-semibold tracking-tight">Move &ldquo;{moveNode?.title}&rdquo;</DialogTitle>
            <DialogDescription className="sr-only">Choose the page to move it into</DialogDescription>
          </DialogHeader>
          <Input aria-label="Search pages" autoFocus placeholder="Search pages" value={moveQuery} onChange={(e) => setMoveQuery(e.target.value)} className="h-9 rounded-lg" />
          <div className="max-h-72 overflow-y-auto rounded-lg border border-plum/12 p-1">
            {moveNode?.parentId && !moveQuery && (
              <button type="button" className="flex h-8 w-full items-center gap-2 rounded-md px-2 text-left text-sm hover:bg-cream-deep"
                onClick={() => { void doMove(moveNode, null); setMoveNode(null) }}>
                <Home className="size-4 text-ink/60" /> Top level
              </button>
            )}
            {moveChoices.length === 0 && <p className="px-2 py-4 text-center text-sm text-ink/60">No pages found</p>}
            {moveChoices.map(({ node, depth }) => (
              <button key={node._id} type="button" disabled={moveNode?.parentId === node._id}
                className="flex h-8 w-full items-center gap-1.5 rounded-md pr-2 text-left text-sm hover:bg-cream-deep disabled:opacity-40"
                style={{ paddingLeft: 8 + depth * 14 }}
                onClick={() => { if (moveNode) void doMove(moveNode, node._id); setMoveNode(null) }}>
                <PageIcon node={node} /> <span className="truncate">{node.title || "Untitled"}</span>
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
