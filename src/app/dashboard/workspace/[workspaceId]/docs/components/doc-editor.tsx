"use client"

import { useEffect, useRef, useState } from "react"
import { useEditor, EditorContent, Extension } from "@tiptap/react"
import { yCursorPlugin } from "@tiptap/y-tiptap"
import type { Awareness } from "y-protocols/awareness"
import { useDocImageUpload } from "./use-doc-image-upload"
import StarterKit from "@tiptap/starter-kit"
import Collaboration from "@tiptap/extension-collaboration"
import Image from "@tiptap/extension-image"
import { Table } from "@tiptap/extension-table"
import TableRow from "@tiptap/extension-table-row"
import TableCell from "@tiptap/extension-table-cell"
import TableHeader from "@tiptap/extension-table-header"
import TextAlign from "@tiptap/extension-text-align"
import { TaskList, TaskItem } from "@tiptap/extension-list"
import Placeholder from "@tiptap/extension-placeholder"
import { TextStyle } from "@tiptap/extension-text-style"
import { Color } from "@tiptap/extension-color"
import { Loader, AlertCircle, Cloud, CloudOff } from "lucide-react"
import { useMutation } from "convex/react"
import { api } from "../../../../../../../convex/_generated/api"
import type { Id } from "../../../../../../../convex/_generated/dataModel"
import { templateHtml } from "./templates"
import { DocToolbar } from "./doc-toolbar"
import type { LiveblocksYjsProvider } from "@liveblocks/yjs"
import type * as Y from "yjs"

interface DocOther {
    name: string
    color: string
    avatar: string
}

type ConnStatus = "initial" | "connecting" | "connected" | "reconnecting" | "disconnected"

interface DocEditorProps {
    docId: Id<"docs">
    template?: string | null
    onTemplateUsed?: () => void
    roomId: string
    userId: string
    userName: string
    userColor: string
    userAvatar?: string
    onOthersChange?: (others: DocOther[]) => void
}

// Shows other people's carets and selections (name label in their colour)
const cursorBuilder = (user: { name?: string; color?: string }) => {
    const caret = document.createElement("span")
    caret.className = "collab-caret"
    caret.style.borderColor = user.color ?? "#ff5018"
    const label = document.createElement("div")
    label.className = "collab-caret__label"
    label.style.backgroundColor = user.color ?? "#ff5018"
    label.textContent = user.name ?? "Someone"
    caret.append(label)
    return caret
}
const makeCaretExtension = (awareness: Awareness) =>
    Extension.create({
        name: "collabCaret",
        addProseMirrorPlugins() {
            return [yCursorPlugin(awareness, { cursorBuilder })]
        },
    })

