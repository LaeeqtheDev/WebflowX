"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import type { Editor } from "@tiptap/react"
import { Heading1, Heading2, Heading3, ImageIcon, Info, Lightbulb, TriangleAlert, List, ListOrdered, ListTodo, Minus, Pilcrow, Quote, SquareCode, Table2 } from "lucide-react"
import { cn } from "@/lib/utils"

type Item = { id: string; title: string; hint: string; keys: string; icon: React.ComponentType<{ className?: string }>; run: (e: Editor) => void }

const ITEMS: Item[] = [
    { id: "text", title: "Text", hint: "Plain paragraph", keys: "paragraph p", icon: Pilcrow, run: (e) => e.chain().focus().setParagraph().run() },
    { id: "h1", title: "Heading 1", hint: "Big section title", keys: "h1 title", icon: Heading1, run: (e) => e.chain().focus().setHeading({ level: 1 }).run() },
    { id: "h2", title: "Heading 2", hint: "Medium heading", keys: "h2 subtitle", icon: Heading2, run: (e) => e.chain().focus().setHeading({ level: 2 }).run() },
    { id: "h3", title: "Heading 3", hint: "Small heading", keys: "h3", icon: Heading3, run: (e) => e.chain().focus().setHeading({ level: 3 }).run() },
    { id: "bullet", title: "Bulleted list", hint: "A simple list", keys: "ul bullet list", icon: List, run: (e) => e.chain().focus().toggleBulletList().run() },
    { id: "number", title: "Numbered list", hint: "A list with numbers", keys: "ol ordered number list", icon: ListOrdered, run: (e) => e.chain().focus().toggleOrderedList().run() },
    { id: "todo", title: "To-do list", hint: "Track tasks with checkboxes", keys: "todo task checkbox check", icon: ListTodo, run: (e) => e.chain().focus().toggleTaskList().run() },
    { id: "quote", title: "Quote", hint: "Call out a passage", keys: "blockquote quote", icon: Quote, run: (e) => e.chain().focus().toggleBlockquote().run() },
    { id: "callout", title: "Callout", hint: "Highlight a key point", keys: "callout note info highlight", icon: Info, run: (e) => e.chain().focus().toggleCallout("note").run() },
    { id: "tip", title: "Tip", hint: "A helpful suggestion", keys: "tip idea hint", icon: Lightbulb, run: (e) => e.chain().focus().toggleCallout("tip").run() },
    { id: "warning", title: "Warning", hint: "Something to watch out for", keys: "warning caution alert risk", icon: TriangleAlert, run: (e) => e.chain().focus().toggleCallout("warn").run() },
    { id: "code", title: "Code block", hint: "Monospaced code", keys: "code snippet", icon: SquareCode, run: (e) => e.chain().focus().toggleCodeBlock().run() },
    { id: "divider", title: "Divider", hint: "A horizontal line", keys: "hr divider line separator", icon: Minus, run: (e) => e.chain().focus().setHorizontalRule().run() },
    { id: "image", title: "Image", hint: "Upload a picture", keys: "image picture photo upload", icon: ImageIcon, run: () => undefined },
    { id: "table", title: "Table", hint: "3 by 3 with a header", keys: "table grid", icon: Table2, run: (e) => e.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run() },
]

type Open = { from: number; to: number; query: string; x: number; y: number; up: boolean }

