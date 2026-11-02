"use client"

import { useMemo, useState } from "react"
import DOMPurify from "dompurify"
import type { Editor } from "@tiptap/react"
import { useMutation, useQuery } from "convex/react"
import { formatDistanceToNow, format } from "date-fns"
import { Check, History, Loader, MessageSquare, RotateCcw, Save, Trash2, Undo2, X } from "lucide-react"
import { toast } from "sonner"
import { api } from "../../../../../../../convex/_generated/api"
import type { Id } from "../../../../../../../convex/_generated/dataModel"
import { friendlyError } from "@/hooks/use-limit-handler"
import { cn } from "@/lib/utils"

export type SidePanel = "comments" | "history"

// The right-hand panel on a doc: comments (optionally quoting selected text) and version history.
export const DocSidePanel = ({ docId, editor, tab, onTab, onClose }: {
    docId: Id<"docs">; editor: Editor | null; tab: SidePanel; onTab: (t: SidePanel) => void; onClose: () => void
}) => (
    <aside aria-label={tab === "comments" ? "Comments" : "Version history"} className="flex h-full w-full flex-col border-l border-plum/12 bg-cream-soft md:w-80">
        <div className="flex h-12 shrink-0 items-center gap-1 border-b border-plum/12 px-2">
            {(["comments", "history"] as const).map((t) => (
                <button key={t} type="button" onClick={() => onTab(t)} aria-pressed={tab === t}
                    className={cn("inline-flex h-8 items-center gap-1.5 rounded-lg px-3 text-[13px] font-semibold transition-colors",
                        tab === t ? "bg-brand/10 text-orange-ink" : "text-ink/60 hover:bg-cream-deep hover:text-ink")}>
                    {t === "comments" ? <MessageSquare className="size-3.5" /> : <History className="size-3.5" />}
                    {t === "comments" ? "Comments" : "History"}
                </button>
            ))}
            <button type="button" onClick={onClose} aria-label="Close panel" className="ml-auto flex size-8 items-center justify-center rounded-lg text-ink/60 hover:bg-cream-deep hover:text-ink">
                <X className="size-4" />
            </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto">
            {tab === "comments" ? <Comments docId={docId} editor={editor} /> : <Versions docId={docId} editor={editor} />}
        </div>
    </aside>
)

