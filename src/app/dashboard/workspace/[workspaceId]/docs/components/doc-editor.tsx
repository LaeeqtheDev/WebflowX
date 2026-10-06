"use client"

import { useEffect, useState } from "react"
import { useEditor, EditorContent } from "@tiptap/react"
import StarterKit from "@tiptap/starter-kit"
import Collaboration from "@tiptap/extension-collaboration"
import Image from "@tiptap/extension-image"
import { Table } from "@tiptap/extension-table"
import TableRow from "@tiptap/extension-table-row"
import TableCell from "@tiptap/extension-table-cell"
import TableHeader from "@tiptap/extension-table-header"
import TextAlign from "@tiptap/extension-text-align"
import Underline from "@tiptap/extension-underline"
import { TextStyle } from "@tiptap/extension-text-style"
import { Color } from "@tiptap/extension-color"
import { Loader } from "lucide-react"
import { DocToolbar } from "./doc-toolbar"
import type { LiveblocksYjsProvider } from "@liveblocks/yjs"
import type * as Y from "yjs"

interface DocOther {
    name: string
    color: string
    avatar: string
}

interface DocEditorProps {
    roomId: string
    userId: string
    userName: string
    userColor: string
    userAvatar?: string
    onOthersChange?: (others: DocOther[]) => void
}

const EditorInner = ({
    ydoc,
    userName,
    userColor,
}: {
    ydoc: Y.Doc
    userName: string
    userColor: string
}) => {
    const editor = useEditor({
        immediatelyRender: false,
        extensions: [
            StarterKit.configure({
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
            Image,
            Table.configure({ resizable: false }),
            TableRow,
            TableCell,
            TableHeader,
            TextAlign.configure({ types: ["heading", "paragraph"] }),
            Underline,
            TextStyle,
            Color,
        ],
        editorProps: {
            attributes: {
                class: "outline-none min-h-[calc(100vh-200px)] px-14 py-12 max-w-none focus:outline-none"
            }
        }
    })

    return (
        <div className="flex flex-col h-full">
            {editor && (
                <div className="bg-white border-b border-[#381d2a]/12 sticky top-0 z-10">
                    <DocToolbar editor={editor} />
                </div>
            )}
            <div className="flex-1 overflow-y-auto bg-[#fbf9f7] py-8 px-4">
                <div className="max-w-3xl mx-auto bg-white rounded-xl shadow-sm border border-[#381d2a]/12 min-h-[calc(100vh-200px)]">
                    <EditorContent editor={editor} />
                </div>
            </div>
        </div>
    )
}

export const DocEditor = ({
    roomId, userId, userName, userColor, userAvatar, onOthersChange
}: DocEditorProps) => {
    const [provider, setProvider] = useState<LiveblocksYjsProvider | null>(null)
    const [ydoc, setYdoc] = useState<Y.Doc | null>(null)
    const [others, setOthers] = useState<DocOther[]>([])

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
                        const res = await fetch("/api/liveblocks-auth", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({
                                room,
                                userId,
                                userInfo: {
                                    name: userName,
                                    color: userColor,
                                    avatar: userAvatar ?? ""
                                }
                            })
                        })
                        return await res.json()
                    }
                })

                const { room, leave } = client.enterRoom(roomId)
                leaveRoom = leave

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
                    setYdoc(doc)
                    setProvider(createdProvider)
                }
            } catch (e) {
                console.error("DocEditor init error:", e)
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
    }, [roomId, userId, userName, userColor, userAvatar])

    if (!ydoc || !provider) {
        return (
            <div className="flex items-center justify-center h-full bg-[#fbf9f7]">
                <div className="flex flex-col items-center gap-2">
                    <Loader className="size-5 animate-spin text-[#ff5018]" />
                    <p className="text-xs text-[#1b1017]/60">Connecting to document...</p>
                </div>
            </div>
        )
    }

    return (
        <div className="flex flex-col h-full">
            {/* Also editing bar */}
            {others.length > 0 && (
                <div className="flex items-center gap-2 px-4 py-1.5 bg-white border-b border-[#381d2a]/12 text-xs shrink-0">
                    <div className="flex items-center gap-1.5">
                        <div className="size-1.5 rounded-full bg-green-500 animate-pulse" />
                        <span className="text-[#1b1017]/60 font-medium">Also editing:</span>
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
                userName={userName}
                userColor={userColor}
            />
        </div>
    )
}