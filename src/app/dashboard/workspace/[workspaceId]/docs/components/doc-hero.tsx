"use client"

import { useEffect, useLayoutEffect, useMemo, useRef, useState, useSyncExternalStore } from "react"
import type * as Y from "yjs"
import { Check, FileText, ImageIcon } from "lucide-react"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { IconPicker, RenderIcon } from "@/features/pages/page-icons"
import { cn } from "@/lib/utils"

// The band across the top of a page. The choice lives in the page's shared document (not the database),
// so a change shows up for everyone on the page straight away.
export const COVERS = [
    { id: "ember", name: "Ember", css: "linear-gradient(100deg, #ff5018 0%, #ff7a45 46%, #ffc9a8 100%)" },
    { id: "plum", name: "Plum", css: "linear-gradient(100deg, #381d2a 0%, #7b2f4a 56%, #ff5018 100%)" },
    { id: "sand", name: "Sand", css: "linear-gradient(100deg, #efe1d6 0%, #f7d9c4 50%, #ffc7a6 100%)" },
    { id: "dusk", name: "Dusk", css: "linear-gradient(100deg, #4b2a6b 0%, #a2487f 56%, #ff9a76 100%)" },
    { id: "sea", name: "Sea", css: "linear-gradient(100deg, #0f5e63 0%, #2f9c95 56%, #bfe8d6 100%)" },
    { id: "ink", name: "Ink", css: "linear-gradient(100deg, #1b1017 0%, #381d2a 60%, #5a2f43 100%)" },
] as const

const DEFAULT_COVER = "ember"
const META = "wfx-meta"

const useCover = (ydoc: Y.Doc) => {
    const map = useMemo(() => ydoc.getMap<string>(META), [ydoc])
    const cover = useSyncExternalStore(
        (cb) => { map.observe(cb); return () => map.unobserve(cb) },
        () => map.get("cover") ?? DEFAULT_COVER,
        () => DEFAULT_COVER,
    )
    return [cover, (id: string) => map.set("cover", id)] as const
}

const CoverPicker = ({ value, onChange, children }: { value: string; onChange: (id: string) => void; children: React.ReactNode }) => {
    const [open, setOpen] = useState(false)
    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>{children}</PopoverTrigger>
            <PopoverContent align="end" className="w-64 rounded-xl border-plum/12 p-3">
                <p className="mb-2 text-xs font-semibold tracking-tight text-ink">Cover</p>
                <div className="grid grid-cols-3 gap-2">
                    {COVERS.map((c) => (
                        <button
                            key={c.id}
                            type="button"
                            aria-label={`${c.name} cover`}
                            aria-pressed={value === c.id}
                            onClick={() => { onChange(c.id); setOpen(false) }}
                            className={cn("relative h-10 rounded-lg outline-offset-2 transition-transform hover:scale-[1.04] focus-visible:outline-2 focus-visible:outline-brand motion-reduce:transition-none motion-reduce:hover:scale-100", value === c.id && "ring-2 ring-brand ring-offset-2 ring-offset-popover")}
                            style={{ background: c.css }}
                        >
                            {value === c.id && <Check className="absolute inset-0 m-auto size-4 text-white drop-shadow" aria-hidden="true" />}
                        </button>
                    ))}
                </div>
                <button
                    type="button"
                    onClick={() => { onChange("none"); setOpen(false) }}
                    className="mt-2 h-8 w-full rounded-lg text-xs font-medium text-ink/70 hover:bg-cream-deep hover:text-ink"
                >
                    Remove cover
                </button>
            </PopoverContent>
        </Popover>
    )
}

const fitHeight = (el: HTMLTextAreaElement | null) => {
    if (!el) return
    el.style.height = "auto"
    el.style.height = `${el.scrollHeight}px`
}

export interface DocHeroProps {
    title: string
    icon: string | null
    // resolves to false when the new title could not be saved
    onRename: (title: string) => Promise<boolean>
    onIconChange: (icon: string | null) => void
}

