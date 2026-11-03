"use client"
import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import { useMutation, useQuery } from "convex/react"
import { ArrowUp, CalendarDays, CheckSquare, FileText, Gavel, History, Loader2, MessageSquare, Plus, Sparkles, Trash2 } from "lucide-react"
import { api } from "../../../convex/_generated/api"
import type { Id } from "../../../convex/_generated/dataModel"
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet"
import { useLimitHandler } from "@/hooks/use-limit-handler"
import { cn } from "@/lib/utils"

type Source = { n: number; kind: "message" | "meeting" | "task" | "doc" | "decision"; refId: string; channelId?: string; title: string }

const ICON = { message: MessageSquare, meeting: CalendarDays, task: CheckSquare, doc: FileText, decision: Gavel }

const hrefFor = (ws: string, s: Source) => {
    const base = `/dashboard/workspace/${ws}`
    switch (s.kind) {
        case "message": return s.channelId ? `${base}/channel/${s.channelId}?message=${s.refId}` : base
        case "meeting": return `${base}/meeting?meeting=${s.refId}`
        case "task": return `${base}/tasks?task=${s.refId}`
        case "doc": return `${base}/docs/${s.refId}`
        case "decision": return `${base}/agents#decisions`
    }
}

const SUGGESTIONS = [
    "What's on my plate this week?",
    "What did we decide about pricing?",
    "Summarize what happened in the last meeting",
    "Who is working on the launch?",
]

