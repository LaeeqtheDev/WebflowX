"use client"
import { useState } from "react"
import { useMutation, useQuery } from "convex/react"
import { Bot, Loader2, ShieldCheck, Zap } from "lucide-react"
import { toast } from "sonner"
import { api } from "../../../convex/_generated/api"
import type { Id } from "../../../convex/_generated/dataModel"
import { friendlyError } from "@/hooks/use-limit-handler"
import { cn } from "@/lib/utils"
import { AgentRunCard, StatusPill, type AgentRunView } from "./agent-run"

const when = (ms: number) => {
    const mins = Math.round((Date.now() - ms) / 60000)
    if (mins < 1) return "just now"
    if (mins < 60) return `${mins} min ago`
    const h = Math.round(mins / 60)
    if (h < 24) return `${h} hr ago`
    return new Date(ms).toLocaleDateString(undefined, { month: "short", day: "numeric" })
}

const Switch = ({ on, onChange, label, disabled }: { on: boolean; onChange: (v: boolean) => void; label: string; disabled?: boolean }) => (
    <button type="button" role="switch" aria-checked={on} aria-label={label} disabled={disabled} onClick={() => onChange(!on)}
        className={cn("relative h-6 w-11 shrink-0 rounded-full transition-colors disabled:opacity-50", on ? "bg-brand" : "bg-cream-deep2")}>
        <span className={cn("absolute top-0.5 size-5 rounded-full bg-white shadow transition-[left]", on ? "left-[22px]" : "left-0.5")} />
    </button>
)

// Settings › Agents: switch the follow-up agent on, choose how much it may do on its own, and see what it did.
export const AgentsPanel = ({ workspaceId }: { workspaceId: Id<"workspaces"> }) => {
    const data = useQuery(api.agents.overview, { workspaceId })
    const channels = useQuery(api.channels.get, { workspaceId })
    const configure = useMutation(api.agents.configure)
    if (data === undefined) return <div className="flex justify-center py-10"><Loader2 className="size-5 animate-spin text-brand" /></div>
    if (data === null) return <p className="text-sm text-ink/60">You don&apos;t have access to agents in this workspace.</p>
    return <AgentsPanelView data={data as OverviewData} channels={channels ?? []} onSave={(next) => configure({ workspaceId, ...next })} />
}

export type OverviewData = {
    canManage: boolean
    canDecide: boolean
    agent: { enabled: boolean; mode: "suggest" | "act"; channelId: string | null } | null
    usage: { used: number; limit: number }
    runs: AgentRunView[]
}
type Settings = { enabled: boolean; mode: "suggest" | "act"; channelId: Id<"channels"> | null }

