"use client"
import { usePermissions } from "@/hooks/use-permissions"

import { useState, useEffect, useRef } from "react"
import { useSearchParams } from "next/navigation"
import { useWorkspaceId } from "@/hooks/use-workspace-id"

import { Id } from "../../../../../../convex/_generated/dataModel"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Pin, PinOff, Pencil, Trash2, Plus, Loader, FileText, Users, ArrowLeft } from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { quillToText } from "@/features/messages/lib/quill-to-text"
import { format } from "date-fns"
import { useCurrentMember } from "@/features/members/api/use-current-member"
import { useGetNotes } from "@/features/notes/api/use-get-note"
import { useCreateNote } from "@/features/notes/api/use-create-note"
import { useRemoveNote } from "@/features/notes/api/use-remove-note"
import { useUpdateNote } from "@/features/notes/api/use-update-note"
import { useTogglePin } from "@/features/notes/api/use-toggle-pin"
import { friendlyError, useLimitHandler } from "@/hooks/use-limit-handler"

type NoteTab = "personal" | "workspace"

type Note = {
    _id: Id<"notes">
    title: string
    body: string
    isPinned?: boolean
    authorId: Id<"members">
    updatedAt?: number
    type: "personal" | "workspace"
}

export default function NotesPage() {
    const workspaceId = useWorkspaceId()
    const { data: currentMember } = useCurrentMember({ workspaceId })
    const perms = usePermissions()
    const { handleLimitError } = useLimitHandler()

    const [tab, setTab] = useState<NoteTab>("workspace")
    const [selectedNote, setSelectedNote] = useState<Note | null>(null)
    const [isCreating, setIsCreating] = useState(false)
    const [newTitle, setNewTitle] = useState("")
    const [newBody, setNewBody] = useState("")
    const [editTitle, setEditTitle] = useState("")
    const [editBody, setEditBody] = useState("")
    const [showMobileEditor, setShowMobileEditor] = useState(false)

    const { data: notes, isLoading } = useGetNotes({ workspaceId, type: tab })
    const { mutate: createNote, isPending: isCreatingNote } = useCreateNote()
    const { mutate: updateNote, isPending: isUpdatingNote } = useUpdateNote()
    const { mutate: removeNote, isPending: isRemovingNote } = useRemoveNote()
    const { mutate: togglePin } = useTogglePin()

    const isAdmin = perms.can("manageContent")

    // Deep link: /notes?note=<id> opens that note (used by notifications)
    const searchParams = useSearchParams()
    const targetNoteId = searchParams.get("note")
    const openedNote = useRef<string | null>(null)
    useEffect(() => {
        if (!targetNoteId || !notes || openedNote.current === targetNoteId) return
        const found = notes.find(n => n._id === targetNoteId)
        if (found) {
            openedNote.current = targetNoteId
            // opened from a link: select it once the list has loaded
            queueMicrotask(() => {
                setSelectedNote(found as Note)
                setEditTitle(found.title)
                setEditBody(quillToText(found.body))
                setIsCreating(false)
                setShowMobileEditor(true)
            })
        }
    }, [targetNoteId, notes])

    const handleCreate = () => {
        if (!newTitle.trim()) return toast.error("Title is required")
        createNote({ workspaceId, title: newTitle, body: newBody, type: tab }, {
            onSuccess: () => {
                setIsCreating(false)
                setNewTitle("")
                setNewBody("")
                setShowMobileEditor(false)
                toast.success("Note created")
            },
            onError: (e) => { handleLimitError(e, "Failed to create note") }
        })
    }

    const handleSelectNote = (note: Note) => {
        setSelectedNote(note)
        setEditTitle(note.title)
        setEditBody(quillToText(note.body))
        setIsCreating(false)
        setShowMobileEditor(true)
    }

    const handleUpdate = () => {
        if (!selectedNote) return
        updateNote({ id: selectedNote._id, title: editTitle, body: editBody }, {
            onSuccess: () => toast.success("Note updated"),
            onError: (e) => toast.error(friendlyError(e, "Failed to update note"))
        })
    }

    const handleDelete = (id: Id<"notes">) => {
        removeNote(id, {
            onSuccess: () => {
                if (selectedNote?._id === id) {
                    setSelectedNote(null)
                    setShowMobileEditor(false)
                }
                toast.success("Note deleted")
            },
            onError: (e) => toast.error(friendlyError(e, "Failed to delete note"))
        })
    }

    const handleTogglePin = (id: Id<"notes">) => {
        togglePin(id, {
            onError: (e) => toast.error(friendlyError(e, "Couldn't pin the note"))
        })
    }

    const canEdit = (note: Note) => {
        if (!currentMember) return false
        return note.authorId === currentMember._id || isAdmin
    }

    const canDelete = (note: Note) => {
        if (!currentMember) return false
        if (note.type === "personal") return note.authorId === currentMember._id
        return isAdmin
    }

    const sortedNotes = [...(notes ?? [])].sort((a, b) => {
        if (a.isPinned && !b.isPinned) return -1
        if (!a.isPinned && b.isPinned) return 1
        return (b.updatedAt ?? 0) - (a.updatedAt ?? 0)
    })

    const handleBackToList = () => {
        setShowMobileEditor(false)
        setIsCreating(false)
        setSelectedNote(null)
    }

    const handleNewNote = () => {
        setIsCreating(true)
        setSelectedNote(null)
        setShowMobileEditor(true)
    }

    return (
        <div className="h-full flex">
            {/* LEFT: Notes list - Hidden on mobile when editor is shown */}
            <div className={cn(
                "w-full md:w-80 border-r border-plum/12 bg-cream-soft flex flex-col h-full",
                showMobileEditor && "hidden md:flex"
            )}>
                {/* Tabs */}
                <div className="flex border-b border-plum/12 bg-surface px-2">
                    <button
                        onClick={() => { setTab("personal"); setSelectedNote(null); setIsCreating(false); setShowMobileEditor(false) }}
                        className={cn(
                            "flex-1 flex items-center justify-center gap-1.5 h-14 text-sm font-semibold tracking-tight border-b-2 transition-colors",
                            tab === "personal"
                                ? "border-brand text-orange-ink"
                                : "border-transparent text-ink/60 hover:text-ink"
                        )}
                    >
                        <FileText className="size-4" /> 
                        <span className="hidden sm:inline">Personal</span>
                    </button>
                    <button
                        onClick={() => { setTab("workspace"); setSelectedNote(null); setIsCreating(false); setShowMobileEditor(false) }}
                        className={cn(
                            "flex-1 flex items-center justify-center gap-1.5 h-14 text-sm font-semibold tracking-tight border-b-2 transition-colors",
                            tab === "workspace"
                                ? "border-brand text-orange-ink"
                                : "border-transparent text-ink/60 hover:text-ink"
                        )}
                    >
                        <Users className="size-4" /> 
                        <span className="hidden sm:inline">Workspace</span>
                    </button>
                </div>

                {/* New note button */}
                <div className="px-4 py-3 border-b border-plum/12">
                    <Button
                        onClick={handleNewNote}
                        className="w-full bg-brand hover:bg-brand-hover text-white rounded-lg font-semibold"
                        size="sm"
                    >
                        <Plus className="size-4 mr-1" /> New Note
                    </Button>
                </div>

                {/* Notes list */}
                <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-2">
                    {isLoading ? (
                        <div className="flex items-center justify-center h-full">
                            <Loader className="size-5 animate-spin text-brand" />
                        </div>
                    ) : sortedNotes.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full gap-3 p-4">
                            <div className="size-14 rounded-2xl bg-brand/10 text-brand flex items-center justify-center">
                                <FileText className="size-6" />
                            </div>
                            <p className="text-sm font-semibold tracking-tight text-ink">No notes yet</p>
                        </div>
                    ) : (
                        sortedNotes.map((note) => (
                            <div
                                key={note._id}
                                onClick={() => handleSelectNote(note as Note)}
                                className={cn(
                                    "p-3.5 bg-surface border border-plum/12 rounded-xl cursor-pointer hover:border-brand/40 hover:shadow-sm transition-all group",
                                    selectedNote?._id === note._id && "border-brand ring-1 ring-brand/20"
                                )}
                            >
                                <div className="flex items-start justify-between gap-1">
                                    <div className="flex items-center gap-1 flex-1 min-w-0">
                                        {note.isPinned && <Pin className="size-3 text-brand shrink-0" />}
                                        <p className="text-sm font-semibold tracking-tight text-ink truncate">{note.title}</p>
                                    </div>
                                    <div className="flex items-center gap-1 opacity-0 max-md:opacity-100 group-hover:opacity-100 transition-opacity shrink-0">
                                        {isAdmin && tab === "workspace" && (
                                            <button aria-label="Pin or unpin note" type="button"
                                                onClick={(e) => { e.stopPropagation(); handleTogglePin(note._id) }}
                                                className="p-1 rounded-md text-ink/50 hover:text-orange-ink-hover hover:bg-brand/10 transition-colors"
                                            >
                                                {note.isPinned
                                                    ? <PinOff className="size-3.5" />
                                                    : <Pin className="size-3.5" />}
                                            </button>
                                        )}
                                        {canDelete(note as Note) && (
                                            <button aria-label="Delete note" type="button"
                                                onClick={(e) => { e.stopPropagation(); handleDelete(note._id) }}
                                                className="p-1 rounded-md text-ink/50 hover:text-destructive hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
                                            >
                                                <Trash2 className="size-3.5" />
                                            </button>
                                        )}
                                    </div>
                                </div>
                                <p className="text-xs text-ink/60 mt-1 truncate">
                                    {quillToText(note.body) || "No content"}
                                </p>
                                {note.updatedAt && (
                                    <p className="text-[11px] text-ink/65 mt-1.5">
                                        {format(note.updatedAt, "MMM d, yyyy")}
                                    </p>
                                )}
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* RIGHT: Editor - Full screen on mobile when shown */}
            <div className={cn(
                "flex-1 flex flex-col h-full overflow-hidden",
                !showMobileEditor && !isCreating && "hidden md:flex"
            )}>
                {isCreating ? (
                    <div className="flex flex-col h-full px-4 md:px-6 py-5 gap-4 bg-surface">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <Button 
                                    variant="ghost" 
                                    size="sm" 
                                    className="md:hidden -ml-2"
                                    aria-label="Back to notes list"
                                    onClick={handleBackToList}
                                >
                                    <ArrowLeft className="size-4" />
                                </Button>
                                <h2 className="text-[17px] font-semibold tracking-tight text-ink">
                                    New {tab === "personal" ? "Personal" : "Workspace"} Note
                                </h2>
                            </div>
                            <Button 
                                variant="ghost" 
                                size="sm" 
                                className="rounded-lg text-ink/70 hover:bg-cream-deep"
                                onClick={() => {
                                    setIsCreating(false)
                                    setShowMobileEditor(false)
                                }}
                            >
                                Cancel
                            </Button>
                        </div>
                        <Input aria-label="Note title"
                            placeholder="Note title..."
                            value={newTitle}
                            onChange={(e) => setNewTitle(e.target.value)}
                            className="text-lg sm:text-2xl font-semibold tracking-tight text-ink border-none shadow-none focus-visible:ring-0 px-0 h-auto"
                        />
                        <textarea aria-label="Note body"
                            placeholder="Start writing..."
                            value={newBody}
                            onChange={(e) => setNewBody(e.target.value)}
                            className="flex-1 resize-none border-none outline-none text-sm leading-relaxed text-ink/75 bg-transparent"
                        />
                        <div className="flex justify-end">
                            <Button
                                onClick={handleCreate}
                                disabled={isCreatingNote || !newTitle.trim()}
                                className="bg-brand hover:bg-brand-hover text-white rounded-lg font-semibold"
                            >
                                {isCreatingNote ? <Loader className="size-4 animate-spin" /> : "Save Note"}
                            </Button>
                        </div>
                    </div>
                ) : selectedNote ? (
                    <div className="flex flex-col h-full px-4 md:px-6 py-5 gap-4 bg-surface">
                        <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2 min-w-0 flex-1">
                                <Button 
                                    variant="ghost" 
                                    size="sm" 
                                    className="md:hidden -ml-2 shrink-0"
                                    aria-label="Back to notes list"
                                    onClick={handleBackToList}
                                >
                                    <ArrowLeft className="size-4" />
                                </Button>
                                <div className="flex items-center gap-2 min-w-0">
                                    {selectedNote.isPinned && <Pin className="size-4 text-brand shrink-0" />}
                                    <span className="text-xs font-medium text-ink/60 capitalize truncate rounded-md bg-cream px-2 py-0.5">
                                        {selectedNote.type} note
                                    </span>
                                </div>
                            </div>
                            {canEdit(selectedNote) && (
                                <Button
                                    size="sm"
                                    onClick={handleUpdate}
                                    disabled={isUpdatingNote}
                                    className="bg-brand hover:bg-brand-hover text-white rounded-lg font-semibold shrink-0"
                                >
                                    {isUpdatingNote
                                        ? <Loader className="size-4 animate-spin" />
                                        : <><Pencil className="size-3.5 mr-1" /> Save</>}
                                </Button>
                            )}
                        </div>
                        <Input aria-label="Note title"
                            value={editTitle}
                            onChange={(e) => setEditTitle(e.target.value)}
                            disabled={!canEdit(selectedNote)}
                            className="text-lg sm:text-2xl font-semibold tracking-tight text-ink border-none shadow-none focus-visible:ring-0 px-0 h-auto"
                        />
                        <textarea aria-label="Note body"
                            value={editBody}
                            onChange={(e) => setEditBody(e.target.value)}
                            disabled={!canEdit(selectedNote)}
                            className="flex-1 resize-none border-none outline-none text-sm leading-relaxed text-ink/75 bg-transparent disabled:cursor-not-allowed"
                        />
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center h-full gap-3 p-4 bg-cream-soft">
                        <div className="size-14 rounded-2xl bg-brand/10 text-brand flex items-center justify-center">
                            <FileText className="size-6" />
                        </div>
                        <p className="text-sm text-ink/60 text-center">Select a note or create a new one</p>
                        <Button
                            onClick={handleNewNote}
                            size="sm"
                            className="bg-brand hover:bg-brand-hover text-white rounded-lg font-semibold"
                        >
                            <Plus className="size-4 mr-1" /> New Note
                        </Button>
                    </div>
                )}
            </div>
        </div>
    )
}