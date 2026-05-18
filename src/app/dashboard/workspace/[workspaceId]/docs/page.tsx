"use client"

import { useState } from "react"
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
import { cn } from "@/lib/utils"
import { format } from "date-fns"
import {
    FileText, Plus, Loader, Trash2, Pencil, MoreHorizontal, FileSpreadsheet
} from "lucide-react"
import { Id } from "../../../../../../convex/_generated/dataModel"
import { useCreateDoc } from "@/features/docs/use-create-doc"
import { useGetDocs } from "@/features/docs/use-get-docs"
import { useRemoveDoc } from "@/features/docs/use-remove-doc"
import { useRenameDoc } from "@/features/docs/use-rename-doc"

export default function DocsPage() {
    const workspaceId = useWorkspaceId()
    const router = useRouter()
    const { data: docs, isLoading } = useGetDocs({ workspaceId })
    const { mutate: createDoc, isPending: isCreating } = useCreateDoc()
    const { mutate: removeDoc } = useRemoveDoc()
    const { mutate: renameDoc } = useRenameDoc()

    const [showCreate, setShowCreate] = useState(false)
    const [newTitle, setNewTitle] = useState("")
    const [renamingId, setRenamingId] = useState<Id<"docs"> | null>(null)
    const [renameTitle, setRenameTitle] = useState("")

    const handleCreate = () => {
        if (!newTitle.trim()) return toast.error("Title is required")
        createDoc({ workspaceId, title: newTitle, type: "document" }, {
            onSuccess: (id) => {
                toast.success("Document created")
                setShowCreate(false)
                setNewTitle("")
                if (id) router.push(`/dashboard/workspace/${workspaceId}/docs/${id}`)
            },
            onError: (e) => toast.error(e.message)
        })
    }

    const handleRename = (id: Id<"docs">) => {
        if (!renameTitle.trim()) return
        renameDoc({ id, title: renameTitle }, {
            onSuccess: () => {
                toast.success("Renamed")
                setRenamingId(null)
                setRenameTitle("")
            },
            onError: (e) => toast.error(e.message)
        })
    }

    const handleDelete = (id: Id<"docs">) => {
        removeDoc(id, {
            onSuccess: () => toast.success("Deleted"),
            onError: (e) => toast.error(e.message)
        })
    }

    return (
        <div className="h-full flex flex-col overflow-hidden bg-gray-50">
            {/* Header */}
            <div className="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 border-b bg-white shrink-0 shadow-sm">
                <div className="flex items-center gap-2">
                    <div className="size-7 sm:size-8 rounded-lg bg-blue-50 flex items-center justify-center">
                        <FileText className="size-3.5 sm:size-4 text-blue-500" />
                    </div>
                    <div>
                        <h1 className="text-sm sm:text-base font-bold leading-none">Documents</h1>
                        <p className="text-[10px] sm:text-[11px] text-muted-foreground mt-0.5">
                            {docs?.length ?? 0} document{docs?.length !== 1 ? "s" : ""}
                        </p>
                    </div>
                </div>
                <Button
                    onClick={() => setShowCreate(true)}
                    className="bg-[#ff5018]/80 hover:bg-[#ff5018] text-white h-7 sm:h-8 text-[11px] sm:text-xs px-2 sm:px-3"
                >
                    <Plus className="size-3.5 sm:size-4 sm:mr-1" /> 
                    <span className="hidden sm:inline">New Document</span>
                </Button>
            </div>

            {/* Doc grid */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6">
                {isLoading ? (
                    <div className="flex items-center justify-center h-full">
                        <Loader className="size-5 animate-spin text-[#ff5018]" />
                    </div>
                ) : !docs || docs.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full gap-4 text-muted-foreground px-4">
                        <div className="size-14 sm:size-16 rounded-2xl bg-blue-50 flex items-center justify-center">
                            <FileText className="size-7 sm:size-8 text-blue-400" />
                        </div>
                        <div className="text-center">
                            <p className="text-sm font-medium">No documents yet</p>
                            <p className="text-xs mt-1">Create your first document to get started</p>
                        </div>
                        <Button onClick={() => setShowCreate(true)} variant="outline" size="sm">
                            <Plus className="size-4 mr-1" /> New Document
                        </Button>
                    </div>
                ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4">
                        {docs.map(doc => (
                            <div
                                key={doc._id}
                                className="group relative flex flex-col gap-2 sm:gap-3 p-3 sm:p-4 border rounded-xl cursor-pointer hover:shadow-md transition-all hover:border-[#ff5018]/30 bg-white"
                                onClick={() => router.push(`/dashboard/workspace/${workspaceId}/docs/${doc._id}`)}
                            >
                                {/* Doc preview area */}
                                <div className={cn(
                                    "w-full h-20 sm:h-24 rounded-lg flex items-center justify-center",
                                    doc.type === "spreadsheet" ? "bg-green-50" : "bg-blue-50"
                                )}>
                                    {doc.type === "spreadsheet"
                                        ? <FileSpreadsheet className="size-8 sm:size-10 text-green-400" />
                                        : <FileText className="size-8 sm:size-10 text-blue-400" />
                                    }
                                </div>

                                {/* Title */}
                                {renamingId === doc._id ? (
                                    <Input
                                        value={renameTitle}
                                        onChange={e => setRenameTitle(e.target.value)}
                                        onKeyDown={e => {
                                            if (e.key === "Enter") handleRename(doc._id)
                                            if (e.key === "Escape") setRenamingId(null)
                                        }}
                                        onBlur={() => handleRename(doc._id)}
                                        autoFocus
                                        className="h-5 sm:h-6 text-[11px] sm:text-xs px-1"
                                        onClick={e => e.stopPropagation()}
                                    />
                                ) : (
                                    <p className="text-[11px] sm:text-xs font-semibold truncate leading-none">{doc.title}</p>
                                )}

                                <p className="text-[9px] sm:text-[10px] text-muted-foreground leading-none">
                                    {doc.updatedAt ? format(doc.updatedAt, "MMM d, yyyy") : ""}
                                </p>

                                {/* Options menu */}
                                <div className="absolute top-1.5 sm:top-2 right-1.5 sm:right-2">
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild onClick={e => e.stopPropagation()}>
                                            <button className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:text-[#ff5018] rounded hover:bg-muted">
                                                <MoreHorizontal className="size-3 sm:size-3.5" />
                                            </button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end" className="text-xs">
                                            <DropdownMenuItem onClick={(e) => {
                                                e.stopPropagation()
                                                setRenamingId(doc._id)
                                                setRenameTitle(doc.title)
                                            }}>
                                                <Pencil className="size-3.5 mr-2" /> Rename
                                            </DropdownMenuItem>
                                            <DropdownMenuItem
                                                onClick={(e) => {
                                                    e.stopPropagation()
                                                    handleDelete(doc._id)
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

            {/* Create dialog */}
            <Dialog open={showCreate} onOpenChange={setShowCreate}>
                <DialogContent className="max-w-sm mx-4">
                    <DialogHeader>
                        <DialogTitle className="text-base sm:text-lg">Create Document</DialogTitle>
                    </DialogHeader>
                    <div className="flex flex-col gap-3 mt-2">
                        <Input
                            placeholder="Document title..."
                            value={newTitle}
                            onChange={e => setNewTitle(e.target.value)}
                            onKeyDown={e => e.key === "Enter" && handleCreate()}
                            autoFocus
                            className="text-sm"
                        />
                        <div className="flex items-center gap-3 p-3 rounded-lg border-2 border-[#ff5018] bg-orange-50">
                            <div className="size-8 rounded-lg bg-blue-100 flex items-center justify-center shrink-0">
                                <FileText className="size-4 text-blue-500" />
                            </div>
                            <div className="min-w-0">
                                <p className="text-sm font-medium">Document</p>
                                <p className="text-[10px] text-muted-foreground">Rich text with images & tables</p>
                            </div>
                        </div>
                        <Button
                            onClick={handleCreate}
                            disabled={isCreating}
                            className="bg-[#ff5018]/80 hover:bg-[#ff5018] text-white text-sm"
                        >
                            {isCreating ? <Loader className="size-4 animate-spin" /> : "Create Document"}
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    )
}