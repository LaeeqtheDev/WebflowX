"use client"
import { useState } from "react"
import Link from "next/link"
import { useMutation, useQuery } from "convex/react"
import { AlarmClock, CalendarCheck, ClipboardList, Gavel, MessageCircleQuestion, Newspaper, NotebookPen } from "lucide-react"
import { toast } from "sonner"
import { api } from "../../../convex/_generated/api"
import type { Id } from "../../../convex/_generated/dataModel"
import { friendlyError } from "@/hooks/use-limit-handler"
import { cn } from "@/lib/utils"
import { Switch } from "./agents-panel"

type Key = "overdueNudges" | "unansweredQuestions" | "missingSummary" | "meetingPrep" | "decisionsLog" | "weeklyDigest"
export type AutomationRow = { key: Key; enabled: boolean; channelId: string | null; channelName: string | null }
export type DecisionRow = { _id: string; text: string; meetingId: string | null; meetingTitle: string | null; at: number }
type Channel = { _id: string; name: string; isPrivate?: boolean }

const INFO: Record<Key, { icon: typeof AlarmClock; title: string; blurb: string; ai?: "small" | "large" }> = {
    overdueNudges: { icon: AlarmClock, title: "Overdue nudges", blurb: "A private reminder to the owner the day after a task's due date passes." },
    missingSummary: { icon: NotebookPen, title: "Missing summary reminder", blurb: "Reminds whoever ran a meeting when it ended 30 minutes ago with no summary." },
    meetingPrep: { icon: CalendarCheck, title: "Meeting prep", blurb: "30 minutes before a scheduled meeting: what was decided last time and what's still open." },
    decisionsLog: { icon: Gavel, title: "Decisions log", blurb: "Pulls the decisions out of every meeting summary so anyone can search them.", ai: "small" },
    unansweredQuestions: { icon: MessageCircleQuestion, title: "Unanswered questions", blurb: "Replies under channel questions nobody answered in a day, so they don't get lost." },
    weeklyDigest: { icon: Newspaper, title: "Weekly digest", blurb: "Monday morning: what shipped, what was decided and what needs attention.", ai: "large" },
}

