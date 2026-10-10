"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { useMutation, useQuery } from "convex/react"
import { addMonths, format, startOfMonth } from "date-fns"
import { CalendarDays, CalendarPlus, ChevronLeft, ChevronRight, Copy, RefreshCw, Video } from "lucide-react"
import { toast } from "sonner"
import { api } from "../../../../../../convex/_generated/api"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { useWorkspaceId } from "@/hooks/use-workspace-id"
import { cn } from "@/lib/utils"
import { errMsg } from "@/lib/errors"

const DAY = 24 * 60 * 60 * 1000
const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]

const PRIORITY_DOT: Record<string, string> = {
    urgent: "bg-rose-500",
    high: "bg-brand",
    medium: "bg-amber-500",
    low: "bg-sky-500",
}

const utcKey = (ms: number) => new Date(ms).toISOString().slice(0, 10)
const localKey = (d: Date) => format(d, "yyyy-MM-dd")

type Item =
    | { kind: "task"; id: string; title: string; done: boolean; priority: string; assignee?: string; mine: boolean }
    | { kind: "meeting"; id: string; title: string; time: string }
    | { kind: "sprint"; id: string; title: string }

const SubscribeDialog = ({ open, setOpen }: { open: boolean; setOpen: (v: boolean) => void }) => {
    const getFeed = useMutation(api.calendar.getFeed)
    const resetFeed = useMutation(api.calendar.resetFeed)
    const [url, setUrl] = useState<string | null>(null)
    const [busy, setBusy] = useState(false)

    const load = async (reset = false) => {
        setBusy(true)
        try {
            const r = reset ? await resetFeed({}) : await getFeed({})
            setUrl(r.url)
            if (reset) toast.success("New link created. The old one no longer works.")
        } catch (e) { toast.error(errMsg(e, "Couldn't create the link")) }
        finally { setBusy(false) }
    }

    // The dialog is opened from a button elsewhere on the page, so react to `open` itself
    // (onOpenChange only fires for changes made inside the dialog).
    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch the link the first time the dialog opens
        if (open && !url) void load()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open])

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogContent className="rounded-2xl bg-cream sm:max-w-lg">
                <DialogHeader>
                    <DialogTitle className="font-semibold tracking-tight">Add to your calendar app</DialogTitle>
                    <DialogDescription>
                        Subscribe to this private link in Google Calendar, Outlook or Apple Calendar to see the due dates of your open tasks next to everything else.
                    </DialogDescription>
                </DialogHeader>
                <div className="flex gap-2">
                    <Input readOnly value={url ?? (busy ? "Creating your link…" : "Couldn't create the link. Close and try again.")} onFocus={(e) => e.currentTarget.select()} aria-label="Calendar subscription link" className="bg-surface text-xs" />
                    <Button
                        type="button"
                        variant="outline"
                        disabled={!url}
                        onClick={() => url && navigator.clipboard.writeText(url).then(() => toast.success("Link copied"), () => toast.error("Couldn't copy. Select it and copy by hand."))}
                    >
                        <Copy className="mr-2 size-4" /> Copy
                    </Button>
                </div>
                <ul className="list-disc space-y-1 pl-5 text-sm text-ink/70">
                    <li><strong className="text-ink">Google Calendar:</strong> Other calendars → + → From URL.</li>
                    <li><strong className="text-ink">Outlook:</strong> Add calendar → Subscribe from web.</li>
                    <li><strong className="text-ink">Apple Calendar:</strong> File → New Calendar Subscription.</li>
                </ul>
                <p className="text-xs text-ink/60">Anyone with this link can see your task titles and due dates, so don&apos;t share it. Calendar apps refresh it every few hours.</p>
                <Button type="button" variant="ghost" size="sm" className="w-fit text-rose-600 hover:text-rose-700 dark:text-rose-400" disabled={busy} onClick={() => load(true)}>
                    <RefreshCw className="mr-2 size-4" /> Make a new link
                </Button>
            </DialogContent>
        </Dialog>
    )
}