const EditorInner = ({
    ydoc,
    awareness,
    userName,
    userColor,
    docId,
    template,
    onTemplateUsed,
    status,
}: {
    ydoc: Y.Doc
    awareness: Awareness
    userName: string
    userColor: string
    docId: Id<"docs">
    template?: string | null
    onTemplateUsed?: () => void
    status: ConnStatus
}) => {
    const touch = useMutation(api.docs.touch)
    const touchTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
    const [words, setWords] = useState(0)
    const templateApplied = useRef(false)
    const uploadImage = useDocImageUpload()
    const editorRef = useRef<ReturnType<typeof useEditor>>(null)
    const uploadRef = useRef(uploadImage)
    useEffect(() => { uploadRef.current = uploadImage }, [uploadImage])

    useEffect(() => {
        awareness.setLocalStateField("user", { name: userName, color: userColor })
    }, [awareness, userName, userColor])

    const insertImages = (files: File[]) => {
        files.forEach(async (file) => {
            const src = await uploadRef.current(file)
            if (src) editorRef.current?.chain().focus().setImage({ src }).run()
        })
    }

    const editor = useEditor({
        immediatelyRender: false,
        extensions: [
            StarterKit.configure({
                // history is handled by Yjs
                undoRedo: false,
                link: { openOnClick: false, autolink: true, HTMLAttributes: { rel: "noopener noreferrer nofollow", target: "_blank" } },
                heading: { levels: [1, 2, 3] },
                bulletList: {
                    keepMarks: true,
                    keepAttributes: false,
                },
                orderedList: {
                    keepMarks: true,
                    keepAttributes: false,
                },
            }),
            Collaboration.configure({ document: ydoc }),
            makeCaretExtension(awareness),
            Image,
            Table.configure({ resizable: false }),
            TableRow,
            TableCell,
            TableHeader,
            TextAlign.configure({ types: ["heading", "paragraph"] }),
            TaskList,
            TaskItem.configure({ nested: true }),
            Placeholder.configure({ placeholder: "Start writing, or type / for ideas…" }),
            TextStyle,
            Color,
        ],
        onUpdate: ({ editor: ed }) => {
            setWords(ed.getText().trim().split(/\s+/).filter(Boolean).length)
            if (touchTimer.current) clearTimeout(touchTimer.current)
            touchTimer.current = setTimeout(() => { touch({ id: docId }).catch(() => undefined) }, 4000)
        },
        onCreate: ({ editor: ed }) => {
            setWords(ed.getText().trim().split(/\s+/).filter(Boolean).length)
        },
        editorProps: {
            handlePaste: (_view, event) => {
                const files = Array.from(event.clipboardData?.files ?? []).filter((f) => f.type.startsWith("image/"))
                if (files.length === 0) return false
                event.preventDefault()
                insertImages(files)
                return true
            },
            handleDrop: (_view, event) => {
                const files = Array.from((event as DragEvent).dataTransfer?.files ?? []).filter((f) => f.type.startsWith("image/"))
                if (files.length === 0) return false
                event.preventDefault()
                insertImages(files)
                return true
            },
            attributes: {
                class: "outline-none min-h-[calc(100vh-200px)] px-14 py-12 max-w-none focus:outline-none"
            }
        }
    })

    useEffect(() => { editorRef.current = editor }, [editor])

    useEffect(() => () => { if (touchTimer.current) clearTimeout(touchTimer.current) }, [])

    // New doc from a template: fill it once, only if nobody has written anything yet
    useEffect(() => {
        if (!editor || !template || templateApplied.current) return
        templateApplied.current = true
        const html = templateHtml(template)
        if (html && editor.isEmpty) editor.commands.setContent(html)
        onTemplateUsed?.()
    }, [editor, template, onTemplateUsed])

    return (
        <div className="flex flex-col flex-1 min-h-0">
            {editor && (
                <div className="bg-surface border-b border-plum/12 sticky top-0 z-10">
                    <DocToolbar editor={editor} />
                </div>
            )}
            <div className="flex-1 overflow-y-auto bg-cream-soft py-8 px-4">
                <div className="max-w-3xl mx-auto bg-surface rounded-xl shadow-sm border border-plum/12 min-h-[calc(100vh-200px)]">
                    <EditorContent editor={editor} />
                </div>
            </div>
            <div className="flex items-center justify-between gap-3 border-t border-plum/12 bg-surface px-4 py-1.5 text-[11px] text-ink/60 shrink-0">
                <span>{words} word{words === 1 ? "" : "s"} · {Math.max(1, Math.ceil(words / 200))} min read</span>
                <span className="flex items-center gap-1.5">
                    {status === "connected" ? (
                        <><Cloud className="size-3.5 text-emerald-600 dark:text-emerald-400" /> Saved</>
                    ) : status === "disconnected" ? (
                        <><CloudOff className="size-3.5 text-red-500" /> Offline, changes will sync when you reconnect</>
                    ) : (
                        <><Loader className="size-3 animate-spin text-[#ff5018]" /> {status === "reconnecting" ? "Reconnecting…" : "Connecting…"}</>
                    )}
                </span>
            </div>
        </div>
    )
}

