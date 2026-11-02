"use client"
import { useState } from "react"
import { useMutation, useQuery } from "convex/react"
import { Bot, Check, CircleAlert, ListChecks, Loader2, MessageSquareText, Play, X } from "lucide-react"
import { toast } from "sonner"
import { api } from "../../../convex/_generated/api"
import type { Id } from "../../../convex/_generated/dataModel"
import { Button } from "@/components/ui/button"
import { useLimitHandler, friendlyError } from "@/hooks/use-limit-handler"
import { cn } from "@/lib/utils"

type RunAction =
    | { id: string; type: "task"; title: string; assigneeName: string | null; dueDate?: number; priority: string; taskId?: string }
    | { id: string; type: "recap"; text: string; channelName: string; messageId?: string }

export type AgentRunView = {
    _id: Id<"agentRuns">
    _creationTime: number
    status: "queued" | "running" | "review" | "done" | "failed" | "dismissed"
    note: string | null
    error: string | null
    meetingTitle: string | null
    decidedByName: string | null
    actions: RunAction[]
}

const due = (ms?: number) => (ms ? new Date(ms).toLocaleDateString(undefined, { month: "short", day: "numeric", timeZone: "UTC" }) : null)

const PRIORITY: Record<string, string> = {
    urgent: "bg-red-500/12 text-red-700 dark:text-red-300",
    high: "bg-brand/12 text-orange-ink",
    medium: "bg-cream-deep text-ink/70",
    low: "bg-cream-deep text-ink/60",
}

export const StatusPill = ({ status }: { status: AgentRunView["status"] }) => {
    const map = {
        queued: ["Starting…", "bg-cream-deep text-ink/70"],
        running: ["Working…", "bg-brand/12 text-orange-ink"],
        review: ["Needs your review", "bg-amber-500/15 text-amber-800 dark:text-amber-200"],
        done: ["Done", "bg-emerald-500/12 text-emerald-700 dark:text-emerald-300"],
        failed: ["Didn't finish", "bg-red-500/12 text-red-700 dark:text-red-300"],
        dismissed: ["Dismissed", "bg-cream-deep text-ink/60"],
    } as const
    const [label, cls] = map[status]
    return (
        <span className={cn("inline-flex h-6 shrink-0 items-center gap-1.5 rounded-full px-2.5 text-[11px] font-semibold", cls)}>
            {(status === "queued" || status === "running") && <Loader2 className="size-3 animate-spin" aria-hidden="true" />}
            {label}
        </span>
    )
}

// What one run proposed or did, with approve / dismiss while it waits for review.
export const AgentRunCard = ({ run, canDecide, compact }: { run: AgentRunView; canDecide: boolean; compact?: boolean }) => {
    const decide = useMutation(api.agents.decide)
    const [picked, setPicked] = useState<Set<string>>(() => new Set(run.actions.map((a) => a.id)))
    const [busy, setBusy] = useState<"approve" | "dismiss" | null>(null)
    const reviewing = run.status === "review"
    const tasks = run.actions.filter((a) => a.type === "task")

    const go = async (approve: boolean) => {
        setBusy(approve ? "approve" : "dismiss")
        try {
            await decide({ runId: run._id, approve, actionIds: approve ? [...picked] : undefined })
            toast.success(approve ? "Done. The agent added it to your workspace." : "Dismissed")
        } catch (e) {
            toast.error(friendlyError(e, "Couldn't save that"))
        } finally {
            setBusy(null)
        }
    }

    return (
        <div className="flex flex-col gap-3">
            {!compact && (
                <div className="flex items-center gap-2">
                    <StatusPill status={run.status} />
                    {run.note && run.status !== "failed" && <p className="min-w-0 truncate text-xs text-ink/60">{run.note}</p>}
                </div>
            )}
            {run.status === "failed" && (
                <p className="flex items-start gap-2 rounded-lg bg-red-500/8 px-3 py-2 text-xs text-red-800 dark:text-red-200">
                    <CircleAlert className="mt-px size-3.5 shrink-0" aria-hidden="true" /> {run.error ?? "Something went wrong."}
                </p>
            )}
            {run.actions.length > 0 && (
                <ul className="flex flex-col gap-1.5">
                    {run.actions.map((a) => {
                        const on = picked.has(a.id)
                        const body = a.type === "task" ? (
                            <>
                                <ListChecks className="mt-0.5 size-4 shrink-0 text-brand" aria-hidden="true" />
                                <span className="min-w-0 flex-1">
                                    <span className="block text-sm font-medium text-ink">{a.title}</span>
                                    <span className="mt-1 flex flex-wrap items-center gap-1.5 text-[11px] text-ink/60">
                                        <span className="font-medium text-ink/75">{a.assigneeName ?? "Unassigned"}</span>
                                        {due(a.dueDate) && <span>· due {due(a.dueDate)}</span>}
                                        <span className={cn("rounded px-1.5 py-px font-semibold capitalize", PRIORITY[a.priority])}>{a.priority}</span>
                                    </span>
                                </span>
                            </>
                        ) : (
                            <>
                                <MessageSquareText className="mt-0.5 size-4 shrink-0 text-brand" aria-hidden="true" />
                                <span className="min-w-0 flex-1">
                                    <span className="block text-sm font-medium text-ink">Recap in #{a.channelName}</span>
                                    <span className="mt-1 block whitespace-pre-wrap text-xs leading-relaxed text-ink/65 line-clamp-4">{a.text}</span>
                                </span>
                            </>
                        )
                        return (
                            <li key={a.id}>
                                {reviewing && canDecide ? (
                                    <label className={cn("flex cursor-pointer items-start gap-3 rounded-xl border px-3 py-2.5 transition-colors", on ? "border-brand/35 bg-brand/5" : "border-plum/12 bg-surface opacity-70")}>
                                        <input type="checkbox" checked={on} aria-label={a.type === "task" ? `Keep task ${a.title}` : "Keep the recap"}
                                            onChange={() => setPicked((s) => { const n = new Set(s); if (n.has(a.id)) n.delete(a.id); else n.add(a.id); return n })}
                                            className="mt-1 size-4 shrink-0 accent-brand" />
                                        {body}
                                    </label>
                                ) : (
                                    <div className="flex items-start gap-3 rounded-xl border border-plum/12 bg-surface px-3 py-2.5">
                                        {body}
                                        {(a.type === "task" ? a.taskId : a.messageId) && <Check className="mt-0.5 size-4 shrink-0 text-emerald-600" aria-label="Added" />}
                                    </div>
                                )}
                            </li>
                        )
                    })}
                </ul>
            )}
            {reviewing && (canDecide ? (
                <div className="flex flex-wrap items-center gap-2">
                    <Button size="sm" disabled={!!busy || picked.size === 0} onClick={() => go(true)} className="h-8 rounded-lg bg-brand text-xs font-semibold text-white hover:bg-brand-hover">
                        {busy === "approve" ? <Loader2 className="size-3.5 animate-spin" /> : <Check className="size-3.5" />}
                        {picked.size === run.actions.length ? "Approve all" : `Approve ${picked.size}`}
                    </Button>
                    <Button size="sm" variant="ghost" disabled={!!busy} onClick={() => go(false)} className="h-8 rounded-lg text-xs text-ink/70">
                        {busy === "dismiss" ? <Loader2 className="size-3.5 animate-spin" /> : <X className="size-3.5" />} Dismiss
                    </Button>
                    <span className="text-[11px] text-ink/60">{tasks.length} task{tasks.length === 1 ? "" : "s"} waiting. Untick anything you don&apos;t want.</span>
                </div>
            ) : (
                <p className="text-xs text-ink/60">Waiting for an admin to approve.</p>
            ))}
            {run.status === "done" && run.decidedByName && <p className="text-[11px] text-ink/60">Approved by {run.decidedByName}</p>}
        </div>
    )
}

