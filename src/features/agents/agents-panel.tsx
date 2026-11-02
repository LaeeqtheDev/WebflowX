"use client"
import { useState } from "react"
import { useMutation, useQuery } from "convex/react"
import { AtSign, Bot, Check, Inbox, Loader2, Send, ShieldCheck, Sun, Zap } from "lucide-react"
import { toast } from "sonner"
import { api } from "../../../convex/_generated/api"
import type { Id } from "../../../convex/_generated/dataModel"
import { friendlyError } from "@/hooks/use-limit-handler"
import { cn } from "@/lib/utils"
import { AgentRunCard, StatusPill, type AgentRunView } from "./agent-run"

type Kind = "meetingFollowUp" | "triage" | "standup" | "assistant"
type AgentSettings = {
    enabled: boolean; mode: "suggest" | "act"; channelId: string | null; channelIds: string[]
    postHour?: number; postTz?: string; weekdaysOnly?: boolean
}
type Channel = { _id: string; name: string; isPrivate?: boolean }
export type SaveArgs = {
    kind: Kind; enabled: boolean; mode: "suggest" | "act"; channelId: Id<"channels"> | null; channelIds: Id<"channels">[]
    postHour?: number; postTz?: string; weekdaysOnly?: boolean
}

export type OverviewData = {
    canManage: boolean
    canDecide: boolean
    agents: Record<Kind, AgentSettings | null>
    usage: { used: number; limit: number; costUsd?: number; tokens?: number }
    runs: AgentRunView[]
}

const MAX_WATCHED = 10
const OFF: AgentSettings = { enabled: false, mode: "suggest", channelId: null, channelIds: [] }

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

// Settings › Agents: switch agents on, choose how much they may do on their own, and see what they did.
export const AgentsPanel = ({ workspaceId, onSampleReady }: { workspaceId: Id<"workspaces">; onSampleReady?: (meetingId: Id<"meetings">) => void }) => {
    const data = useQuery(api.agents.overview, { workspaceId })
    const channels = useQuery(api.channels.get, { workspaceId })
    const configure = useMutation(api.agents.configure)
    const postNow = useMutation(api.agents.runStandupNow)
    const trySample = useMutation(api.agents.trySample)
    if (data === undefined) return <div className="flex justify-center py-10"><Loader2 className="size-5 animate-spin text-brand" /></div>
    if (data === null) return <p className="text-sm text-ink/60">You don&apos;t have access to agents in this workspace.</p>
    return <AgentsPanelView data={data as unknown as OverviewData} channels={channels ?? []} onSave={(next) => configure({ workspaceId, ...next })} onPostStandup={() => postNow({ workspaceId })}
        onTrySample={async () => { const id = await trySample({ workspaceId }); onSampleReady?.(id) }} />
}

const ModePicker = ({ value, disabled, onChange }: { value: "suggest" | "act"; disabled: boolean; onChange: (m: "suggest" | "act") => void }) => (
    <fieldset>
        <legend className="mb-2 text-xs font-semibold text-ink/70">How much can it do on its own?</legend>
        <div className="grid gap-2 sm:grid-cols-2">
            {([
                ["suggest", ShieldCheck, "Suggest, we approve", "Proposals wait for someone who manages tasks to approve them."],
                ["act", Zap, "Act on its own", "Tasks are added straight away. You can still edit or delete them."],
            ] as const).map(([mode, Icon, title, blurb]) => (
                <button key={mode} type="button" disabled={disabled} onClick={() => onChange(mode)} aria-pressed={value === mode}
                    className={cn("flex items-start gap-2.5 rounded-xl border p-3 text-left transition-colors disabled:opacity-60", value === mode ? "border-brand bg-brand/5 ring-2 ring-brand/15" : "border-plum/12 hover:bg-cream-deep")}>
                    <Icon className={cn("mt-0.5 size-4 shrink-0", value === mode ? "text-brand" : "text-ink/60")} aria-hidden="true" />
                    <span><span className="block text-sm font-semibold text-ink">{title}</span><span className="mt-0.5 block text-xs leading-relaxed text-ink/60">{blurb}</span></span>
                </button>
            ))}
        </div>
    </fieldset>
)