// "/" at the start of a line or after a space opens a menu of blocks to insert.
export const SlashMenu = ({ editor, onImages }: { editor: Editor; onImages: (files: File[]) => void }) => {
    const [state, setState] = useState<Open | null>(null)
    const [index, setIndex] = useState(0)
    const dismissed = useRef<number | null>(null)
    const fileRef = useRef<HTMLInputElement>(null)
    const stateRef = useRef<Open | null>(null)
    const indexRef = useRef(0)
    const listRef = useRef<HTMLDivElement>(null)

    const matches = state ? ITEMS.filter((i) => !state.query || `${i.title} ${i.keys}`.toLowerCase().includes(state.query.toLowerCase())) : []
    const matchesRef = useRef<Item[]>([])

    useEffect(() => { stateRef.current = state; matchesRef.current = matches; indexRef.current = index })

    const detect = useCallback(() => {
        const { selection } = editor.state
        const { $from, empty, from } = selection
        if (!empty || !$from.parent.isTextblock || $from.parent.type.name === "codeBlock") return setState(null)
        const before = $from.parent.textBetween(0, $from.parentOffset, undefined, "￼")
        const m = /(?:^|\s)\/([^\s/]{0,20})$/.exec(before)
        if (!m) { dismissed.current = null; return setState(null) }
        const slashPos = from - m[1].length - 1
        if (dismissed.current === slashPos) return setState(null)
        const c = editor.view.coordsAtPos(from)
        const up = c.bottom + 300 > window.innerHeight && c.top > 320
        setState({ from: slashPos, to: from, query: m[1], x: Math.min(c.left, window.innerWidth - 272), y: up ? c.top - 6 : c.bottom + 6, up })
        setIndex(0)
    }, [editor])

    useEffect(() => {
        editor.on("update", detect)
        editor.on("selectionUpdate", detect)
        return () => { editor.off("update", detect); editor.off("selectionUpdate", detect) }
    }, [editor, detect])

    const pick = useCallback((item: Item) => {
        const s = stateRef.current
        if (!s) return
        editor.chain().focus().deleteRange({ from: s.from, to: s.to }).run()
        if (item.id === "image") fileRef.current?.click()
        else item.run(editor)
        setState(null)
    }, [editor])

    // keys are taken before the editor sees them while the menu is open
    useEffect(() => {
        const dom = editor.view.dom
        const onKey = (e: KeyboardEvent) => {
            const s = stateRef.current
            const list = matchesRef.current
            if (!s || !list.length) return
            if (e.key === "ArrowDown" || e.key === "ArrowUp") {
                e.preventDefault(); e.stopPropagation()
                setIndex((i) => (e.key === "ArrowDown" ? (i + 1) % list.length : (i - 1 + list.length) % list.length))
            } else if (e.key === "Enter" || e.key === "Tab") {
                e.preventDefault(); e.stopPropagation()
                pick(list[Math.min(indexRef.current, list.length - 1)])
            } else if (e.key === "Escape") {
                e.preventDefault(); e.stopPropagation()
                dismissed.current = s.from
                setState(null)
            }
        }
        dom.addEventListener("keydown", onKey, true)
        return () => dom.removeEventListener("keydown", onKey, true)
    }, [editor, pick])

    useEffect(() => {
        if (!state) return
        // scrolling the menu itself must not close it, only scrolling the page behind it
        const close = (e: Event) => { if (e.target instanceof Node && listRef.current?.contains(e.target)) return; setState(null) }
        window.addEventListener("scroll", close, true)
        window.addEventListener("resize", close)
        return () => { window.removeEventListener("scroll", close, true); window.removeEventListener("resize", close) }
    }, [state])

    // keep the highlighted item in view when moving with the arrow keys
    useEffect(() => {
        listRef.current?.querySelector<HTMLElement>('[aria-selected="true"]')?.scrollIntoView({ block: "nearest" })
    }, [index, state?.query])

    return (
        <>
            <input ref={fileRef} type="file" accept="image/*" multiple hidden onChange={(e) => { const f = Array.from(e.target.files ?? []); e.target.value = ""; if (f.length) onImages(f) }} />
            {state && matches.length > 0 && (
                <div
                    ref={listRef}
                    role="listbox"
                    aria-label="Insert a block"
                    style={{ position: "fixed", left: Math.max(8, state.x), top: state.y, transform: state.up ? "translateY(-100%)" : undefined }}
                    onMouseDown={(e) => e.preventDefault()}
                    className="z-50 max-h-72 w-64 overflow-y-auto rounded-xl border border-plum/12 bg-surface p-1 shadow-lg"
                >
                    {matches.map((item, i) => (
                        <button
                            key={item.id}
                            type="button"
                            role="option"
                            aria-selected={i === index}
                            onMouseEnter={() => setIndex(i)}
                            onClick={() => pick(item)}
                            className={cn("flex w-full items-center gap-3 rounded-lg px-2 py-1.5 text-left", i === index && "bg-brand/10")}
                        >
                            <span className="flex size-8 shrink-0 items-center justify-center rounded-md border border-plum/12 bg-cream-soft"><item.icon className="size-4 text-ink/70" /></span>
                            <span className="min-w-0">
                                <span className="block text-sm font-medium text-ink">{item.title}</span>
                                <span className="block truncate text-[11px] text-ink/55">{item.hint}</span>
                            </span>
                        </button>
                    ))}
                </div>
            )}
        </>
    )
}