export const AutomationsView = ({ rows, admin, channels, decisions, workspaceId, onSave }: {
    rows: AutomationRow[]; admin: boolean; channels: Channel[]; decisions: DecisionRow[]; workspaceId: string
    onSave: (key: Key, enabled: boolean, channelId?: string) => Promise<unknown>
}) => {
    const [saving, setSaving] = useState<Key | null>(null)
    const [digestChannel, setDigestChannel] = useState<string>("")
    const save = async (key: Key, enabled: boolean, channelId?: string) => {
        setSaving(key)
        try { await onSave(key, enabled, channelId) } catch (e) { toast.error(friendlyError(e, "Couldn't save that")) } finally { setSaving(null) }
    }
    const publicChannels = channels.filter((c) => !c.isPrivate)
    return (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
            <section aria-labelledby="automations-h" className="rounded-2xl border border-plum/12 bg-surface p-4 sm:p-5">
                <div className="flex items-center gap-2">
                    <ClipboardList className="size-4 text-brand" aria-hidden="true" />
                    <h2 id="automations-h" className="text-sm font-semibold tracking-tight text-ink">Automations</h2>
                </div>
                <p className="mt-1 text-xs text-ink/60">{admin ? "Small jobs that keep work moving on their own. Most use no AI at all." : "Only the owner and admins can change these."}</p>
                <ul className="mt-4 flex flex-col divide-y divide-plum/10">
                    {rows.map((r) => {
                        const { icon: Icon, title, blurb, ai } = INFO[r.key]
                        const picked = r.key === "weeklyDigest" ? (digestChannel || r.channelId || "") : ""
                        return (
                            <li key={r.key} className="flex flex-col gap-2 py-3 first:pt-0 last:pb-0">
                                <div className="flex items-start gap-3">
                                    <span className={cn("mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg", r.enabled ? "bg-brand/10 text-brand" : "bg-cream-deep2 text-ink/60")}><Icon className="size-4" aria-hidden="true" /></span>
                                    <div className="min-w-0 flex-1">
                                        <p className="flex flex-wrap items-center gap-1.5 text-sm font-medium text-ink">
                                            {title}
                                            <span className="rounded px-1.5 py-px text-[10px] font-semibold uppercase tracking-wide text-ink/60 ring-1 ring-plum/12">{ai ? `${ai === "small" ? "Light" : "1"} AI ${ai === "small" ? "use" : "call a week"}` : "No AI"}</span>
                                        </p>
                                        <p className="mt-0.5 text-xs leading-relaxed text-ink/60">{blurb}</p>
                                    </div>
                                    <Switch on={r.enabled} label={title} disabled={!admin || saving === r.key}
                                        onChange={(on) => void save(r.key, on, r.key === "weeklyDigest" ? picked || undefined : undefined)} />
                                </div>
                                {r.key === "weeklyDigest" && admin && (
                                    <label className="ml-11 flex items-center gap-2 text-xs text-ink/70">
                                        Post in
                                        <select value={picked} disabled={saving === r.key}
                                            onChange={(e) => { setDigestChannel(e.target.value); if (r.enabled && e.target.value) void save(r.key, true, e.target.value) }}
                                            className="h-8 min-w-0 flex-1 rounded-lg border border-plum/15 bg-surface px-2 text-xs text-ink">
                                            <option value="">Choose a channel</option>
                                            {publicChannels.map((c) => <option key={c._id} value={c._id}># {c.name}</option>)}
                                        </select>
                                    </label>
                                )}
                            </li>
                        )
                    })}
                </ul>
            </section>

            <section id="decisions" aria-labelledby="decisions-h" className="rounded-2xl border border-plum/12 bg-surface p-4 sm:p-5">
                <div className="flex items-center gap-2">
                    <Gavel className="size-4 text-brand" aria-hidden="true" />
                    <h2 id="decisions-h" className="text-sm font-semibold tracking-tight text-ink">Decisions</h2>
                    {decisions.length > 0 && <span className="text-xs text-ink/60">{decisions.length}</span>}
                </div>
                <p className="mt-1 text-xs text-ink/60">What your team agreed on, pulled from meeting summaries. Ask WebflowX can search these.</p>
                {decisions.length === 0 ? (
                    <p className="mt-6 rounded-xl border border-dashed border-plum/15 px-4 py-8 text-center text-sm text-ink/60">Decisions show up here after your next meeting summary.</p>
                ) : (
                    <ul className="mt-4 flex max-h-[28rem] flex-col gap-2 overflow-y-auto pr-1">
                        {decisions.map((d) => (
                            <li key={d._id} className="rounded-xl border border-plum/10 px-3 py-2.5">
                                <p className="text-sm leading-snug text-ink">{d.text}</p>
                                {d.meetingId && (
                                    <Link href={`/dashboard/workspace/${workspaceId}/meeting?meeting=${d.meetingId}`} className="mt-1 inline-block text-[11px] text-ink/60 hover:text-brand">
                                        {d.meetingTitle} · {new Date(d.at).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                                    </Link>
                                )}
                            </li>
                        ))}
                    </ul>
                )}
            </section>
        </div>
    )
}

export const AutomationsPanel = ({ workspaceId }: { workspaceId: Id<"workspaces"> }) => {
    const data = useQuery(api.automations.list, { workspaceId })
    const decisions = useQuery(api.decisions.list, { workspaceId })
    const channels = useQuery(api.channels.get, { workspaceId })
    const configure = useMutation(api.automations.configure)
    if (!data) return null
    return (
        <AutomationsView rows={data.rows} admin={data.admin} channels={channels ?? []} decisions={decisions ?? []} workspaceId={workspaceId}
            onSave={(key, enabled, channelId) => configure({ workspaceId, key, enabled, channelId: channelId as Id<"channels"> | undefined })} />
    )
}