export const AskPanel = ({ workspaceId, open, onOpenChange }: { workspaceId: Id<"workspaces">; open: boolean; onOpenChange: (open: boolean) => void }) => {
    const [threadId, setThreadId] = useState<Id<"askThreads"> | null>(null)
    const [showHistory, setShowHistory] = useState(false)
    const [text, setText] = useState("")
    const [sending, setSending] = useState(false)
    const threads = useQuery(api.ask.threads, open ? { workspaceId } : "skip")
    const messages = useQuery(api.ask.messages, open && threadId ? { threadId } : "skip")
    const send = useMutation(api.ask.send)
    const remove = useMutation(api.ask.deleteThread)
    const { handleLimitError } = useLimitHandler()
    const end = useRef<HTMLDivElement>(null)
    const input = useRef<HTMLTextAreaElement>(null)
    const busy = sending || (messages ?? []).some((m) => m.status === "thinking")

    useEffect(() => { end.current?.scrollIntoView({ block: "end" }) }, [messages])
    useEffect(() => { if (open) setTimeout(() => input.current?.focus(), 50) }, [open, threadId])

    const ask = async (q: string) => {
        const question = q.trim()
        if (!question || busy) return
        setSending(true)
        try {
            const id = await send({ workspaceId, threadId: threadId ?? undefined, text: question })
            setThreadId(id)
            setText("")
            setShowHistory(false)
        } catch (e) {
            handleLimitError(e, "Couldn't ask right now")
        } finally {
            setSending(false)
        }
    }

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent side="right" closeLabel="Close Ask WebflowX" className="flex w-full flex-col gap-0 bg-surface p-0 sm:max-w-md">
                <div className="flex items-center gap-2 border-b border-plum/10 px-4 py-3 pr-12">
                    <span className="flex size-8 items-center justify-center rounded-lg bg-brand/10 text-brand"><Sparkles className="size-4" aria-hidden="true" /></span>
                    <div className="min-w-0 flex-1">
                        <SheetTitle className="text-sm font-semibold text-ink">Ask WebflowX</SheetTitle>
                        <SheetDescription className="text-[11px] text-ink/60">Private to you · answers from what you can see</SheetDescription>
                    </div>
                    <button type="button" onClick={() => setShowHistory((s) => !s)} aria-label="Past questions" aria-pressed={showHistory}
                        className={cn("flex size-8 items-center justify-center rounded-lg text-ink/60 hover:bg-plum/5 hover:text-ink", showHistory && "bg-plum/5 text-ink")}>
                        <History className="size-4" />
                    </button>
                    <button type="button" onClick={() => { setThreadId(null); setShowHistory(false) }} aria-label="New question"
                        className="flex size-8 items-center justify-center rounded-lg text-ink/60 hover:bg-plum/5 hover:text-ink">
                        <Plus className="size-4" />
                    </button>
                </div>

                <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
                    {showHistory ? (
                        <ul className="flex flex-col gap-1">
                            {(threads ?? []).length === 0 && <li className="py-8 text-center text-sm text-ink/60">No past questions yet.</li>}
                            {(threads ?? []).map((t) => (
                                <li key={t._id} className="group flex items-center gap-1">
                                    <button type="button" onClick={() => { setThreadId(t._id); setShowHistory(false) }}
                                        className={cn("min-w-0 flex-1 rounded-lg px-3 py-2 text-left hover:bg-plum/5", t._id === threadId && "bg-brand/5")}>
                                        <span className="block truncate text-sm text-ink">{t.title}</span>
                                        <span className="text-[11px] text-ink/60">{new Date(t.updatedAt).toLocaleDateString(undefined, { month: "short", day: "numeric" })}</span>
                                    </button>
                                    <button type="button" aria-label={`Delete ${t.title}`}
                                        onClick={() => { void remove({ threadId: t._id }); if (t._id === threadId) setThreadId(null) }}
                                        className="flex size-8 items-center justify-center rounded-lg text-ink/60 opacity-0 hover:bg-red-50 hover:text-red-600 focus-visible:opacity-100 group-hover:opacity-100 max-md:opacity-100">
                                        <Trash2 className="size-3.5" />
                                    </button>
                                </li>
                            ))}
                        </ul>
                    ) : !threadId ? (
                        <div className="flex flex-col gap-4 pt-6">
                            <div>
                                <p className="text-lg font-semibold tracking-tight text-ink">What do you want to know?</p>
                                <p className="mt-1 text-sm text-ink/60">It searches your channels, meetings, tasks, docs and decisions, and shows where each answer came from.</p>
                            </div>
                            <div className="flex flex-col gap-2">
                                {SUGGESTIONS.map((s) => (
                                    <button key={s} type="button" onClick={() => void ask(s)} disabled={busy}
                                        className="rounded-xl border border-plum/12 px-3 py-2.5 text-left text-sm text-ink/80 transition-colors hover:border-brand/30 hover:bg-brand/5">
                                        {s}
                                    </button>
                                ))}
                            </div>
                        </div>
                    ) : messages === undefined ? (
                        <div className="flex justify-center py-10"><Loader2 className="size-5 animate-spin text-brand" /></div>
                    ) : (
                        <div className="flex flex-col gap-4" aria-live="polite">
                            {messages.map((m) => m.role === "user" ? (
                                <div key={m._id} className="ml-8 self-end rounded-2xl rounded-br-md bg-brand px-3.5 py-2 text-sm text-white whitespace-pre-wrap">{m.text}</div>
                            ) : (
                                <div key={m._id} className="flex flex-col gap-2">
                                    {m.status === "thinking" ? (
                                        <ol className="flex flex-col gap-1.5 rounded-xl border border-plum/10 bg-plum/[0.03] px-3 py-2.5">
                                            {(m.steps.length ? m.steps : ["Starting"]).map((s, i, all) => (
                                                <li key={i} className="flex items-center gap-2 text-xs text-ink/70">
                                                    {i === all.length - 1 ? <Loader2 className="size-3.5 animate-spin text-brand" /> : <span className="size-1.5 rounded-full bg-emerald-500" />}
                                                    {s}
                                                </li>
                                            ))}
                                        </ol>
                                    ) : (
                                        <div className={cn("text-sm leading-relaxed whitespace-pre-wrap", m.status === "error" ? "text-red-700" : "text-ink")}>{m.text}</div>
                                    )}
                                    {m.sources.length > 0 && (
                                        <div className="flex flex-wrap gap-1.5">
                                            {m.sources.map((s) => {
                                                const Icon = ICON[s.kind]
                                                return (
                                                    <Link key={s.n} href={hrefFor(workspaceId, s)} onClick={() => onOpenChange(false)}
                                                        className="inline-flex max-w-full items-center gap-1.5 rounded-lg border border-plum/12 bg-surface px-2 py-1 text-[11px] text-ink/75 hover:border-brand/30 hover:text-brand">
                                                        <span className="font-semibold text-brand">{s.n}</span>
                                                        <Icon className="size-3 shrink-0" aria-hidden="true" />
                                                        <span className="truncate">{s.title}</span>
                                                    </Link>
                                                )
                                            })}
                                        </div>
                                    )}
                                </div>
                            ))}
                            <div ref={end} />
                        </div>
                    )}
                </div>

                <form onSubmit={(e) => { e.preventDefault(); void ask(text) }} className="border-t border-plum/10 p-3">
                    <div className="flex items-end gap-2 rounded-xl border border-plum/15 bg-surface px-3 py-2 focus-within:border-brand/40 focus-within:ring-2 focus-within:ring-brand/15">
                        <textarea ref={input} value={text} onChange={(e) => setText(e.target.value)} rows={1} maxLength={2000}
                            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void ask(text) } }}
                            placeholder={threadId ? "Ask a follow-up" : "Ask about your workspace"} aria-label="Your question"
                            className="max-h-32 min-h-6 flex-1 resize-none bg-transparent text-sm text-ink outline-none placeholder:text-ink/60" />
                        <button type="submit" disabled={!text.trim() || busy} aria-label="Ask"
                            className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-brand text-white transition-opacity disabled:opacity-40">
                            {busy ? <Loader2 className="size-4 animate-spin" /> : <ArrowUp className="size-4" />}
                        </button>
                    </div>
                    <p className="mt-1.5 text-center text-[10px] text-ink/60">Each question uses one agent run · <kbd className="font-sans">Ctrl/⌘ J</kbd> to toggle</p>
                </form>
            </SheetContent>
        </Sheet>
    )
}