// The follow-up agent's block under a meeting summary.
export const MeetingAgentBlock = ({ meetingId, hasSummary }: { meetingId: Id<"meetings">; hasSummary: boolean }) => {
    const data = useQuery(api.agents.forMeeting, { meetingId })
    const runNow = useMutation(api.agents.runForMeeting)
    const { handleLimitError } = useLimitHandler()
    if (!data || (!data.enabled && !data.run)) return null
    return (
        <MeetingAgentView enabled={data.enabled} canDecide={data.canDecide} run={data.run as AgentRunView | null} hasSummary={hasSummary}
            onRun={async () => { try { await runNow({ meetingId }) } catch (e) { handleLimitError(e, "Couldn't start the agent") } }} />
    )
}

export const MeetingAgentView = ({ enabled, canDecide, run, hasSummary, onRun }: {
    enabled: boolean; canDecide: boolean; run: AgentRunView | null; hasSummary: boolean; onRun: () => Promise<void>
}) => {
    const [starting, setStarting] = useState(false)
    const canRerun = hasSummary && enabled && (!run || run.status === "failed" || run.status === "dismissed" || run.status === "done")
    const start = async () => { setStarting(true); try { await onRun() } finally { setStarting(false) } }

    return (
        <div className="rounded-xl border border-plum/10 bg-surface p-4">
            <div className="mb-3 flex items-center gap-2">
                <span className="flex size-7 items-center justify-center rounded-lg bg-plum text-white dark:bg-white/10"><Bot className="size-4" aria-hidden="true" /></span>
                <span className="text-sm font-semibold tracking-tight text-ink">Follow-up agent</span>
                {run && <StatusPill status={run.status} />}
                {canRerun && (
                    <Button size="sm" variant="outline" disabled={starting} onClick={start} className="ml-auto h-7 gap-1.5 rounded-lg border-plum/15 px-2.5 text-xs">
                        {starting ? <Loader2 className="size-3 animate-spin" /> : <Play className="size-3" />} {run ? "Run again" : "Run now"}
                    </Button>
                )}
            </div>
            {run ? (
                <>
                    {run.note && run.status !== "failed" && <p className="mb-3 text-xs text-ink/60">{run.note}</p>}
                    <AgentRunCard key={`${run._id}:${run.status}`} run={run} canDecide={canDecide} compact />
                </>
            ) : (
                <p className="text-xs text-ink/60">
                    {hasSummary ? "The agent can turn this meeting's action items into tasks and post a recap." : "Once this meeting has a summary, the agent turns its action items into tasks."}
                </p>
            )}
        </div>
    )
}
