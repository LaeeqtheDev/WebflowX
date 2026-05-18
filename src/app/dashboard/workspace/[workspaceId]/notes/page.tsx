"use client"

import { useState } from "react"
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

    const isAdmin = currentMember?.role === "admin"

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
            onError: () => toast.error("Failed to create note")
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
            onError: () => toast.error("Failed to update note")
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
            onError: (e) => toast.error(e.message)
        })
    }

    const handleTogglePin = (id: Id<"notes">) => {
        togglePin(id, {
            onError: (e) => toast.error(e.message)
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
                "w-full md:w-72 border-r flex flex-col h-full",
                showMobileEditor && "hidden md:flex"
            )}>
                {/* Tabs */}
                <div className="flex border-b">
                    <button
                        onClick={() => { setTab("personal"); setSelectedNote(null); setIsCreating(false); setShowMobileEditor(false) }}
                        className={cn(
                            "flex-1 flex items-center justify-center gap-1.5 py-3 text-sm font-medium transition-colors",
                            tab === "personal"
                                ? "border-b-2 border-[#ff5018] text-[#ff5018]"
                                : "text-muted-foreground hover:text-foreground"
                        )}
                    >
                        <FileText className="size-4" /> 
                        <span className="hidden sm:inline">Personal</span>
                    </button>
                    <button
                        onClick={() => { setTab("workspace"); setSelectedNote(null); setIsCreating(false); setShowMobileEditor(false) }}
                        className={cn(
                            "flex-1 flex items-center justify-center gap-1.5 py-3 text-sm font-medium transition-colors",
                            tab === "workspace"
                                ? "border-b-2 border-[#ff5018] text-[#ff5018]"
                                : "text-muted-foreground hover:text-foreground"
                        )}
                    >
                        <Users className="size-4" /> 
                        <span className="hidden sm:inline">Workspace</span>
                    </button>
                </div>

                {/* New note button */}
                <div className="p-3 border-b">
                    <Button
                        onClick={handleNewNote}
                        className="w-full bg-[#ff5018]/80 hover:bg-[#ff5018] text-white"
                        size="sm"
                    >
                        <Plus className="size-4 mr-1" /> New Note
                    </Button>
                </div>

                {/* Notes list */}
                <div className="flex-1 overflow-y-auto">
                    {isLoading ? (
                        <div className="flex items-center justify-center h-full">
                            <Loader className="size-5 animate-spin text-[#ff5018]" />
                        </div>
                    ) : sortedNotes.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-2 p-4">
                            <FileText className="size-8" />
                            <p className="text-sm text-center">No notes yet</p>
                        </div>
                    ) : (
                        sortedNotes.map((note) => (
                            <div
                                key={note._id}
                                onClick={() => handleSelectNote(note as Note)}
                                className={cn(
                                    "p-3 border-b cursor-pointer hover:bg-muted/50 transition-colors group",
                                    selectedNote?._id === note._id && "bg-muted"
                                )}
                            >
                                <div className="flex items-start justify-between gap-1">
                                    <div className="flex items-center gap-1 flex-1 min-w-0">
                                        {note.isPinned && <Pin className="size-3 text-[#ff5018] shrink-0" />}
                                        <p className="text-sm font-medium truncate">{note.title}</p>
                                    </div>
                                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                                        {isAdmin && tab === "workspace" && (
                                            <button
                                                onClick={(e) => { e.stopPropagation(); handleTogglePin(note._id) }}
                                                className="p-0.5 hover:text-[#ff5018] transition-colors"
                                            >
                                                {note.isPinned
                                                    ? <PinOff className="size-3.5" />
                                                    : <Pin className="size-3.5" />}
                                            </button>
                                        )}
                                        {canDelete(note as Note) && (
                                            <button
                                                onClick={(e) => { e.stopPropagation(); handleDelete(note._id) }}
                                                className="p-0.5 hover:text-destructive transition-colors"
                                            >
                                                <Trash2 className="size-3.5" />
                                            </button>
                                        )}
                                    </div>
                                </div>
                                <p className="text-xs text-muted-foreground mt-0.5 truncate">
                                    {quillToText(note.body) || "No content"}
                                </p>
                                {note.updatedAt && (
                                    <p className="text-[10px] text-muted-foreground mt-1">
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
                    <div className="flex flex-col h-full p-4 sm:p-6 gap-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <Button 
                                    variant="ghost" 
                                    size="sm" 
                                    className="md:hidden -ml-2"
                                    onClick={handleBackToList}
                                >
                                    <ArrowLeft className="size-4" />
                                </Button>
                                <h2 className="text-base sm:text-lg font-semibold">
                                    New {tab === "personal" ? "Personal" : "Workspace"} Note
                                </h2>
                            </div>
                            <Button 
                                variant="ghost" 
                                size="sm" 
                                onClick={() => {
                                    setIsCreating(false)
                                    setShowMobileEditor(false)
                                }}
                            >
                                Cancel
                            </Button>
                        </div>
                        <Input
                            placeholder="Note title..."
                            value={newTitle}
                            onChange={(e) => setNewTitle(e.target.value)}
                            className="text-lg sm:text-xl font-semibold border-none shadow-none focus-visible:ring-0 px-0 h-auto"
                        />
                        <textarea
                            placeholder="Start writing..."
                            value={newBody}
                            onChange={(e) => setNewBody(e.target.value)}
                            className="flex-1 resize-none border-none outline-none text-sm text-muted-foreground bg-transparent"
                        />
                        <div className="flex justify-end">
                            <Button
                                onClick={handleCreate}
                                disabled={isCreatingNote || !newTitle.trim()}
                                className="bg-[#ff5018]/80 hover:bg-[#ff5018] text-white"
                            >
                                {isCreatingNote ? <Loader className="size-4 animate-spin" /> : "Save Note"}
                            </Button>
                        </div>
                    </div>
                ) : selectedNote ? (
                    <div className="flex flex-col h-full p-4 sm:p-6 gap-4">
                        <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2 min-w-0 flex-1">
                                <Button 
                                    variant="ghost" 
                                    size="sm" 
                                    className="md:hidden -ml-2 shrink-0"
                                    onClick={handleBackToList}
                                >
                                    <ArrowLeft className="size-4" />
                                </Button>
                                <div className="flex items-center gap-2 min-w-0">
                                    {selectedNote.isPinned && <Pin className="size-4 text-[#ff5018] shrink-0" />}
                                    <span className="text-xs text-muted-foreground capitalize truncate">
                                        {selectedNote.type} note
                                    </span>
                                </div>
                            </div>
                            {canEdit(selectedNote) && (
                                <Button
                                    size="sm"
                                    onClick={handleUpdate}
                                    disabled={isUpdatingNote}
                                    className="bg-[#ff5018]/80 hover:bg-[#ff5018] text-white shrink-0"
                                >
                                    {isUpdatingNote
                                        ? <Loader className="size-4 animate-spin" />
                                        : <><Pencil className="size-3.5 mr-1" /> Save</>}
                                </Button>
                            )}
                        </div>
                        <Input
                            value={editTitle}
                            onChange={(e) => setEditTitle(e.target.value)}
                            disabled={!canEdit(selectedNote)}
                            className="text-lg sm:text-xl font-semibold border-none shadow-none focus-visible:ring-0 px-0 h-auto"
                        />
                        <textarea
                            value={editBody}
                            onChange={(e) => setEditBody(e.target.value)}
                            disabled={!canEdit(selectedNote)}
                            className="flex-1 resize-none border-none outline-none text-sm text-muted-foreground bg-transparent disabled:cursor-not-allowed"
                        />
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-3 p-4">
                        <FileText className="size-12" />
                        <p className="text-sm text-center">Select a note or create a new one</p>
                        <Button
                            onClick={handleNewNote}
                            variant="outline"
                            size="sm"
                        >
                            <Plus className="size-4 mr-1" /> New Note
                        </Button>
                    </div>
                )}
            </div>
        </div>
    )
}