const CalendarPage = () => {
    const workspaceId = useWorkspaceId()
    const router = useRouter()
    const [month, setMonth] = useState(() => startOfMonth(new Date()))
    const [onlyMine, setOnlyMine] = useState(false)
    const [selected, setSelected] = useState<string>(() => localKey(new Date()))
    const [subscribeOpen, setSubscribeOpen] = useState(false)

    // 6 weeks starting on the Sunday on or before the 1st
    const gridStart = useMemo(() => {
        const first = startOfMonth(month)
        return Date.UTC(first.getFullYear(), first.getMonth(), 1 - first.getDay())
    }, [month])
    const days = useMemo(() => Array.from({ length: 42 }, (_, i) => new Date(gridStart + i * DAY).toISOString().slice(0, 10)), [gridStart])

    const data = useQuery(api.calendar.events, { workspaceId, from: gridStart, to: gridStart + 42 * DAY })

    const byDay = useMemo(() => {
        const map = new Map<string, Item[]>()
        const push = (key: string, item: Item) => { const l = map.get(key) ?? []; l.push(item); map.set(key, l) }
        if (!data) return map
        for (const s of data.sprints) {
            for (let t = Math.max(s.startDate, gridStart); t <= s.endDate && t < gridStart + 42 * DAY; t += DAY) {
                push(utcKey(t), { kind: "sprint", id: s._id, title: s.name })
            }
        }
        for (const t of data.tasks) {
            const mine = t.assigneeId === data.myMemberId
            if (onlyMine && !mine) continue
            push(utcKey(t.dueDate), { kind: "task", id: t._id, title: t.title, done: t.status === "done", priority: t.priority, assignee: t.assigneeName, mine })
        }
        for (const m of data.meetings) {
            push(localKey(new Date(m.startedAt)), { kind: "meeting", id: m._id, title: m.title, time: format(m.startedAt, "h:mm a") })
        }
        return map
    }, [data, gridStart, onlyMine])

    const todayKey = localKey(new Date())
    const monthIndex = month.getMonth()
    const selectedItems = (byDay.get(selected) ?? []).filter((i) => i.kind !== "sprint")
    const selectedSprints = (byDay.get(selected) ?? []).filter((i) => i.kind === "sprint")

    const open = (item: Item) => {
        const base = `/dashboard/workspace/${workspaceId}`
        if (item.kind === "task") router.push(`${base}/tasks?task=${item.id}`)
        else if (item.kind === "meeting") router.push(`${base}/meeting?meeting=${item.id}`)
    }

    return (
        <div className="flex h-full min-h-0 flex-col bg-surface">
            <SubscribeDialog open={subscribeOpen} setOpen={setSubscribeOpen} />
            <div className="flex shrink-0 flex-wrap items-center gap-2 border-b border-plum/12 px-4 py-2.5">
                <CalendarDays className="size-5 text-brand" />
                <h1 className="mr-2 text-lg font-semibold tracking-tight text-ink">Calendar</h1>
                <div className="flex items-center gap-1">
                    <Button type="button" variant="outline" size="icon" className="size-9" aria-label="Previous month" onClick={() => setMonth((m) => addMonths(m, -1))}><ChevronLeft className="size-4" /></Button>
                    <Button type="button" variant="outline" size="sm" className="h-9" onClick={() => { setMonth(startOfMonth(new Date())); setSelected(todayKey) }}>Today</Button>
                    <Button type="button" variant="outline" size="icon" className="size-9" aria-label="Next month" onClick={() => setMonth((m) => addMonths(m, 1))}><ChevronRight className="size-4" /></Button>
                </div>
                <span className="min-w-32 text-[15px] font-semibold text-ink">{format(month, "MMMM yyyy")}</span>
                <div className="ml-auto flex flex-wrap items-center gap-2">
                    <label className="flex cursor-pointer items-center gap-2 text-sm text-ink/75">
                        <input type="checkbox" className="size-4 accent-brand" checked={onlyMine} onChange={(e) => setOnlyMine(e.target.checked)} />
                        Only my tasks
                    </label>
                    <Button type="button" variant="outline" size="sm" className="h-9" onClick={() => setSubscribeOpen(true)}>
                        <CalendarPlus className="mr-2 size-4" /> Add to my calendar app
                    </Button>
                </div>
            </div>

            <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
                <div className="flex min-h-0 flex-1 flex-col overflow-auto">
                    <div className="grid grid-cols-7 border-b border-plum/12 text-center text-[11px] font-semibold uppercase tracking-wide text-ink/55" aria-hidden>
                        {WEEKDAYS.map((d) => <div key={d} className="py-2">{d}</div>)}
                    </div>
                    <div className="grid flex-1 grid-cols-7 grid-rows-6" role="grid" aria-label={format(month, "MMMM yyyy")}>
                        {days.map((key) => {
                            const [y, m, d] = key.split("-").map(Number)
                            const inMonth = m - 1 === monthIndex
                            const items = byDay.get(key) ?? []
                            const tasks = items.filter((i) => i.kind === "task")
                            const others = items.filter((i) => i.kind === "meeting")
                            const hasSprint = items.some((i) => i.kind === "sprint")
                            const shown = [...tasks, ...others].slice(0, 3)
                            const extra = tasks.length + others.length - shown.length
                            return (
                                <button
                                    key={key}
                                    type="button"
                                    role="gridcell"
                                    aria-label={`${format(new Date(y, m - 1, d), "EEEE, MMMM d")}, ${tasks.length} tasks${others.length ? `, ${others.length} meetings` : ""}`}
                                    aria-selected={selected === key}
                                    onClick={() => setSelected(key)}
                                    className={cn(
                                        "relative flex min-h-16 flex-col items-stretch gap-0.5 border-b border-r border-plum/10 p-1 text-left transition-colors hover:bg-cream focus-visible:z-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/70 md:min-h-24 md:p-1.5",
                                        !inMonth && "bg-cream-soft/60 text-ink/40",
                                        selected === key && "bg-brand/[0.07]"
                                    )}
                                >
                                    {hasSprint && <span aria-hidden className="absolute inset-x-0 top-0 h-[3px] bg-avatar/30 dark:bg-white/25" />}
                                    <span className={cn("flex size-6 items-center justify-center rounded-full text-xs font-medium", key === todayKey ? "bg-brand text-white" : inMonth ? "text-ink" : "text-ink/40")}>{d}</span>
                                    <span className="hidden flex-col gap-0.5 md:flex">
                                        {shown.map((i) => (
                                            <span key={i.id} className="flex items-center gap-1 truncate rounded px-1 py-0.5 text-[11px] leading-tight text-ink bg-cream-deep2/70">
                                                {i.kind === "task" ? <span className={cn("size-1.5 shrink-0 rounded-full", PRIORITY_DOT[i.priority])} /> : <Video className="size-3 shrink-0 text-brand" />}
                                                <span className={cn("truncate", i.kind === "task" && i.done && "line-through opacity-60")}>{i.title}</span>
                                            </span>
                                        ))}
                                        {extra > 0 && <span className="px-1 text-[11px] font-medium text-ink/60">+{extra} more</span>}
                                    </span>
                                    {/* phones: dots only */}
                                    <span className="flex flex-wrap gap-0.5 px-0.5 md:hidden" aria-hidden>
                                        {[...tasks, ...others].slice(0, 4).map((i) => (
                                            <span key={i.id} className={cn("size-1.5 rounded-full", i.kind === "task" ? PRIORITY_DOT[i.priority] : "bg-brand")} />
                                        ))}
                                    </span>
                                </button>
                            )
                        })}
                    </div>
                </div>

                <aside className="shrink-0 border-t border-plum/12 bg-cream-soft/50 p-4 lg:w-80 lg:border-l lg:border-t-0 lg:overflow-y-auto" aria-live="polite">
                    <h2 className="text-sm font-semibold tracking-tight text-ink">{format(new Date(`${selected}T12:00:00`), "EEEE, MMMM d")}</h2>
                    {data === undefined && <p className="mt-3 text-sm text-ink/55">Loading…</p>}
                    {data !== undefined && selectedSprints.length > 0 && (
                        <p className="mt-2 text-xs text-ink/65">Sprint: {selectedSprints.map((s) => s.title).join(", ")}</p>
                    )}
                    {data !== undefined && selectedItems.length === 0 && (
                        <p className="mt-3 text-sm text-ink/55">Nothing due or scheduled this day.</p>
                    )}
                    <ul className="mt-3 flex flex-col gap-1.5">
                        {selectedItems.map((i) => (
                            <li key={i.id}>
                                <button type="button" onClick={() => open(i)} className="flex w-full items-start gap-2 rounded-lg border border-plum/12 bg-surface px-3 py-2 text-left transition-colors hover:bg-cream focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/70">
                                    {i.kind === "task" ? <span className={cn("mt-1.5 size-2 shrink-0 rounded-full", PRIORITY_DOT[i.priority])} /> : <Video className="mt-0.5 size-4 shrink-0 text-brand" />}
                                    <span className="min-w-0">
                                        <span className={cn("block truncate text-sm font-medium text-ink", i.kind === "task" && i.done && "line-through opacity-60")}>{i.title}</span>
                                        <span className="block text-xs text-ink/60">
                                            {i.kind === "task" ? (i.assignee ? `${i.mine ? "You" : i.assignee}${i.done ? " · done" : ""}` : `Unassigned${i.done ? " · done" : ""}`) : `Meeting · ${i.time}`}
                                        </span>
                                    </span>
                                </button>
                            </li>
                        ))}
                    </ul>
                    <div className="mt-5 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-ink/60">
                        {Object.entries(PRIORITY_DOT).map(([k, c]) => <span key={k} className="flex items-center gap-1"><span className={cn("size-2 rounded-full", c)} />{k}</span>)}
                    </div>
                </aside>
            </div>
        </div>
    )
}

export default CalendarPage