// Cover, icon tile, the big title and the row of chips under it.
export const DocHero = ({ ydoc, title, icon, onRename, onIconChange, chips, onLeaveTitle }: DocHeroProps & {
    ydoc: Y.Doc
    chips?: React.ReactNode
    // Enter or the down arrow in the title moves on into the page
    onLeaveTitle?: () => void
}) => {
    const [cover, setCover] = useCover(ydoc)
    const hasCover = cover !== "none"
    const coverCss = COVERS.find((c) => c.id === cover)?.css ?? COVERS[0].css

    // While the title is being typed (and until the save comes back) the box shows the draft.
    const [draft, setDraft] = useState<string | null>(null)
    const [editing, setEditing] = useState(false)
    if (!editing && draft !== null && draft === title) setDraft(null)
    const shown = draft ?? title

    const box = useRef<HTMLTextAreaElement>(null)
    const cancelled = useRef(false)
    useLayoutEffect(() => fitHeight(box.current), [shown])
    useEffect(() => {
        const el = box.current
        if (!el || typeof ResizeObserver === "undefined") return
        // a narrower column wraps the title onto more lines
        let width = el.clientWidth
        const ro = new ResizeObserver(() => { if (el.clientWidth !== width) { width = el.clientWidth; fitHeight(el) } })
        ro.observe(el)
        return () => ro.disconnect()
    }, [])

    const save = async () => {
        setEditing(false)
        if (cancelled.current) { cancelled.current = false; setDraft(null); return }
        const next = (draft ?? title).trim().replace(/\s+/g, " ")
        if (!next || next === title) { setDraft(null); return }
        setDraft(next)
        if (!(await onRename(next))) setDraft(null)
    }

    return (
        <div className="wfx-hero">
            {hasCover && (
                <div className="group/cover relative h-28 w-full sm:h-36" style={{ background: coverCss }}>
                    <CoverPicker value={cover} onChange={setCover}>
                        <button type="button" className="absolute bottom-2.5 right-3 flex h-7 items-center gap-1.5 rounded-lg bg-black/25 px-2.5 text-[11px] font-semibold text-white opacity-0 backdrop-blur-sm transition-opacity hover:bg-black/40 focus-visible:opacity-100 group-hover/cover:opacity-100 max-md:opacity-100 data-[state=open]:opacity-100 sm:right-5">
                            <ImageIcon className="size-3.5" aria-hidden="true" /> Change cover
                        </button>
                    </CoverPicker>
                </div>
            )}

            <div className="mx-auto w-full max-w-[46rem] px-5 sm:px-10">
                <div className={cn("group/top flex items-end gap-3", hasCover ? "-mt-9 sm:-mt-10" : "pt-10 sm:pt-14")}>
                    <IconPicker value={icon} onChange={onIconChange}>
                        <button
                            type="button"
                            aria-label="Change icon"
                            className="relative flex size-[4.5rem] shrink-0 items-center justify-center rounded-2xl border border-plum/10 bg-surface shadow-[0_1px_2px_rgba(56,29,42,0.06),0_10px_28px_-10px_rgba(56,29,42,0.28)] transition-transform hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand motion-reduce:transition-none motion-reduce:hover:translate-y-0 sm:size-20"
                        >
                            {icon
                                ? <RenderIcon value={icon} className="size-9 text-[2.25rem] text-brand sm:size-10 sm:text-[2.5rem]" />
                                : <FileText className="size-9 text-brand sm:size-10" aria-hidden="true" />}
                        </button>
                    </IconPicker>
                    {!hasCover && (
                        <CoverPicker value={cover} onChange={setCover}>
                            <button type="button" className="mb-1 flex h-7 items-center gap-1.5 rounded-lg px-2 text-[11px] font-semibold text-ink/60 opacity-0 transition-opacity hover:bg-cream-deep hover:text-ink focus-visible:opacity-100 group-hover/top:opacity-100 max-md:opacity-100 data-[state=open]:opacity-100">
                                <ImageIcon className="size-3.5" aria-hidden="true" /> Add cover
                            </button>
                        </CoverPicker>
                    )}
                </div>

                <textarea
                    ref={box}
                    rows={1}
                    value={shown}
                    maxLength={120}
                    placeholder="Untitled"
                    aria-label="Page title"
                    spellCheck={false}
                    onFocus={() => { setEditing(true); setDraft(title) }}
                    onChange={(e) => setDraft(e.target.value.replace(/\n/g, " "))}
                    onBlur={save}
                    onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === "ArrowDown") { e.preventDefault(); e.currentTarget.blur(); onLeaveTitle?.() }
                        if (e.key === "Escape") { cancelled.current = true; e.currentTarget.blur() }
                    }}
                    className="wfx-hero-title mt-4 block w-full resize-none overflow-hidden bg-transparent text-ink outline-none placeholder:text-ink/25 sm:mt-5"
                />

                {chips && <div className="mt-2.5 flex flex-wrap items-center gap-2">{chips}</div>}
            </div>
        </div>
    )
}

// A small rounded label under the title. "live" is the orange one.
export const HeroChip = ({ live, children, className }: { live?: boolean; children: React.ReactNode; className?: string }) => (
    <span className={cn(
        "inline-flex h-7 items-center gap-1.5 rounded-full px-3 text-xs font-semibold",
        live ? "bg-brand/12 text-orange-ink" : "bg-cream-deep text-ink/65",
        className,
    )}>
        {children}
    </span>
)
