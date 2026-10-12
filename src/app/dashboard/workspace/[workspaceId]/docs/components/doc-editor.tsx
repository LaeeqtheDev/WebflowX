"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useEditor, EditorContent, Extension } from "@tiptap/react"
import { yCursorPlugin, ySyncPluginKey } from "@tiptap/y-tiptap"
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
import { SlashMenu } from "./slash-menu"
import { Callout } from "./callout"
import { DocHero, HeroChip, type DocHeroProps } from "./doc-hero"
import { PresenceAvatars, foldPeople, initialsOf, inkOn, jumpToPerson, safeColor, typingLabel, type ClientInfo, type DocPerson } from "./presence"
import type { LiveblocksYjsProvider } from "@liveblocks/yjs"
import type * as Y from "yjs"

type ConnStatus = "initial" | "connecting" | "connected" | "reconnecting" | "disconnected"

interface DocEditorProps {
    docId?: Id<"docs">
    // when the editor is the body of a database row
    rowId?: Id<"dbRows">
    compact?: boolean
    customHtml?: string | null
    template?: string | null
    onTemplateUsed?: () => void
    roomId: string
    userId: string
    userName: string
    userColor: string
    userAvatar?: string
    // cover, icon and the big title above the page body (full pages only)
    hero?: DocHeroProps & { notes?: string[] }
    // everyone with the page open, you last; the page header shows them as a stack of faces
    onPresenceChange?: (people: DocPerson[]) => void
}

// A name tag opens while its owner is moving or typing, then folds down to just their face so it
// stays out of the way of the text. Kept here (not on the element) because the editor may redraw a caret.
const TAG_OPEN_MS = 3500
const openUntil = new Map<number, number>()
const closeTimers = new Map<number, ReturnType<typeof setTimeout>>()
const caretOf = (root: ParentNode, clientId: number) => root.querySelector<HTMLElement>(`.collab-caret[data-client="${clientId}"]`)
// near the right edge the tag hangs to the left of the caret instead, so it never runs off the page
const placeTag = (caret: HTMLElement) => {
    const page = caret.closest(".ProseMirror")
    if (page) caret.classList.toggle("collab-caret--flip", page.getBoundingClientRect().right - caret.getBoundingClientRect().left < 190)
}
const wakeCaret = (root: ParentNode, clientId: number) => {
    openUntil.set(clientId, Date.now() + TAG_OPEN_MS)
    const caret = caretOf(root, clientId)
    if (caret) { caret.classList.add("is-active"); placeTag(caret) }
    clearTimeout(closeTimers.get(clientId))
    closeTimers.set(clientId, setTimeout(() => {
        closeTimers.delete(clientId)
        openUntil.delete(clientId)
        caretOf(root, clientId)?.classList.remove("is-active")
    }, TAG_OPEN_MS))
}

// Other people's carets: a line in their colour with a name tag (face + name) hanging off it.
const makeCursorBuilder = (lookup: (clientId: number) => ClientInfo | undefined) =>
    (user: { name?: string; color?: string }, clientId: number) => {
        const color = safeColor(user.color)
        const who = lookup(clientId)
        const name = who?.name || user.name || "Someone"

        const caret = document.createElement("span")
        caret.className = (openUntil.get(clientId) ?? 0) > Date.now() ? "collab-caret is-active" : "collab-caret"
        caret.dataset.client = String(clientId)
        caret.style.setProperty("--who", color)
        caret.style.setProperty("--who-ink", inkOn(color))

        const label = document.createElement("span")
        label.className = "collab-caret__label"

        const face = document.createElement("span")
        face.className = "collab-caret__face"
        face.textContent = initialsOf(name).slice(0, 1)
        // data saver shows the initial instead of downloading the photo
        if (who?.avatar && document.documentElement.dataset.lowdata !== "1") {
            const img = document.createElement("img")
            img.alt = ""
            img.draggable = false
            img.referrerPolicy = "no-referrer"
            img.onerror = () => img.remove()
            img.src = who.avatar
            face.append(img)
        }

        const text = document.createElement("span")
        text.className = "collab-caret__name"
        text.textContent = name

        label.append(face, text)
        caret.append(label)
        // it can only be measured once the editor has put it on the page
        requestAnimationFrame(() => placeTag(caret))
        return caret
    }
