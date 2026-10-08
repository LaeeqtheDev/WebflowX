"use client"

import { useMemo, useRef, useState } from "react"
import { useWorkspaceId } from "@/hooks/use-workspace-id"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import {
    DropdownMenu, DropdownMenuContent,
    DropdownMenuItem, DropdownMenuTrigger
} from "@/components/ui/dropdown-menu"
import { toast } from "sonner"
import { friendlyError, useLimitHandler } from "@/hooks/use-limit-handler"
import { cn } from "@/lib/utils"
import { formatDistanceToNow } from "date-fns"
import {
    FileText, Plus, Loader, Trash2, Pencil, MoreHorizontal, FileSpreadsheet, Search, Table2
} from "lucide-react"
import { NewPageDialog } from "@/features/pages/new-page-dialog"
import { TrashDialog } from "@/features/pages/trash-dialog"
import { useMutation } from "convex/react"
import { api } from "../../../../../../convex/_generated/api"
import { Id } from "../../../../../../convex/_generated/dataModel"
import { useGetDocs } from "@/features/docs/use-get-docs"
import { useRemoveDoc } from "@/features/docs/use-remove-doc"
import { useRenameDoc } from "@/features/docs/use-rename-doc"

export default function DocsPage() {
    const workspaceId = useWorkspaceId()
    const router = useRouter()
    const { handleLimitError } = useLimitHandler()
    const { data: docs, isLoading } = useGetDocs({ workspaceId })
    const { mutate: removeDoc } = useRemoveDoc()
    const restoreDoc = useMutation(api.docs.restore)
    const [trashOpen, setTrashOpen] = useState(false)
    const { mutate: renameDoc } = useRenameDoc()

    const [showCreate, setShowCreate] = useState(false)
    const [renamingId, setRenamingId] = useState<Id<"docs"> | null>(null)
    const [renameTitle, setRenameTitle] = useState("")
    const [search, setSearch] = useState("")
    const [deleteTarget, setDeleteTarget] = useState<{ _id: Id<"docs">; title: string } | null>(null)
    const renameDone = useRef(false)

    const handleRename = (id: Id<"docs">) => {
        // Enter and blur both fire; only save once
        if (renameDone.current) return
        renameDone.current = true
        if (!renameTitle.trim()) { setRenamingId(null); return }
        renameDoc({ id, title: renameTitle }, {
            onSuccess: () => {
                toast.success("Renamed")
                setRenamingId(null)
                setRenameTitle("")
            },
            onError: (e) => toast.error(friendlyError(e, "Couldn't rename the page"))
        })
    }

    const handleDelete = (id: Id<"docs">) => {
        removeDoc(id, {
            onSuccess: () => {
                toast.success("Moved to the trash", { duration: 8000, action: { label: "Undo", onClick: () => { restoreDoc({ id }).catch((e) => toast.error(friendlyError(e, "Couldn't restore it"))) } } })
                setDeleteTarget(null)
            },
            onError: () => toast.error("Only the creator or an admin can delete this page")
        })
    }

    const visibleDocs = useMemo(() => {
        const q = search.trim().toLowerCase()
        return [...(docs ?? [])]
            .filter((d) => !q || d.title.toLowerCase().includes(q))
            .sort((a, b) => (b.updatedAt ?? b._creationTime) - (a.updatedAt ?? a._creationTime))
    }, [docs, search])

    return (
        <div className="h-full flex flex-col overflow-hidden bg-cream-soft">
            {/* Header */}
            <div className="flex items-center justify-between px-4 sm:px-6 h-14 border-b border-plum/12 bg-surface shrink-0">
                <div className="flex items-center gap-3">
                    <div className="size-8 rounded-lg bg-[#ff5018]/10 flex items-center justify-center">
                        <FileText className="size-4 text-[#ff5018]" />
                    </div>
                    <div>
                        <h1 className="tracking-tight text-[17px] font-semibold leading-none text-ink">Pages</h1>
                        <p className="text-[11px] text-ink/60 mt-1 leading-none">
                            {docs?.length ?? 0} page{docs?.length !== 1 ? "s" : ""}
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <div className="relative hidden sm:block">
                        <Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-ink/40" />
                        <Input
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Search pages"
                            className="h-8 w-56 rounded-lg pl-8 text-xs"
                        />
                    </div>
                <Button variant="ghost" onClick={() => setTrashOpen(true)} className="h-8 text-xs px-2 rounded-lg text-ink/70" aria-label="Open trash">
                    <Trash2 className="size-3.5 sm:mr-1" /> <span className="hidden sm:inline">Trash</span>
                </Button>
                <Button
                    onClick={() => setShowCreate(true)}
                    className="bg-[#ff5018] hover:bg-[#e6430f] text-white h-8 text-xs px-3 rounded-lg font-semibold"
                >
                    <Plus className="size-3.5 sm:size-4 sm:mr-1" /> 
                    <span className="hidden sm:inline">New page</span>
                </Button>
                </div>
            </div>

            {/* Mobile search */}
            <div className="sm:hidden px-4 pt-3">
                <Input aria-label="Search pages" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search pages" className="h-9 rounded-lg text-sm" />
            </div>

            {/* Doc grid */}
            <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-5">
                {isLoading ? (
                    <div className="flex items-center justify-center h-full">
                        <Loader className="size-5 animate-spin text-[#ff5018]" />
                    </div>
                ) : !docs || docs.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full gap-4 px-4">
                        <div className="size-14 rounded-2xl bg-[#ff5018]/10 text-[#ff5018] flex items-center justify-center">
                            <FileText className="size-6 text-[#ff5018]" />
                        </div>
                        <div className="text-center">
                            <p className="text-sm font-semibold tracking-tight text-ink">No pages yet</p>
                            <p className="text-xs mt-1 text-ink/60">Write a page, plan with a database, or start from a template</p>
                        </div>
                        <Button onClick={() => setShowCreate(true)} size="sm" className="bg-[#ff5018] hover:bg-[#e6430f] text-white rounded-lg font-semibold">
                            <Plus className="size-4 mr-1" /> New page
                        </Button>
                    </div>
                ) : visibleDocs.length === 0 ? (
                    <p className="mt-16 text-center text-sm text-ink/60">No pages match &ldquo;{search}&rdquo;</p>
                ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4">
                        {visibleDocs.map(doc => (
                            <div
                                key={doc._id}
                                className="group relative flex flex-col gap-3 p-3 sm:p-4 border border-plum/12 rounded-xl cursor-pointer hover:shadow-sm transition-all hover:border-[#ff5018]/40 bg-surface"
                                onClick={() => router.push(`/dashboard/workspace/${workspaceId}/docs/${doc._id}`)}
                            >
                                {/* Doc preview area */}
                                <div className={cn(
                                    "w-full h-20 sm:h-24 rounded-lg flex items-center justify-center",
                                    doc.type === "spreadsheet" ? "bg-green-50 dark:bg-green-500/10" : doc.type === "database" ? "bg-sky-50 dark:bg-sky-500/10" : "bg-[#ff5018]/10"
                                )}>
                                    {doc.icon
                                        ? <span className="text-3xl sm:text-4xl" aria-hidden="true">{doc.icon}</span>
                                        : doc.type === "spreadsheet"
                                            ? <FileSpreadsheet className="size-8 sm:size-9 text-green-600 dark:text-green-400" />
                                            : doc.type === "database"
                                                ? <Table2 className="size-8 sm:size-9 text-sky-600 dark:text-sky-400" />
                                                : <FileText className="size-8 sm:size-9 text-[#ff5018]" />
                                    }
                                </div>

                                {/* Title */}
                                {renamingId === doc._id ? (
                                    <Input aria-label="Page title"
                                        value={renameTitle}
                                        onChange={e => setRenameTitle(e.target.value)}
                                        onKeyDown={e => {
                                            if (e.key === "Enter") handleRename(doc._id)
                                            if (e.key === "Escape") setRenamingId(null)
                                        }}
                                        onBlur={() => handleRename(doc._id)}
                                        autoFocus
                                        className="h-7 text-xs px-2 rounded-lg"
                                        onClick={e => e.stopPropagation()}
                                    />
                                ) : (
                                    <p className="text-[13px] font-semibold tracking-tight text-ink truncate leading-none">{doc.title}</p>
                                )}

                                <p className="text-[11px] text-ink/60 leading-none">
                                    {doc.type === "database" ? "Database · " : doc.type === "spreadsheet" ? "Spreadsheet · " : ""}{`Edited ${formatDistanceToNow(doc.updatedAt ?? doc._creationTime, { addSuffix: true })}`}
                                    {doc.creator?.user?.name ? ` · ${doc.creator.user.name}` : ""}
                                </p>

                                {/* Options menu */}
                                <div className="absolute top-1.5 sm:top-2 right-1.5 sm:right-2">
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild onClick={e => e.stopPropagation()}>
                                            <button type="button" aria-label="Page options" className="opacity-0 max-md:opacity-100 group-hover:opacity-100 focus-visible:opacity-100 transition-opacity p-1 max-md:p-2.5 text-ink/60 hover:text-orange-ink rounded-md bg-white/80 hover:bg-surface">
                                                <MoreHorizontal className="size-3 sm:size-3.5" />
                                            </button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end" className="text-xs">
                                            <DropdownMenuItem onClick={(e) => {
                                                e.stopPropagation()
                                                renameDone.current = false
                                                setRenamingId(doc._id)
                                                setRenameTitle(doc.title)
                                            }}>
                                                <Pencil className="size-3.5 mr-2" /> Rename
                                            </DropdownMenuItem>
                                            <DropdownMenuItem
                                                onClick={(e) => {
                                                    e.stopPropagation()
                                                    setDeleteTarget({ _id: doc._id, title: doc.title })
                                                }}
                                                className="text-destructive"
                                            >
                                                <Trash2 className="size-3.5 mr-2" /> Delete
                                            </DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Delete confirm */}
            <Dialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
                <DialogContent className="max-w-sm mx-4 rounded-2xl border-plum/12">
                    <DialogHeader>
                        <DialogTitle className="text-[17px] font-semibold tracking-tight">Move &ldquo;{deleteTarget?.title}&rdquo; to the trash?</DialogTitle>
                    </DialogHeader>
                    <p className="text-sm text-ink/60">This moves the page, and anything inside it, to the trash for everyone in the workspace. You can restore it for 30 days.</p>
                    <div className="flex justify-end gap-2 mt-2">
                        <Button variant="outline" onClick={() => setDeleteTarget(null)}>Cancel</Button>
                        <Button variant="destructive" onClick={() => deleteTarget && handleDelete(deleteTarget._id)}>Move to trash</Button>
                    </div>
                </DialogContent>
            </Dialog>

            <NewPageDialog open={showCreate} onOpenChange={setShowCreate} />
            <TrashDialog open={trashOpen} onOpenChange={setTrashOpen} />
        </div>
    )
}