// The panel itself, given its data (kept apart from the queries so it can be shown with sample data).
export const AgentsPanelView = ({ data, channels, onSave }: {
    data: OverviewData
    channels: { _id: string; name: string; isPrivate?: boolean }[]
    onSave: (next: Settings) => Promise<unknown>
}) => {
    const [saving, setSaving] = useState(false)
    const [open, setOpen] = useState<string | null>(null)

    const agent = data.agent ?? { enabled: false, mode: "suggest" as const, channelId: null }
    const save = async (next: Partial<typeof agent>) => {
        const merged = { ...agent, ...next }
        setSaving(true)
        try {
            await onSave({ enabled: merged.enabled, mode: merged.mode, channelId: (merged.channelId as Id<"channels"> | null) ?? null })
            if (next.enabled !== undefined) toast.success(next.enabled ? "Follow-up agent is on" : "Follow-up agent is off")
        } catch (e) {
            toast.error(friendlyError(e, "Couldn't save"))
        } finally {
            setSaving(false)
        }
    }
    const publicChannels = channels.filter((c) => !c.isPrivate)
    const { used, limit } = data.usage
    const pct = limit > 0 ? Math.min(100, Math.round((used / limit) * 100)) : 0

    return (
        <div className="flex flex-col gap-5">
            <div>
                <h3 className="text-[15px] font-semibold tracking-tight text-ink">Agents</h3>
                <p className="mt-1 text-sm text-ink/60">AI teammates that do the follow-up work for you. They act with the permissions of the admin who turns them on, and every action is logged.</p>
            </div>

            <div className={cn("rounded-2xl border p-4 sm:p-5", agent.enabled ? "border-brand/30 bg-brand/[0.03]" : "border-plum/12 bg-surface")}>
                <div className="flex items-start gap-3">
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-plum text-white dark:bg-white/10"><Bot className="size-5" aria-hidden="true" /></span>
                    <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold tracking-tight text-ink">Meeting follow-up agent</p>
                        <p className="mt-0.5 text-xs leading-relaxed text-ink/60">After a meeting&apos;s AI summary, it turns the action items into tasks for the right people, with due dates when they were said, and posts a short recap.</p>
                    </div>
                    <Switch on={agent.enabled} disabled={!data.canManage || saving} onChange={(v) => save({ enabled: v })} label="Meeting follow-up agent" />
                </div>

                {agent.enabled && (
                    <div className="mt-4 flex flex-col gap-4 border-t border-plum/10 pt-4">
                        <fieldset>
                            <legend className="mb-2 text-xs font-semibold text-ink/70">How much can it do on its own?</legend>
                            <div className="grid gap-2 sm:grid-cols-2">
                                {([
                                    ["suggest", ShieldCheck, "Suggest, we approve", "Proposals wait for someone who manages tasks to approve them."],
                                    ["act", Zap, "Act on its own", "Tasks and the recap are added straight away. You can still edit or delete them."],
                                ] as const).map(([mode, Icon, title, blurb]) => (
                                    <button key={mode} type="button" disabled={!data.canManage || saving} onClick={() => save({ mode })} aria-pressed={agent.mode === mode}
                                        className={cn("flex items-start gap-2.5 rounded-xl border p-3 text-left transition-colors disabled:opacity-60", agent.mode === mode ? "border-brand bg-brand/5 ring-2 ring-brand/15" : "border-plum/12 hover:bg-cream-deep")}>
                                        <Icon className={cn("mt-0.5 size-4 shrink-0", agent.mode === mode ? "text-brand" : "text-ink/60")} aria-hidden="true" />
                                        <span><span className="block text-sm font-semibold text-ink">{title}</span><span className="mt-0.5 block text-xs leading-relaxed text-ink/60">{blurb}</span></span>
                                    </button>
                                ))}
                            </div>
                        </fieldset>
                        <label className="flex flex-col gap-1.5">
                            <span className="text-xs font-semibold text-ink/70">Post the recap in</span>
                            <select value={agent.channelId ?? ""} disabled={!data.canManage || saving} onChange={(e) => save({ channelId: (e.target.value || null) as Id<"channels"> | null })}
                                className="h-9 rounded-lg border border-plum/15 bg-surface px-2.5 text-sm text-ink focus:border-brand focus:outline-none">
                                <option value="">Don&apos;t post a recap</option>
                                {publicChannels.map((c) => <option key={c._id} value={c._id}># {c.name}</option>)}
                            </select>
                        </label>
                    </div>
                )}
                {!data.canManage && <p className="mt-3 text-xs text-ink/60">Only the owner and admins can change agents.</p>}
            </div>

            <div className="rounded-xl border border-plum/12 bg-surface p-4">
                <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-ink/75">Agent runs this month</span>
                    <span className="tabular-nums text-ink/60">{used} of {limit === -1 ? "unlimited" : limit}</span>
                </div>
                {limit > 0 && <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-cream-deep"><div className={cn("h-full rounded-full", pct >= 100 ? "bg-red-500" : "bg-brand")} style={{ width: `${pct}%` }} /></div>}
            </div>

            <div>
                <p className="mb-2 text-xs font-semibold text-ink/70">Recent work</p>
                {data.runs.length === 0 ? (
                    <p className="rounded-xl border border-dashed border-plum/15 px-4 py-6 text-center text-sm text-ink/60">
                        {agent.enabled ? "Nothing yet. It starts after the next meeting with an AI summary." : "Turn the agent on to see its work here."}
                    </p>
                ) : (
                    <ul className="flex flex-col gap-2">
                        {data.runs.map((r) => (
                            <li key={r._id} className="rounded-xl border border-plum/12 bg-surface">
                                <button type="button" onClick={() => setOpen(open === r._id ? null : r._id)} aria-expanded={open === r._id}
                                    className="flex w-full items-center gap-3 px-3.5 py-3 text-left">
                                    <span className="min-w-0 flex-1">
                                        <span className="block truncate text-sm font-medium text-ink">{r.meetingTitle ?? "Deleted meeting"}</span>
                                        <span className="block text-[11px] text-ink/60">{when(r._creationTime)} · {r.actions.length} item{r.actions.length === 1 ? "" : "s"}</span>
                                    </span>
                                    <StatusPill status={r.status} />
                                </button>
                                {open === r._id && (
                                    <div className="border-t border-plum/10 px-3.5 py-3">
                                        {r.note && r.status !== "failed" && <p className="mb-3 text-xs text-ink/60">{r.note}</p>}
                                        <AgentRunCard key={`${r._id}:${r.status}`} run={r} canDecide={data.canDecide} compact />
                                    </div>
                                )}
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </div>
    )
}