const selectionBuilder = (user: { color?: string }) => ({
    class: "collab-selection",
    style: `background-color: color-mix(in srgb, ${safeColor(user.color)} 24%, transparent)`,
})
const makeCaretExtension = (awareness: Awareness, lookup: (clientId: number) => ClientInfo | undefined) =>
    Extension.create({
        name: "collabCaret",
        addProseMirrorPlugins() {
            return [yCursorPlugin(awareness, { cursorBuilder: makeCursorBuilder(lookup), selectionBuilder })]
        },
    })

// The Liveblocks client injects its "Powered by" badge into <body> and never takes it down, so it
// would stay on every page after a doc is closed. Remove it once the last open doc is gone.
let openDocs = 0
const removeBadge = () => { if (openDocs === 0) document.getElementById("liveblocks-badge")?.remove() }

export const EditorInner = ({
    ydoc,
    awareness,
    userName,
    userColor,
    docId,
    rowId,
    compact,
    customHtml,
    template,
    onTemplateUsed,
    status,
    lookup,
    hero,
    people,
}: {
    ydoc: Y.Doc
    awareness: Awareness
    userName: string
    userColor: string
    docId?: Id<"docs">
    rowId?: Id<"dbRows">
    compact?: boolean
    customHtml?: string | null
    template?: string | null
    onTemplateUsed?: () => void
    status: ConnStatus
    lookup: (clientId: number) => ClientInfo | undefined
    hero?: DocHeroProps & { notes?: string[] }
    people: DocPerson[]
}) => {
    const touch = useMutation(api.docs.touch)
    const touchRow = useMutation(api.databases.touchRow)
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

    // open someone's name tag whenever they move or type
    useEffect(() => {
        const onChange = ({ added, updated }: { added: number[]; updated: number[] }) => {
            const ids = [...added, ...updated].filter((id) => id !== awareness.doc.clientID)
            if (!ids.length) return
            // wait for the editor to draw the carets for this change
            requestAnimationFrame(() => {
                const root = editorRef.current?.view.dom
                if (root) ids.forEach((id) => wakeCaret(root, id))
            })
        }
        awareness.on("change", onChange)
        return () => { awareness.off("change", onChange) }
    }, [awareness])

    // "typing" goes out once when you start and once when you pause, not on every key
    const typing = useRef(false)
    const typingTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
    const markTyping = () => {
        if (!typing.current) {
            typing.current = true
            awareness.setLocalStateField("activity", { typing: true })
        }
        if (typingTimer.current) clearTimeout(typingTimer.current)
        typingTimer.current = setTimeout(() => {
            typing.current = false
            awareness.setLocalStateField("activity", { typing: false })
        }, 1600)
    }

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
            makeCaretExtension(awareness, lookup),
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
            Callout,
        ],
        onUpdate: ({ editor: ed, transaction }) => {
            setWords(ed.getText().trim().split(/\s+/).filter(Boolean).length)
            // someone else's edit arriving is not you typing, and must not mark the page as edited by you
            const sync = transaction.getMeta(ySyncPluginKey) as { isChangeOrigin?: boolean; isUndoRedoOperation?: boolean } | undefined
            if (sync?.isChangeOrigin && !sync.isUndoRedoOperation) return
            markTyping()
            if (touchTimer.current) clearTimeout(touchTimer.current)
            touchTimer.current = setTimeout(() => { (rowId ? touchRow({ rowId }) : docId ? touch({ id: docId }) : Promise.resolve()).catch(() => undefined) }, 4000)
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
                class: compact ? "wfx-doc outline-none min-h-[240px] px-6 py-5 max-w-none focus:outline-none" : "wfx-doc wfx-doc--page outline-none min-h-[50vh] pt-6 pb-40 max-w-none focus:outline-none"
            }
        }
    })

    useEffect(() => { editorRef.current = editor }, [editor])

    useEffect(() => () => {
        if (touchTimer.current) clearTimeout(touchTimer.current)
        if (typingTimer.current) clearTimeout(typingTimer.current)
    }, [])

    // New doc from a template: fill it once, only if nobody has written anything yet
    useEffect(() => {
        if (!editor || !template || templateApplied.current) return
        templateApplied.current = true
        let html = template === "custom" ? (customHtml ?? "") : templateHtml(template)
        // the page title already sits above the body, so the built-in templates don't repeat it as a heading
        if (hero && template !== "custom") html = html.replace(/^<h1>[^<]*<\/h1>/, "")
        if (html && editor.isEmpty) editor.commands.setContent(html)
        onTemplateUsed?.()
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [editor, template, customHtml, onTemplateUsed])

    const minutes = Math.max(1, Math.ceil(words / 200))

    return (
        <div className="flex flex-col flex-1 min-h-0">
            {editor && (
                <div className="bg-surface border-b border-plum/12 sticky top-0 z-10">
                    <DocToolbar editor={editor} />
                </div>
            )}
            {compact ? (
                <div className="flex-1 overflow-y-auto bg-cream-soft p-3">
                    <div className="bg-surface rounded-xl border border-plum/12">
                        <EditorContent editor={editor} />
                        {editor && <SlashMenu editor={editor} onImages={insertImages} />}
                    </div>
                </div>
            ) : (
                <div className="flex-1 overflow-y-auto bg-surface">
                    {hero && (
                        <DocHero
                            ydoc={ydoc}
                            title={hero.title}
                            icon={hero.icon}
                            onRename={hero.onRename}
                            onIconChange={hero.onIconChange}
                            onLeaveTitle={() => editor?.commands.focus("start")}
                            chips={
                                <>
                                    {people.length > 1 && (
                                        <HeroChip live>
                                            <span className="wfx-live-dot" aria-hidden="true" />
                                            {people.length} people here
                                        </HeroChip>
                                    )}
                                    {hero.notes?.map((n) => <HeroChip key={n}>{n}</HeroChip>)}
                                    {words > 0 && <HeroChip>{words.toLocaleString()} word{words === 1 ? "" : "s"} · {minutes} min read</HeroChip>}
                                </>
                            }
                        />
                    )}
                    <div className="mx-auto w-full max-w-[46rem] px-5 sm:px-10">
                        <EditorContent editor={editor} />
                        {editor && <SlashMenu editor={editor} onImages={insertImages} />}
                    </div>
                </div>
            )}
            <div className="flex items-center justify-between gap-3 border-t border-plum/12 bg-surface px-4 py-1.5 text-[11px] text-ink/60 shrink-0">
                <span className="truncate">{hero ? "Type / to add a block" : `${words} word${words === 1 ? "" : "s"} · ${minutes} min read`}</span>
                <span className="flex shrink-0 items-center gap-1.5">
                    {status === "connected" ? (
                        <><Cloud className="size-3.5 text-emerald-600 dark:text-emerald-400" /> Saved</>
                    ) : status === "disconnected" ? (
                        <><CloudOff className="size-3.5 text-red-500" /> Offline, changes will sync when you reconnect</>
                    ) : (
                        <><Loader className="size-3 animate-spin text-brand" /> {status === "reconnecting" ? "Reconnecting…" : "Connecting…"}</>
                    )}
                </span>
            </div>
        </div>
    )
}