const AgentCard = ({ icon: Icon, title, blurb, settings, canManage, saving, onToggle, children }: {
    icon: typeof Bot; title: string; blurb: string; settings: AgentSettings; canManage: boolean; saving: boolean
    onToggle: (on: boolean) => void; children?: React.ReactNode
}) => (
    <div className={cn("rounded-2xl border p-4 sm:p-5", settings.enabled ? "border-brand/30 bg-brand/[0.03]" : "border-plum/12 bg-surface")}>
        <div className="flex items-start gap-3">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-plum text-white dark:bg-white/10"><Icon className="size-5" aria-hidden="true" /></span>
            <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold tracking-tight text-ink">{title}</p>
                <p className="mt-0.5 text-xs leading-relaxed text-ink/60">{blurb}</p>
            </div>
            <Switch on={settings.enabled} disabled={!canManage || saving} onChange={onToggle} label={title} />
        </div>
        {children && <div className="mt-4 flex flex-col gap-4 border-t border-plum/10 pt-4">{children}</div>}
    </div>
)

// The panel itself, given its data (kept apart from the queries so it can be shown with sample data).
// the browser's own time zone, used when the standup is first set up
const localTz = () => { try { return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC" } catch { return "UTC" } }
const hourLabel = (h: number) => new Date(Date.UTC(2026, 0, 1, h)).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", timeZone: "UTC" })

export const AgentsPanelView = ({ data, channels, onSave, onPostStandup, onTrySample }: {
    data: OverviewData; channels: Channel[]; onSave: (next: SaveArgs) => Promise<unknown>; onPostStandup?: () => Promise<unknown>
    onTrySample?: () => Promise<unknown>
}) => {
    const [trying, setTrying] = useState(false)
    const runSample = async () => {
        if (!onTrySample) return
        setTrying(true)
        try { await onTrySample(); toast.success("The follow-up agent is reading a sample meeting") }
        catch (e) { toast.error(friendlyError(e, "Couldn't start the sample")) }
        finally { setTrying(false) }
    }
    const [saving, setSaving] = useState<Kind | null>(null)
    const [open, setOpen] = useState<string | null>(null)
    // triage can be switched on only once channels are picked, so the picks are held here first
    const [draftWatch, setDraftWatch] = useState<string[] | null>(null)
    const followUp = data.agents.meetingFollowUp ?? OFF
    const triage = data.agents.triage ?? OFF
    const standup = data.agents.standup ?? OFF
    const assistant = data.agents.assistant ?? OFF
    const [draftStandupChannel, setDraftStandupChannel] = useState<string | null>(null)
    const [posting, setPosting] = useState(false)
    const watch = draftWatch ?? triage.channelIds
    const publicChannels = channels.filter((c) => !c.isPrivate)
    const disabled = !data.canManage

    const save = async (kind: Kind, next: Partial<AgentSettings>, message?: string) => {
        const cur = kind === "triage" ? { ...triage, channelIds: watch }
            : kind === "standup" ? { ...standup, channelId: draftStandupChannel ?? standup.channelId, postTz: standup.enabled ? standup.postTz : localTz() }
            : followUp
        const merged = { ...cur, ...next }
        setSaving(kind)
        try {
            await onSave({
                kind, enabled: merged.enabled, mode: merged.mode, channelId: (merged.channelId as Id<"channels"> | null) ?? null, channelIds: merged.channelIds as Id<"channels">[],
                ...(kind === "standup" ? { postHour: merged.postHour ?? 9, postTz: merged.postTz ?? localTz(), weekdaysOnly: merged.weekdaysOnly ?? true } : {}),
            })
            if (kind === "standup") setDraftStandupChannel(null)
            if (kind === "triage") setDraftWatch(null)
            if (message) toast.success(message)
        } catch (e) {
            toast.error(friendlyError(e, "Couldn't save"))
        } finally {
            setSaving(null)
        }
    }
    const toggleWatch = (id: string) => {
        const next = watch.includes(id) ? watch.filter((c) => c !== id) : [...watch, id]
        if (next.length > MAX_WATCHED) { toast.info(`The agent can watch up to ${MAX_WATCHED} channels`); return }
        setDraftWatch(next)
        // once it's on, changes save straight away (but it can't be left watching nothing)
        if (triage.enabled && next.length > 0) void save("triage", { channelIds: next })
    }
    const { used, limit } = data.usage
    const pct = limit > 0 ? Math.min(100, Math.round((used / limit) * 100)) : 0

    return (
        <div className="flex flex-col gap-5">
            <div>
                <h3 className="text-[15px] font-semibold tracking-tight text-ink">Agents</h3>
                <p className="mt-1 text-sm text-ink/60">AI teammates that do the follow-up work for you. They act with the permissions of the admin who turns them on, and every action is logged.</p>
            </div>

            {data.canManage && onTrySample && (
                <div className="flex flex-col gap-3 rounded-xl border border-brand/30 bg-brand/[0.06] p-4 sm:flex-row sm:items-center">
                    <span aria-hidden className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-brand text-white"><Zap className="size-5" /></span>
                    <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold tracking-tight text-ink">See an agent work in 30 seconds</p>
                        <p className="mt-0.5 text-[13px] text-ink/65">Run the follow-up agent on a made-up meeting. It suggests tasks for people in this workspace, and nothing is created until you approve. Uses one agent run; the sample doesn&apos;t count as a meeting.</p>
                    </div>
                    <button type="button" onClick={runSample} disabled={trying}
                        className="inline-flex h-9 shrink-0 items-center justify-center gap-1.5 rounded-lg bg-brand px-3.5 text-sm font-semibold text-white transition-colors hover:bg-brand-hover disabled:opacity-60">
                        {trying ? <Loader2 className="size-4 animate-spin" /> : <Zap className="size-4" />} Try it on a sample meeting
                    </button>
                </div>
            )}

            <AgentCard icon={AtSign} title="Ask the agent in chat" settings={assistant} canManage={data.canManage} saving={saving === "assistant"}
                blurb="Anyone can type @agent in a channel or thread: “@agent what did we decide about pricing?”, “@agent summarise this thread”, “@agent make tasks from this”. It answers in the thread."
                onToggle={(on) => save("assistant", { enabled: on }, on ? "@agent is on" : "@agent is off")}>
                {assistant.enabled && (
                    <ul className="flex flex-col gap-1.5 text-xs leading-relaxed text-ink/65">
                        <li className="flex gap-2"><ShieldCheck className="mt-0.5 size-3.5 shrink-0 text-brand" aria-hidden="true" />It only searches channels, tasks and meetings the person asking can see. Never DMs.</li>
                        <li className="flex gap-2"><ShieldCheck className="mt-0.5 size-3.5 shrink-0 text-brand" aria-hidden="true" />Tasks it makes are created as the person asking, with their permissions.</li>
                        <li className="flex gap-2"><ShieldCheck className="mt-0.5 size-3.5 shrink-0 text-brand" aria-hidden="true" />Each question is one agent run. One person can ask up to 20 times an hour.</li>
                    </ul>
                )}
            </AgentCard>

            <AgentCard icon={Bot} title="Meeting follow-up agent" settings={followUp} canManage={data.canManage} saving={saving === "meetingFollowUp"}
                blurb="After a meeting's AI summary, it turns the action items into tasks for the right people, with due dates when they were said, and posts a short recap."
                onToggle={(on) => save("meetingFollowUp", { enabled: on }, on ? "Follow-up agent is on" : "Follow-up agent is off")}>
                {followUp.enabled && (
                    <>
                        <ModePicker value={followUp.mode} disabled={disabled || !!saving} onChange={(mode) => save("meetingFollowUp", { mode })} />
                        <label className="flex flex-col gap-1.5">
                            <span className="text-xs font-semibold text-ink/70">Post the recap in</span>
                            <select value={followUp.channelId ?? ""} disabled={disabled || !!saving} onChange={(e) => save("meetingFollowUp", { channelId: e.target.value || null })}
                                className="h-9 rounded-lg border border-plum/15 bg-surface px-2.5 text-sm text-ink focus:border-brand focus:outline-none">
                                <option value="">Don&apos;t post a recap</option>
                                {publicChannels.map((c) => <option key={c._id} value={c._id}># {c.name}</option>)}
                            </select>
                        </label>
                    </>
                )}
            </AgentCard>

            <AgentCard icon={Inbox} title="Chat triage agent" settings={triage} canManage={data.canManage} saving={saving === "triage"}
                blurb="Watches the channels you pick. When someone asks for something (“can someone fix the checkout bug?”), it makes a task for the right person and replies in the thread."
                onToggle={(on) => {
                    if (on && watch.length === 0) { setDraftWatch([]); toast.info("Pick the channels it should watch first"); return }
                    void save("triage", { enabled: on }, on ? "Triage agent is on" : "Triage agent is off")
                }}>
                {(triage.enabled || draftWatch !== null) && (
                    <>
                        <div>
                            <p className="mb-2 text-xs font-semibold text-ink/70">Channels it watches <span className="font-normal text-ink/60">({watch.length}/{MAX_WATCHED}, public channels only)</span></p>
                            <div className="flex flex-wrap gap-1.5">
                                {publicChannels.map((c) => {
                                    const on = watch.includes(c._id)
                                    return (
                                        <button key={c._id} type="button" disabled={disabled || !!saving} aria-pressed={on} onClick={() => toggleWatch(c._id)}
                                            className={cn("inline-flex h-8 items-center gap-1.5 rounded-full border px-3 text-xs font-medium transition-colors disabled:opacity-60", on ? "border-brand bg-brand/10 text-orange-ink" : "border-plum/15 text-ink/70 hover:bg-cream-deep")}>
                                            {on && <Check className="size-3" aria-hidden="true" />}# {c.name}
                                        </button>
                                    )
                                })}
                            </div>
                            {!triage.enabled && (
                                <button type="button" disabled={disabled || !!saving || watch.length === 0} onClick={() => save("triage", { enabled: true }, "Triage agent is on")}
                                    className="mt-3 inline-flex h-8 items-center gap-1.5 rounded-lg bg-brand px-3 text-xs font-semibold text-white hover:bg-brand-hover disabled:opacity-50">
                                    Turn on for {watch.length} channel{watch.length === 1 ? "" : "s"}
                                </button>
                            )}
                        </div>
                        {triage.enabled && <ModePicker value={triage.mode} disabled={disabled || !!saving} onChange={(mode) => save("triage", { mode })} />}
                        <p className="text-[11px] leading-relaxed text-ink/60">It waits a minute after a request so a burst of messages is read together. Only messages that look like requests count towards your agent runs.</p>
                    </>
                )}
            </AgentCard>

            <AgentCard icon={Sun} title="Daily standup agent" settings={standup} canManage={data.canManage} saving={saving === "standup"}
                blurb="Every morning it posts what got done, what's due today and what's overdue, plus any blockers people mentioned in chat. Quiet days are skipped."
                onToggle={(on) => {
                    const channel = draftStandupChannel ?? standup.channelId
                    if (on && !channel) { setDraftStandupChannel(publicChannels[0]?._id ?? ""); toast.info("Pick the channel it posts in"); return }
                    void save("standup", { enabled: on }, on ? "Standup agent is on" : "Standup agent is off")
                }}>
                {(standup.enabled || draftStandupChannel !== null) && (
                    <>
                        <div className="grid gap-3 sm:grid-cols-2">
                            <label className="flex flex-col gap-1.5">
                                <span className="text-xs font-semibold text-ink/70">Post in</span>
                                <select value={draftStandupChannel ?? standup.channelId ?? ""} disabled={disabled || !!saving}
                                    onChange={(e) => { if (standup.enabled) { if (e.target.value) void save("standup", { channelId: e.target.value }) } else setDraftStandupChannel(e.target.value) }}
                                    className="h-9 rounded-lg border border-plum/15 bg-surface px-2.5 text-sm text-ink focus:border-brand focus:outline-none">
                                    {!standup.enabled && <option value="">Pick a channel</option>}
                                    {publicChannels.map((c) => <option key={c._id} value={c._id}># {c.name}</option>)}
                                </select>
                            </label>
                            <label className="flex flex-col gap-1.5">
                                <span className="text-xs font-semibold text-ink/70">Every morning at</span>
                                <select value={standup.postHour ?? 9} disabled={disabled || !!saving || !standup.enabled} onChange={(e) => save("standup", { postHour: Number(e.target.value) })}
                                    className="h-9 rounded-lg border border-plum/15 bg-surface px-2.5 text-sm text-ink focus:border-brand focus:outline-none">
                                    {Array.from({ length: 24 }, (_, h) => <option key={h} value={h}>{hourLabel(h)}</option>)}
                                </select>
                            </label>
                        </div>
                        <div className="flex flex-wrap items-center justify-between gap-3">
                            <label className="flex items-center gap-2 text-sm text-ink/80">
                                <input type="checkbox" className="size-4 accent-brand" checked={standup.weekdaysOnly ?? true} disabled={disabled || !!saving || !standup.enabled}
                                    onChange={(e) => save("standup", { weekdaysOnly: e.target.checked })} />
                                Weekdays only
                            </label>
                            <span className="text-[11px] text-ink/60">Time zone: {(standup.enabled ? standup.postTz : localTz())?.replace(/_/g, " ")}</span>
                        </div>
                        {standup.enabled ? (
                            onPostStandup && (
                                <button type="button" disabled={disabled || posting} onClick={async () => {
                                    setPosting(true)
                                    try { await onPostStandup(); toast.success("Writing today's standup. It'll appear in the channel in a moment.") }
                                    catch (e) { toast.error(friendlyError(e, "Couldn't post the standup")) } finally { setPosting(false) }
                                }}
                                    className="inline-flex h-8 w-fit items-center gap-1.5 rounded-lg border border-plum/15 px-3 text-xs font-semibold text-ink/80 hover:bg-cream-deep disabled:opacity-50">
                                    {posting ? <Loader2 className="size-3.5 animate-spin" /> : <Send className="size-3.5" />} Post one now
                                </button>
                            )
                        ) : (
                            <button type="button" disabled={disabled || !!saving || !draftStandupChannel} onClick={() => save("standup", { enabled: true }, "Standup agent is on")}
                                className="inline-flex h-8 w-fit items-center gap-1.5 rounded-lg bg-brand px-3 text-xs font-semibold text-white hover:bg-brand-hover disabled:opacity-50">
                                Turn on
                            </button>
                        )}
                    </>
                )}
            </AgentCard>

            {!data.canManage && <p className="-mt-2 text-xs text-ink/60">Only the owner and admins can change agents.</p>}

            <div className="rounded-xl border border-plum/12 bg-surface p-4">
                <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-ink/75">Agent runs this month</span>
                    <span className="tabular-nums text-ink/60">{used} of {limit === -1 ? "unlimited" : limit}</span>
                </div>
                {limit > 0 && <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-cream-deep"><div className={cn("h-full rounded-full", pct >= 100 ? "bg-red-500" : "bg-brand")} style={{ width: `${pct}%` }} /></div>}
                {data.usage.costUsd !== undefined && (
                    <p className="mt-2.5 flex items-center justify-between text-[11px] text-ink/60">
                        <span>AI cost this month (estimate, only admins see this)</span>
                        <span className="tabular-nums font-semibold text-ink/75">
                            {data.usage.costUsd < 0.01 && (data.usage.tokens ?? 0) > 0 ? "under $0.01" : `$${data.usage.costUsd.toFixed(2)}`}
                            {(data.usage.tokens ?? 0) > 0 && <span className="font-normal text-ink/60"> · {(data.usage.tokens! / 1000).toFixed(1)}k tokens</span>}
                        </span>
                    </p>
                )}
            </div>

            <div>
                <p className="mb-2 text-xs font-semibold text-ink/70">Recent work</p>
                {data.runs.length === 0 ? (
                    <p className="rounded-xl border border-dashed border-plum/15 px-4 py-6 text-center text-sm text-ink/60">
                        {followUp.enabled || triage.enabled || standup.enabled || assistant.enabled ? "Nothing yet. Their work shows up here." : "Turn an agent on to see its work here."}
                    </p>
                ) : (
                    <ul className="flex flex-col gap-2">
                        {data.runs.map((r) => (
                            <li key={r._id} className="rounded-xl border border-plum/12 bg-surface">
                                <button type="button" onClick={() => setOpen(open === r._id ? null : r._id)} aria-expanded={open === r._id}
                                    className="flex w-full items-center gap-3 px-3.5 py-3 text-left">
                                    <span className={cn("flex size-7 shrink-0 items-center justify-center rounded-lg", r.kind === "meetingFollowUp" ? "bg-plum/10 text-plum dark:bg-white/10 dark:text-white/80" : "bg-brand/12 text-orange-ink")}>
                                        {r.kind === "triage" ? <Inbox className="size-3.5" aria-hidden="true" /> : r.kind === "standup" ? <Sun className="size-3.5" aria-hidden="true" /> : r.kind === "assistant" ? <AtSign className="size-3.5" aria-hidden="true" /> : <Bot className="size-3.5" aria-hidden="true" />}
                                    </span>
                                    <span className="min-w-0 flex-1">
                                        <span className="block truncate text-sm font-medium text-ink">
                                            {r.kind === "triage" ? `Requests in #${r.channelName ?? "deleted channel"}`
                                                : r.kind === "standup" ? `Standup in #${r.channelName ?? "deleted channel"}`
                                                : r.kind === "assistant" ? `Question in #${r.channelName ?? "deleted channel"}`
                                                : r.meetingTitle ?? "Deleted meeting"}
                                        </span>
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