const Comments = ({ docId, editor }: { docId: Id<"docs">; editor: Editor | null }) => {
    const rows = useQuery(api.docExtras.comments, { docId })
    const add = useMutation(api.docExtras.addComment)
    const resolve = useMutation(api.docExtras.resolveComment)
    const remove = useMutation(api.docExtras.deleteComment)
    const [text, setText] = useState("")
    const [replyTo, setReplyTo] = useState<Id<"docComments"> | null>(null)
    const [reply, setReply] = useState("")
    const [busy, setBusy] = useState(false)
    const [showResolved, setShowResolved] = useState(false)

    const selection = () => {
        if (!editor) return ""
        const { from, to } = editor.state.selection
        return from === to ? "" : editor.state.doc.textBetween(from, to, " ").trim()
    }
    const send = async (body: string, parentId?: Id<"docComments">) => {
        if (!body.trim()) return
        setBusy(true)
        try {
            await add({ docId, body, parentId, quote: parentId ? undefined : selection() || undefined })
            if (parentId) { setReply(""); setReplyTo(null) } else setText("")
        } catch (e) { toast.error(friendlyError(e, "Couldn't add the comment")) }
        finally { setBusy(false) }
    }
    const act = async (p: Promise<unknown>, fail: string) => { try { await p } catch (e) { toast.error(friendlyError(e, fail)) } }

    if (rows === undefined) return <div className="flex justify-center py-10"><Loader className="size-5 animate-spin text-brand" /></div>
    const top = rows.filter((c) => !c.parentId).sort((a, b) => b._creationTime - a._creationTime)
    const open = top.filter((c) => !c.resolved)
    const done = top.filter((c) => c.resolved)
    const shown = showResolved ? done : open

    return (
        <div className="flex flex-col gap-3 p-3">
            <div className="rounded-xl border border-plum/12 bg-surface p-2.5">
                <textarea value={text} onChange={(e) => setText(e.target.value)} maxLength={4000} rows={3} aria-label="New comment"
                    onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) void send(text) }}
                    placeholder="Add a comment. Select text in the page first to quote it."
                    className="w-full resize-none bg-transparent text-sm text-ink outline-none placeholder:text-ink/45" />
                <div className="flex justify-end">
                    <button type="button" onClick={() => void send(text)} disabled={busy || !text.trim()}
                        className="h-8 rounded-lg bg-brand px-3 text-xs font-semibold text-white transition-colors hover:bg-brand-hover disabled:opacity-50">Comment</button>
                </div>
            </div>
            {done.length > 0 && (
                <button type="button" onClick={() => setShowResolved((v) => !v)} className="self-start text-xs font-semibold text-orange-ink hover:underline">
                    {showResolved ? `Show open comments (${open.length})` : `Show resolved (${done.length})`}
                </button>
            )}
            {shown.length === 0 && <p className="px-1 py-6 text-center text-sm text-ink/60">{showResolved ? "No resolved comments." : "No comments yet."}</p>}
            {shown.map((c) => {
                const replies = rows.filter((r) => r.parentId === c._id).sort((a, b) => a._creationTime - b._creationTime)
                return (
                    <article key={c._id} className={cn("rounded-xl border border-plum/12 bg-surface p-3", c.resolved && "opacity-70")}>
                        {c.quote && <p className="mb-2 border-l-2 border-brand/60 pl-2 text-xs italic text-ink/65 line-clamp-3">{c.quote}</p>}
                        {[c, ...replies].map((r) => (
                            <div key={r._id} className={cn(r !== c && "mt-2 border-t border-plum/10 pt-2")}>
                                <p className="text-[12px]"><span className="font-semibold text-ink">{r.author}</span> <span className="text-ink/60">{formatDistanceToNow(r._creationTime, { addSuffix: true })}</span></p>
                                <p className="mt-0.5 whitespace-pre-wrap text-sm text-ink/85">{r.body}</p>
                                {r.mine && r !== c && (
                                    <button type="button" onClick={() => void act(remove({ id: r._id }), "Couldn't delete")} className="mt-1 text-[11px] text-ink/60 hover:text-red-600">Delete</button>
                                )}
                            </div>
                        ))}
                        {replyTo === c._id ? (
                            <div className="mt-2 flex gap-1.5">
                                <input autoFocus value={reply} onChange={(e) => setReply(e.target.value)} maxLength={4000} aria-label="Reply"
                                    onKeyDown={(e) => { if (e.key === "Enter") void send(reply, c._id); if (e.key === "Escape") setReplyTo(null) }}
                                    placeholder="Reply…" className="h-8 min-w-0 flex-1 rounded-lg border border-plum/15 bg-transparent px-2 text-sm outline-none focus:border-brand" />
                                <button type="button" onClick={() => void send(reply, c._id)} disabled={busy || !reply.trim()} className="h-8 rounded-lg bg-brand px-2.5 text-xs font-semibold text-white disabled:opacity-50">Reply</button>
                            </div>
                        ) : (
                            <div className="mt-2 flex items-center gap-3 text-[12px] font-semibold">
                                <button type="button" onClick={() => { setReplyTo(c._id); setReply("") }} className="text-orange-ink hover:underline">Reply</button>
                                <button type="button" onClick={() => void act(resolve({ id: c._id, resolved: !c.resolved }), "Couldn't update")} className="inline-flex items-center gap-1 text-ink/60 hover:text-ink">
                                    {c.resolved ? <><Undo2 className="size-3" /> Reopen</> : <><Check className="size-3" /> Resolve</>}
                                </button>
                                {c.mine && (
                                    <button type="button" onClick={() => void act(remove({ id: c._id }), "Couldn't delete")} aria-label="Delete comment" className="ml-auto text-ink/45 hover:text-red-600"><Trash2 className="size-3.5" /></button>
                                )}
                            </div>
                        )}
                    </article>
                )
            })}
        </div>
    )
}