export const DocEditor = ({
    docId, rowId, compact, customHtml, template, onTemplateUsed, roomId, userName, userColor, userAvatar, hero, onPresenceChange
}: DocEditorProps) => {
    const [provider, setProvider] = useState<LiveblocksYjsProvider | null>(null)
    const [ydoc, setYdoc] = useState<Y.Doc | null>(null)
    const [others, setOthers] = useState<DocPerson[]>([])
    const [selfId, setSelfId] = useState("self")
    // open tab -> who it is, read by the caret labels
    const clients = useRef(new Map<number, ClientInfo>())
    const lookup = useCallback((clientId: number) => clients.current.get(clientId), [])
    const [status, setStatus] = useState<ConnStatus>("connecting")
    const [failed, setFailed] = useState(false)
    const [attempt, setAttempt] = useState(0)

    useEffect(() => {
        let leaveRoom: (() => void) | null = null
        let yProvider: LiveblocksYjsProvider | null = null
        let mounted = true
        openDocs += 1

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
                // carets move constantly; only re-render when who is here (or who is typing) changes
                let seen = ""
                const readPeople = () => {
                    const me = room.getSelf()?.id ?? null
                    const next = foldPeople(room.getOthers(), me, clients.current)
                    const sig = `${me}|` + next.map((p) => `${p.id}:${p.name}:${p.color}:${p.avatar}:${p.typing}:${p.clientIds.join(",")}`).join("|")
                    if (sig === seen || !mounted) return
                    seen = sig
                    setOthers(next)
                    if (me) setSelfId(me)
                }
                room.subscribe("others", readPeople)
                // who "you" are is only known once connected
                room.subscribe("status", (st) => { if (mounted) setStatus(st as ConnStatus); readPeople() })

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
            openDocs -= 1
            removeBadge()
            // the badge can be injected a moment after connecting, so check again shortly after leaving
            setTimeout(removeBadge, 1500)
        }
    }, [roomId, attempt])

    const people = useMemo<DocPerson[]>(
        () => [...others, { id: selfId, name: userName, avatar: userAvatar ?? "", color: safeColor(userColor), typing: false, self: true, clientIds: [] }],
        [others, selfId, userName, userAvatar, userColor],
    )
    const notify = useRef(onPresenceChange)
    useEffect(() => { notify.current = onPresenceChange }, [onPresenceChange])
    useEffect(() => { notify.current?.(people) }, [people])
    // leaving the page clears the faces in the header
    useEffect(() => () => { notify.current?.([]) }, [])

    if (failed) {
        return (
            <div className="flex h-full items-center justify-center bg-cream-soft">
                <div className="flex flex-col items-center gap-3 text-center px-4">
                    <AlertCircle className="size-6 text-red-500" />
                    <p className="text-sm font-semibold text-ink">Couldn&apos;t open this document</p>
                    <p className="text-xs text-ink/60">Check your connection and try again.</p>
                    <button
                        onClick={() => { setFailed(false); setAttempt((a) => a + 1) }}
                        className="rounded-lg bg-brand px-4 py-2 text-xs font-semibold text-white hover:bg-brand-hover"
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
                    <Loader className="size-5 animate-spin text-brand" />
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
            {/* Row notes have no page header, so the people on them sit in a slim bar here */}
            {compact && others.length > 0 && (
                <div className="flex shrink-0 items-center gap-2.5 border-b border-plum/12 bg-surface px-4 py-1.5 text-xs">
                    <PresenceAvatars people={others} size="sm" onJump={jumpToPerson} />
                    <span role="status" className="truncate font-medium text-ink/60">
                        {typingLabel(others) ?? (others.length === 1 ? `${others[0].name} is here too` : `${others.length} others are here too`)}
                    </span>
                </div>
            )}
            <EditorInner
                ydoc={ydoc}
                awareness={provider.awareness as unknown as Awareness}
                userName={userName}
                userColor={userColor}
                docId={docId}
                rowId={rowId}
                compact={compact}
                customHtml={customHtml}
                template={template}
                onTemplateUsed={onTemplateUsed}
                status={status}
                lookup={lookup}
                hero={compact ? undefined : hero}
                people={people}
            />
        </div>
    )
}