export const DocEditor = ({
    docId, template, onTemplateUsed, roomId, userId, userName, userColor, userAvatar, onOthersChange
}: DocEditorProps) => {
    const [provider, setProvider] = useState<LiveblocksYjsProvider | null>(null)
    const [ydoc, setYdoc] = useState<Y.Doc | null>(null)
    const [others, setOthers] = useState<DocOther[]>([])
    const [status, setStatus] = useState<ConnStatus>("connecting")
    const [failed, setFailed] = useState(false)
    const [attempt, setAttempt] = useState(0)

    useEffect(() => {
        let leaveRoom: (() => void) | null = null
        let yProvider: LiveblocksYjsProvider | null = null
        let mounted = true

        const init = async () => {
            try {
                const { createClient } = await import("@liveblocks/client")
                const { LiveblocksYjsProvider } = await import("@liveblocks/yjs")
                const Y = await import("yjs")

                const client = createClient({
                    authEndpoint: async (room) => {
                        // identity comes from the signed-in session on the server
                        const res = await fetch("/api/liveblocks-auth", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ room })
                        })
                        if (!res.ok) throw new Error("Not allowed to open this document")
                        return await res.json()
                    }
                })

                const { room, leave } = client.enterRoom(roomId)
                leaveRoom = leave
                room.subscribe("status", (st) => { if (mounted) setStatus(st as ConnStatus) })

                room.subscribe("others", (roomOthers) => {
                    const activeOthers: DocOther[] = roomOthers.map((o) => ({
                        name: ((o.presence as Record<string, unknown> | undefined)?.name ?? (o.info as Record<string, unknown> | undefined)?.name ?? "Anonymous") as string,
                        color: ((o.presence as Record<string, unknown> | undefined)?.color ?? (o.info as Record<string, unknown> | undefined)?.color ?? "#ff5018") as string,
                        avatar: ((o.info as Record<string, unknown> | undefined)?.avatar ?? "") as string,
                    }))
                    setOthers(activeOthers)
                    onOthersChange?.(activeOthers)
                })

                const doc = new Y.Doc()
                const createdProvider = new LiveblocksYjsProvider(room, doc)
                yProvider = createdProvider

                await new Promise<void>((resolve) => {
                    createdProvider.on("sync", () => resolve())
                    setTimeout(() => resolve(), 5000)
                })

                if (mounted) {
                    setFailed(false)
                    setYdoc(doc)
                    setProvider(createdProvider)
                }
            } catch (e) {
                console.error("DocEditor init error:", e)
                if (mounted) setFailed(true)
            }
        }

        init()

        return () => {
            mounted = false
            setProvider(null)
            setYdoc(null)
            try { yProvider?.destroy() } catch {}
            try { leaveRoom?.() } catch {}
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [roomId, attempt])

    if (failed) {
        return (
            <div className="flex h-full items-center justify-center bg-cream-soft">
                <div className="flex flex-col items-center gap-3 text-center px-4">
                    <AlertCircle className="size-6 text-red-500" />
                    <p className="text-sm font-semibold text-ink">Couldn&apos;t open this document</p>
                    <p className="text-xs text-ink/60">Check your connection and try again.</p>
                    <button
                        onClick={() => { setFailed(false); setAttempt((a) => a + 1) }}
                        className="rounded-lg bg-[#ff5018] px-4 py-2 text-xs font-semibold text-white hover:bg-[#e6430f]"
                    >
                        Retry
                    </button>
                </div>
            </div>
        )
    }

    if (!ydoc || !provider) {
        return (
            <div className="flex items-center justify-center h-full bg-cream-soft">
                <div className="flex flex-col items-center gap-2">
                    <Loader className="size-5 animate-spin text-[#ff5018]" />
                    <p className="text-xs text-ink/60">Connecting to document...</p>
                </div>
            </div>
        )
    }

    return (
        <div className="flex flex-col h-full min-h-0">
            {(status === "reconnecting" || status === "disconnected") && (
                <div role="status" className="flex shrink-0 items-center gap-2 border-b border-amber-200 dark:border-amber-500/30 bg-amber-50 dark:bg-amber-500/10 px-4 py-2 text-xs font-medium text-amber-800 dark:text-amber-200">
                    <Loader className="size-3.5 animate-spin" />
                    {status === "reconnecting"
                        ? "Connection lost. Reconnecting… keep typing, your changes are kept on this device and will sync automatically."
                        : "You're offline. Changes stay on this device and will sync when the connection returns."}
                </div>
            )}
            {/* Also editing bar */}
            {others.length > 0 && (
                <div className="flex items-center gap-2 px-4 py-1.5 bg-surface border-b border-plum/12 text-xs shrink-0">
                    <div className="flex items-center gap-1.5">
                        <div className="size-1.5 rounded-full bg-green-500 animate-pulse" />
                        <span className="text-ink/60 font-medium">Also editing:</span>
                    </div>
                    {others.map((o, i) => (
                        <div
                            key={i}
                            className="flex items-center gap-1 px-2 py-0.5 rounded-md text-white text-[11px] font-medium"
                            style={{ backgroundColor: o.color }}
                        >
                            {o.name}
                        </div>
                    ))}
                </div>
            )}
            <EditorInner
                ydoc={ydoc}
                awareness={provider.awareness as unknown as Awareness}
                userName={userName}
                userColor={userColor}
                docId={docId}
                template={template}
                onTemplateUsed={onTemplateUsed}
                status={status}
            />
        </div>
    )
}