const Versions = ({ docId, editor }: { docId: Id<"docs">; editor: Editor | null }) => {
    const rows = useQuery(api.docExtras.versions, { docId })
    const save = useMutation(api.docExtras.saveVersion)
    const [preview, setPreview] = useState<Id<"docVersions"> | null>(null)
    const [confirm, setConfirm] = useState(false)
    const picked = useQuery(api.docExtras.version, preview ? { id: preview } : "skip")
    // versions are HTML any member could have sent, so the preview is sanitised before it's shown
    const safe = useMemo(() => (picked ? DOMPurify.sanitize(picked.html, { USE_PROFILES: { html: true } }) : ""), [picked])
    const [saving, setSaving] = useState(false)

    const saveNow = async () => {
        if (!editor) return
        setSaving(true)
        try {
            const id = await save({ docId, html: editor.getHTML(), label: "Saved by hand" })
            toast.success(id ? "Version saved" : "Nothing has changed since the last version")
        } catch (e) { toast.error(friendlyError(e, "Couldn't save a version")) }
        finally { setSaving(false) }
    }
    const restore = async () => {
        if (!editor || !picked) return
        try {
            // keep what's there now, so a restore can itself be undone
            await save({ docId, html: editor.getHTML(), label: "Before restoring" })
            editor.commands.setContent(picked.html)
            toast.success(`Restored the version from ${format(picked._creationTime, "d MMM, h:mm a")}`)
            setPreview(null); setConfirm(false)
        } catch (e) { toast.error(friendlyError(e, "Couldn't restore")) }
    }

    if (rows === undefined) return <div className="flex justify-center py-10"><Loader className="size-5 animate-spin text-brand" /></div>
    return (
        <div className="flex flex-col gap-2 p-3">
            <button type="button" onClick={saveNow} disabled={saving || !editor}
                className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg border border-plum/15 bg-surface text-sm font-semibold text-ink transition-colors hover:bg-cream disabled:opacity-60">
                {saving ? <Loader className="size-3.5 animate-spin" /> : <Save className="size-3.5" />} Save a version now
            </button>
            <p className="px-1 text-xs text-ink/60">A copy is also saved every 10 minutes while people edit, and when they leave. The latest 50 are kept.</p>
            {rows.length === 0 && <p className="px-1 py-6 text-center text-sm text-ink/60">No versions yet.</p>}
            {rows.map((r) => (
                <div key={r._id} className={cn("rounded-xl border bg-surface", preview === r._id ? "border-brand/50" : "border-plum/12")}>
                    <button type="button" onClick={() => { setPreview(preview === r._id ? null : r._id); setConfirm(false) }} className="w-full px-3 py-2.5 text-left">
                        <p className="text-sm font-semibold text-ink">{format(r._creationTime, "EEE d MMM, h:mm a")}</p>
                        <p className="text-[12px] text-ink/60">{r.author}{r.label ? ` · ${r.label}` : ""}</p>
                    </button>
                    {preview === r._id && (
                        <div className="border-t border-plum/10 p-3">
                            {picked === undefined ? <Loader className="mx-auto size-4 animate-spin text-brand" /> : picked && (
                                <>
                                    <div className="max-h-56 overflow-y-auto rounded-lg bg-cream-soft p-2.5 text-[12.5px] leading-relaxed text-ink/80 [&_h1]:font-semibold [&_h2]:font-semibold [&_h3]:font-semibold"
                                        dangerouslySetInnerHTML={{ __html: safe }} />
                                    <button type="button" onClick={() => (confirm ? void restore() : setConfirm(true))}
                                        className={cn("mt-2 inline-flex h-8 w-full items-center justify-center gap-1.5 rounded-lg text-xs font-semibold transition-colors",
                                            confirm ? "bg-brand text-white hover:bg-brand-hover" : "border border-plum/15 text-ink hover:bg-cream")}>
                                        <RotateCcw className="size-3.5" /> {confirm ? "Replace the page with this version" : "Restore this version"}
                                    </button>
                                </>
                            )}
                        </div>
                    )}
                </div>
            ))}
        </div>
    )
}
