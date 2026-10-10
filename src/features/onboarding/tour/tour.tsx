"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { useMutation, useQuery } from "convex/react"
import { toast } from "sonner"
import {
  Bell, BookOpen, CalendarDays, Check, CheckSquare, Database, FileText, Hash, Mic, MicOff, MessageSquare, Monitor,
  Plug, Search, Shield, StickyNote, Upload, Users, Video, VideoOff, X,
} from "lucide-react"
import { LanguagePicker, useT } from "@/lib/i18n"
import type { Key } from "@/lib/i18n/en"
import { api } from "../../../../convex/_generated/api"
import { Id } from "../../../../convex/_generated/dataModel"
import {
  TOUR_STEPS, STAGE_TO_STATUS, createdItems, quillBody, saveTour, stepDone,
  type Priority, type TaskStage, type TourState,
} from "./state"

type T = ReturnType<typeof useT>
const primary = "cursor-pointer rounded-xl bg-brand px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-hover disabled:cursor-not-allowed disabled:opacity-50"
const ghost = "cursor-pointer rounded-xl border border-ink/15 bg-surface px-4 py-2 text-sm text-ink/80 hover:border-ink/30"

const SIDEBAR_FOR_STEP: Record<number, "chat" | "tasks" | "docs" | "meeting" | "search" | null> = {
  1: "chat", 2: "chat", 3: "chat", 4: "chat", 5: "tasks", 6: "docs", 7: "meeting", 8: "search", 9: null, 10: null,
}

/* ---------------- practice screens ---------------- */

const Msg = ({ who, text, reacted, children }: { who: string; text: string; reacted?: string; children?: React.ReactNode }) => (
  <div className="flex gap-3 rounded-lg px-3 py-2.5">
    <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-brand/15 text-sm font-semibold text-brand">{who.slice(0, 1).toUpperCase()}</span>
    <div className="min-w-0 flex-1">
      <p className="text-sm font-semibold text-ink">{who}</p>
      <p className="mt-0.5 break-words text-sm text-ink/80">{text}</p>
      {reacted && <span className="mt-1.5 inline-flex rounded-full border border-brand/40 bg-brand/10 px-2 py-0.5 text-xs">{reacted} 1</span>}
      {children}
    </div>
  </div>
)

function ChatSteps({ s, set, t }: { s: TourState; set: (p: Partial<TourState>) => void; t: T }) {
  const [draft, setDraft] = useState(s.step === 2 ? t("tour.s2.seed") : "")
  const [menu, setMenu] = useState<"ai" | "fmt">("ai")
  const [thread, setThread] = useState(false)
  const [reply, setReply] = useState("")
  const [taskOpen, setTaskOpen] = useState(false)
  const [priority, setPriority] = useState<Priority>("medium")
  const target = s.msg2 ?? s.msg1 ?? t("tour.s2.polished")
  const [taskTitle, setTaskTitle] = useState(target)
  const slashOpen = s.step === 2 && draft.endsWith("/")

  const send = () => {
    const text = draft.trim().replace(/\/$/, "").trim()
    if (!text) return
    if (s.step === 1) set({ msg1: text })
    else set({ msg2: text })
    setDraft("")
  }
  const pickAi = () => setDraft(t("tour.s2.polished"))
  const pickFmt = (id: "h1" | "list" | "code") => {
    const base = draft.replace(/\/$/, "").trim()
    setDraft(id === "h1" ? `# ${base}` : id === "list" ? `• ${base}` : `\`${base}\``)
  }

  const showActions = s.step === 3 || s.step === 4
  return (
    <div className="flex h-full min-h-[22rem] flex-col rounded-xl border border-ink/10 bg-surface">
      <div className="flex items-center gap-2 border-b border-ink/10 px-4 py-3 text-sm font-semibold text-ink"><Hash className="size-4" />general</div>
      <div className="flex-1 space-y-1 overflow-y-auto p-2">
        <Msg who="WebflowX" text={t("tour.s1.body")} />
        {s.msg1 && <Msg who={t("tour.you")} text={s.msg1} reacted={s.step >= 3 && !s.msg2 ? s.reacted : undefined} />}
        {s.msg2 && (
          <Msg who={t("tour.you")} text={s.msg2} reacted={s.reacted}>
            {showActions && (
              <div className="mt-2 flex flex-wrap items-center gap-1.5">
                {["👍", "❤️", "🎉"].map((e) => (
                  <button key={e} type="button" disabled={s.step !== 3} onClick={() => set({ reacted: e })} className={`${ghost} px-2.5 py-1 disabled:opacity-40`} aria-label={e}>{e}</button>
                ))}
                <button type="button" disabled={s.step !== 3} onClick={() => setThread((v) => !v)} className={`${ghost} py-1 text-xs disabled:opacity-40`}>{t("tour.s3.thread")}</button>
                <button type="button" disabled={s.step !== 4 || !!s.task} onClick={() => setTaskOpen(true)} className={`${ghost} py-1 text-xs ${s.step === 4 && !s.task ? "!border-brand !text-brand" : "disabled:opacity-40"}`}>{t("tour.s3.task")}</button>
                <button type="button" disabled className={`${ghost} py-1 text-xs opacity-40`}>{t("tour.s3.save")}</button>
              </div>
            )}
            {thread && (
              <div className="mt-2 space-y-1.5 border-l-2 border-ink/15 pl-3">
                {s.replies.map((r, i) => <p key={i} className="text-sm text-ink/75">{r}</p>)}
                <form onSubmit={(e) => { e.preventDefault(); if (reply.trim()) { set({ replies: [...s.replies, reply.trim()] }); setReply("") } }}>
                  <input value={reply} onChange={(e) => setReply(e.target.value)} placeholder={t("tour.s3.threadPh")} className="w-full rounded-md border border-ink/15 bg-white px-2 py-1 text-sm" />
                </form>
              </div>
            )}
          </Msg>
        )}
        {!s.msg2 && s.step >= 3 && s.msg1 && <p className="px-3 text-xs text-ink/60">{t("tour.s4.body")}</p>}
      </div>

      {(s.step === 1 || s.step === 2) && (
        <div className="relative border-t border-ink/10 p-3">
          {slashOpen && (
            <div className="absolute bottom-full left-3 z-10 mb-1 w-64 rounded-xl border border-ink/15 bg-white p-1.5 shadow-lg" role="menu">
              <div className="mb-1 flex gap-1">
                {(["ai", "fmt"] as const).map((k) => (
                  <button key={k} type="button" onClick={() => setMenu(k)} className={`flex-1 rounded-md px-2 py-1 text-xs font-semibold ${menu === k ? "bg-brand/10 text-brand" : "text-ink/60"}`}>{t(k === "ai" ? "tour.s2.tabAi" : "tour.s2.tabFmt")}</button>
                ))}
              </div>
              {menu === "ai"
                ? (["improve", "grammar", "shorter"] as const).map((k) => (
                  <button key={k} type="button" role="menuitem" onClick={pickAi} className="block w-full rounded-md px-2 py-1.5 text-left text-sm hover:bg-ink/5">✨ {t(`tour.s2.${k}` as Key)}</button>
                ))
                : (["h1", "list", "code"] as const).map((k) => (
                  <button key={k} type="button" role="menuitem" onClick={() => pickFmt(k)} className="block w-full rounded-md px-2 py-1.5 text-left text-sm hover:bg-ink/5">{t(`tour.s2.${k}` as Key)}</button>
                ))}
            </div>
          )}
          <form onSubmit={(e) => { e.preventDefault(); if (!slashOpen) send() }} className="flex gap-2">
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder={t("tour.s1.ph")}
              aria-label={t("tour.s1.ph")}
              className="min-w-0 flex-1 rounded-lg border border-ink/15 bg-white px-3 py-2 text-sm"
              autoFocus
            />
            {s.step === 2 && !slashOpen && <button type="button" onClick={() => setDraft((d) => `${d.trim()} /`)} className={ghost}>{t("tour.s2.insert")}</button>}
            <button type="submit" disabled={!draft.trim() || slashOpen} className={primary}>{t("tour.send")}</button>
          </form>
          {s.step === 2 && <p className="mt-2 text-xs text-ink/60">{t("tour.s2.note")}</p>}
        </div>
      )}

      {taskOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4" role="dialog" aria-modal="true" aria-label={t("tour.s4.modal")}>
          <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-xl">
            <div className="flex items-center justify-between"><p className="font-semibold text-ink">{t("tour.s4.modal")}</p><button type="button" onClick={() => setTaskOpen(false)} aria-label="Close"><X className="size-4" /></button></div>
            <label className="mt-4 block text-sm font-medium text-ink">{t("tour.s4.name")}
              <input value={taskTitle} onChange={(e) => setTaskTitle(e.target.value)} maxLength={120} className="mt-1 w-full rounded-lg border border-ink/15 px-3 py-2 text-sm font-normal" />
            </label>
            <p className="mt-4 text-sm font-medium text-ink">{t("tour.s4.priority")}</p>
            <div className="mt-1 flex flex-wrap gap-1.5">
              {(["urgent", "high", "medium", "low"] as const).map((p) => (
                <button key={p} type="button" aria-pressed={priority === p} onClick={() => setPriority(p)} className={`rounded-full border px-3 py-1 text-xs ${priority === p ? "border-brand bg-brand/10 text-ink" : "border-ink/15 text-ink/70"}`}>{t(`tour.p.${p}` as Key)}</button>
              ))}
            </div>
            <button type="button" disabled={!taskTitle.trim()} onClick={() => { set({ task: { title: taskTitle.trim(), priority, stage: "todo" } }); setTaskOpen(false) }} className={`${primary} mt-5 w-full`}>{t("tour.s4.create")}</button>
          </div>
        </div>
      )}
    </div>
  )
}

function Board({ s, set, t }: { s: TourState; set: (p: Partial<TourState>) => void; t: T }) {
  const cols: { stage: TaskStage; label: Key }[] = [
    { stage: "todo", label: "tour.s5.todo" }, { stage: "progress", label: "tour.s5.progress" }, { stage: "done", label: "tour.s5.finished" },
  ]
  const next = (st: TaskStage): TaskStage => (st === "todo" ? "progress" : "done")
  return (
    <div className="grid gap-3 sm:grid-cols-3">
      {cols.map((c) => (
        <div key={c.stage} className="min-h-[10rem] rounded-xl border border-ink/10 bg-surface p-3">
          <p className="text-xs font-semibold uppercase tracking-wider text-ink/60">{t(c.label)}</p>
          {s.task?.stage === c.stage ? (
            <div className="mt-3 rounded-lg border border-ink/10 bg-white p-3">
              <p className="text-sm font-medium text-ink">{s.task.title}</p>
              <p className="mt-1 text-xs text-ink/60">{t(`tour.p.${s.task.priority}` as Key)}</p>
              {c.stage !== "done" && (
                <button type="button" onClick={() => set({ task: { ...s.task!, stage: next(c.stage) } })} className={`${primary} mt-3 w-full py-1.5 text-xs`}>
                  {t("tour.s5.move", { col: t(c.stage === "todo" ? "tour.s5.progress" : "tour.s5.finished") })}
                </button>
              )}
              {c.stage === "done" && <p className="mt-2 flex items-center gap-1 text-xs text-green-700"><Check className="size-3.5" />{t("tour.done")}</p>}
            </div>
          ) : <p className="mt-3 text-xs text-ink/40">{t("tour.s5.empty")}</p>}
        </div>
      ))}
    </div>
  )
}

function PageEditor({ s, set, t }: { s: TourState; set: (p: Partial<TourState>) => void; t: T }) {
  const [title, setTitle] = useState(s.page?.title ?? "")
  const [body, setBody] = useState(s.page?.body ?? "")
  return (
    <div className="rounded-xl border border-ink/10 bg-surface p-5">
      <input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={80} placeholder={t("tour.s6.titlePh")} aria-label={t("tour.s6.titlePh")} className="w-full bg-transparent text-2xl font-semibold text-ink outline-none placeholder:text-ink/30" />
      <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={7} placeholder={t("tour.s6.bodyPh")} aria-label={t("tour.s6.bodyPh")} className="mt-4 w-full resize-none rounded-lg border border-ink/10 bg-white p-3 text-sm outline-none" />
      <div className="mt-3 flex items-center gap-3">
        <button type="button" disabled={!title.trim() || !body.trim()} onClick={() => set({ page: { title: title.trim(), body: body.trim() } })} className={primary}>{t("tour.s6.save")}</button>
        {s.page && <span className="flex items-center gap-1 text-sm text-green-700"><Check className="size-4" />{t("tour.s6.saved")}</span>}
      </div>
    </div>
  )
}

function Transcript({ t }: { t: T }) {
  const [lines, setLines] = useState(0)
  useEffect(() => {
    const id = setInterval(() => setLines((n) => Math.min(3, n + 1)), 1400)
    return () => clearInterval(id)
  }, [])
  return (
    <div className="mt-4 rounded-lg bg-white/5 p-3 text-sm">
      <p className="text-xs font-semibold uppercase tracking-wider text-white/50">{t("tour.s7.live")}</p>
      <ul className="mt-2 space-y-1">{(["tour.s7.l1", "tour.s7.l2", "tour.s7.l3"] as const).slice(0, lines).map((k) => <li key={k}>{t(k)}</li>)}</ul>
    </div>
  )
}

function Meeting({ s, set, t }: { s: TourState; set: (p: Partial<TourState>) => void; t: T }) {
  const [mic, setMic] = useState(true)
  const [cam, setCam] = useState(true)
  const topic = s.page?.title ?? s.msg2 ?? s.msg1 ?? "WebflowX"
  return (
    <div className="rounded-xl border border-ink/10 bg-[#1b1017] p-4 text-white">
      <div className="grid gap-3 sm:grid-cols-3">
        {[t("tour.you"), "Sam", "Priya"].map((n, i) => (
          <div key={n} className="flex aspect-video items-center justify-center rounded-lg bg-white/10">
            <span className="flex size-12 items-center justify-center rounded-full bg-brand/70 text-lg font-semibold">{n.slice(0, 1)}</span>
            {i === 0 && !cam && <span className="sr-only">off</span>}
          </div>
        ))}
      </div>
      <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
        <button type="button" onClick={() => setMic((v) => !v)} className="inline-flex items-center gap-1.5 rounded-lg bg-white/10 px-3 py-2 text-xs" aria-pressed={mic}>{mic ? <Mic className="size-4" /> : <MicOff className="size-4" />}{t("tour.s7.mic")}</button>
        <button type="button" onClick={() => setCam((v) => !v)} className="inline-flex items-center gap-1.5 rounded-lg bg-white/10 px-3 py-2 text-xs" aria-pressed={cam}>{cam ? <Video className="size-4" /> : <VideoOff className="size-4" />}{t("tour.s7.cam")}</button>
        <button type="button" className="inline-flex items-center gap-1.5 rounded-lg bg-white/10 px-3 py-2 text-xs"><Monitor className="size-4" />{t("tour.s7.share")}</button>
        {s.meeting === "idle" && <button type="button" onClick={() => set({ meeting: "live" })} className={primary}>{t("tour.s7.start")}</button>}
        {s.meeting === "live" && <button type="button" onClick={() => set({ meeting: "ended" })} className={primary}>{t("tour.s7.end")}</button>}
      </div>
      {s.meeting === "live" && (
        <Transcript t={t} />
      )}
      {s.meeting === "ended" && (
        <div className="mt-4 rounded-lg bg-white p-4 text-ink">
          <p className="text-xs font-semibold uppercase tracking-wider text-ink/60">{t("tour.s7.sumH")}</p>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">
            <li>{t("tour.s7.sumTopic", { title: topic })}</li>
            {s.task && <li>{t("tour.s7.sumAction", { task: s.task.title })}</li>}
          </ul>
          <p className="mt-3 text-xs text-ink/60">{t("tour.s7.sumNote")}</p>
        </div>
      )}
    </div>
  )
}

function SearchStep({ s, set, t }: { s: TourState; set: (p: Partial<TourState>) => void; t: T }) {
  const [q, setQ] = useState("")
  const results = useMemo(() => {
    const needle = q.trim().toLowerCase()
    if (!needle) return []
    const all: { kind: Key; text: string }[] = []
    if (s.msg1) all.push({ kind: "tour.s8.kMsg", text: s.msg1 })
    if (s.msg2) all.push({ kind: "tour.s8.kMsg", text: s.msg2 })
    if (s.task) all.push({ kind: "tour.s8.kTask", text: s.task.title })
    if (s.page) all.push({ kind: "tour.s8.kPage", text: `${s.page.title} ${s.page.body}` })
    return all.filter((r) => r.text.toLowerCase().includes(needle))
  }, [q, s])
  useEffect(() => { if (results.length && !s.searched) set({ searched: true }) }, [results.length, s.searched, set])
  return (
    <div className="rounded-xl border border-ink/10 bg-surface p-4">
      <div className="flex items-center gap-2 rounded-lg border border-ink/15 bg-white px-3 py-2"><Search className="size-4 text-ink/60" />
        <input value={q} onChange={(e) => setQ(e.target.value)} autoFocus placeholder={t("tour.s8.ph")} aria-label={t("tour.s8.ph")} className="w-full bg-transparent text-sm outline-none" />
      </div>
      <ul className="mt-3 space-y-1.5">
        {results.map((r, i) => <li key={i} className="rounded-lg bg-white px-3 py-2 text-sm"><span className="mr-2 rounded bg-ink/10 px-1.5 py-0.5 text-xs">{t(r.kind)}</span>{r.text.slice(0, 100)}</li>)}
        {q.trim() && !results.length && <li className="px-1 text-sm text-ink/60">{t("tour.s8.none")}</li>}
      </ul>
    </div>
  )
}

const MORE: { icon: React.ElementType; k: "notes" | "cal" | "db" | "dm" | "roles" | "api" | "import" | "sec" }[] = [
  { icon: StickyNote, k: "notes" }, { icon: CalendarDays, k: "cal" }, { icon: Database, k: "db" }, { icon: MessageSquare, k: "dm" },
  { icon: Users, k: "roles" }, { icon: Plug, k: "api" }, { icon: Upload, k: "import" }, { icon: Shield, k: "sec" },
]

/* ---------------- finish: keep or start fresh ---------------- */

function Finish({ s, workspaceId, workspaceName, onClose, t }: { s: TourState; workspaceId: Id<"workspaces">; workspaceName: string; onClose: () => void; t: T }) {
  const made = createdItems(s)
  const rows = ([
    made.msg1 && { id: "msg1", label: t("tour.k.msg1"), detail: s.msg1 },
    made.msg2 && { id: "msg2", label: t("tour.k.msg2"), detail: s.msg2 },
    made.task && { id: "task", label: t("tour.k.task"), detail: s.task?.title },
    made.page && { id: "page", label: t("tour.k.page"), detail: s.page?.title },
    made.meeting && { id: "meeting", label: t("tour.k.meeting"), detail: undefined },
  ].filter(Boolean)) as { id: string; label: string; detail?: string }[]
  const [picked, setPicked] = useState<Set<string>>(new Set(rows.map((r) => r.id)))
  const [busy, setBusy] = useState(false)
  const channels = useQuery(api.channels.get, { workspaceId })
  const sendMessage = useMutation(api.messages.create)
  const createTask = useMutation(api.tasks.create)
  const createNote = useMutation(api.notes.create)

  const keep = async () => {
    setBusy(true)
    let failed = false
    const general = channels?.find((c) => c.name === "general")
    const run = async (fn: () => Promise<unknown>) => { try { await fn() } catch { failed = true } }
    if (picked.has("msg1") && s.msg1 && general) await run(() => sendMessage({ workspaceId, channelId: general._id, body: quillBody(s.msg1!) }))
    else if (picked.has("msg1")) failed = true
    if (picked.has("msg2") && s.msg2 && general) await run(() => sendMessage({ workspaceId, channelId: general._id, body: quillBody(s.msg2!) }))
    else if (picked.has("msg2")) failed = true
    if (picked.has("task") && s.task) await run(() => createTask({ workspaceId, title: s.task!.title, status: STAGE_TO_STATUS[s.task!.stage], priority: s.task!.priority }))
    if (picked.has("page") && s.page) await run(() => createNote({ workspaceId, title: s.page!.title, body: s.page!.body, type: "workspace" }))
    if (picked.has("meeting")) {
      const lines = [t("tour.s7.sumTopic", { title: s.page?.title ?? s.msg2 ?? s.msg1 ?? "WebflowX" }), ...(s.task ? [t("tour.s7.sumAction", { task: s.task.title })] : [])]
      await run(() => createNote({ workspaceId, title: t("tour.s7.sumH"), body: lines.join("\n"), type: "workspace" }))
    }
    if (failed) toast.error(t("tour.keepFailed"))
    setBusy(false)
    onClose()
  }

  return (
    <div className="rounded-xl border border-ink/10 bg-surface p-5">
      {rows.length === 0 ? (
        <>
          <p className="text-sm text-ink/70">{t("tour.s10.none")}</p>
          <button type="button" onClick={onClose} className={`${primary} mt-5`}>{t("tour.open")}</button>
        </>
      ) : (
        <>
          <p className="text-sm text-ink/70">{t("tour.s10.body", { ws: workspaceName })}</p>
          <ul className="mt-4 space-y-2">
            {rows.map((r) => (
              <li key={r.id}>
                <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-ink/10 bg-white p-3">
                  <input type="checkbox" className="mt-1" checked={picked.has(r.id)} onChange={(e) => setPicked((cur) => { const n = new Set(cur); if (e.target.checked) n.add(r.id); else n.delete(r.id); return n })} />
                  <span className="text-sm"><span className="block font-medium text-ink">{r.label}</span>{r.detail && <span className="block text-ink/60">{r.detail.slice(0, 90)}</span>}</span>
                </label>
              </li>
            ))}
          </ul>
          <div className="mt-5 flex flex-wrap gap-3">
            <button type="button" disabled={busy || picked.size === 0} onClick={keep} className={primary}>{busy ? t("tour.saving") : t("tour.keep")}</button>
            <button type="button" disabled={busy} onClick={onClose} className={ghost}>{t("tour.fresh")}</button>
          </div>
        </>
      )}
    </div>
  )
}

/* ---------------- shell ---------------- */

export function OnboardingTour({ workspaceId, workspaceName, channels, initial, onSkip, onFinish }: {
  workspaceId: Id<"workspaces">; workspaceName: string; channels: string[]; initial: TourState; onSkip: () => void; onFinish: () => void
}) {
  const t = useT()
  const [s, setS] = useState<TourState>({ ...initial, skipped: false })
  const set = useCallback((p: Partial<TourState>) => setS((cur) => ({ ...cur, ...p })), [])
  const stableSet = set

  useEffect(() => { saveTour(workspaceId, s) }, [workspaceId, s])

  const goto = (n: number) => set({ step: Math.min(TOUR_STEPS, Math.max(1, n)) })
  const done = stepDone(s)
  const active = SIDEBAR_FOR_STEP[s.step]
  // Leaving mid-way keeps your progress, so the wizard can offer to resume. Nothing from the practice workspace is saved.
  const leave = () => { saveTour(workspaceId, { ...s, skipped: true }); onSkip() }
  const finish = () => { saveTour(workspaceId, { ...s, finished: true, skipped: false }); onFinish() }

  const nav = [
    { id: "tasks", icon: CheckSquare, label: t("tour.sb.tasks") },
    { id: "docs", icon: FileText, label: t("tour.sb.docs") },
    { id: "meeting", icon: Video, label: t("tour.sb.meeting") },
    { id: "search", icon: Search, label: t("tour.sb.search") },
  ] as const

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-cream-soft text-ink" role="dialog" aria-modal="true" aria-label="WebflowX tour">
      <header className="flex flex-wrap items-center gap-3 border-b border-ink/10 bg-white px-4 py-3">
        <span className="font-semibold">WebflowX</span>
        <span className="text-xs font-semibold uppercase tracking-wider text-ink/60">{t("tour.step", { n: s.step, total: TOUR_STEPS })}</span>
        <div className="hidden h-1.5 w-40 gap-1 sm:flex" role="progressbar" aria-valuemin={1} aria-valuemax={TOUR_STEPS} aria-valuenow={s.step}>
          {Array.from({ length: TOUR_STEPS }).map((_, i) => <span key={i} className={`h-1.5 flex-1 rounded-full ${i < s.step ? "bg-brand" : "bg-ink/10"}`} />)}
        </div>
        <div className="ml-auto flex items-center gap-3">
          <LanguagePicker />
          {s.step < TOUR_STEPS && <button type="button" onClick={leave} className="cursor-pointer text-sm font-medium text-ink/70 hover:text-ink">{t("tour.skip")}</button>}
        </div>
      </header>
      <p className="bg-brand/10 px-4 py-1.5 text-center text-xs text-ink/70">{t("tour.practice")}</p>

      <div className="grid min-h-0 flex-1 gap-4 overflow-y-auto p-4 md:grid-cols-[13rem_1fr] lg:grid-cols-[13rem_1fr_20rem]">
        <nav className="hidden rounded-xl border border-ink/10 bg-surface p-3 md:block" aria-hidden>
          <p className="px-2 text-xs font-semibold uppercase tracking-wider text-ink/60">{t("tour.sb.channels")}</p>
          <ul className="mt-1 space-y-0.5 text-sm">
            {Array.from(new Set(["general", ...channels])).map((c) => (
              <li key={c} className={`flex items-center gap-1.5 rounded-md px-2 py-1 ${c === "general" && active === "chat" ? "bg-brand/10 font-semibold" : "text-ink/70"}`}><Hash className="size-3.5" />{c}</li>
            ))}
          </ul>
          <ul className="mt-4 space-y-0.5 text-sm">
            {nav.map(({ id, icon: Icon, label }) => (
              <li key={id} className={`flex items-center gap-2 rounded-md px-2 py-1.5 ${active === id ? "bg-brand/10 font-semibold" : "text-ink/70"}`}><Icon className="size-4" />{label}</li>
            ))}
          </ul>
        </nav>

        <main className="min-w-0 lg:order-none">
          {(s.step <= 4) && <ChatSteps key={s.step} s={s} set={stableSet} t={t} />}
          {s.step === 5 && <Board s={s} set={stableSet} t={t} />}
          {s.step === 6 && <PageEditor s={s} set={stableSet} t={t} />}
          {s.step === 7 && <Meeting s={s} set={stableSet} t={t} />}
          {s.step === 8 && <SearchStep s={s} set={stableSet} t={t} />}
          {s.step === 9 && (
            <ul className="grid gap-3 sm:grid-cols-2">
              {MORE.map(({ icon: Icon, k }) => (
                <li key={k} className="flex gap-3 rounded-xl border border-ink/10 bg-surface p-4">
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-brand/10 text-brand"><Icon className="size-[18px]" /></span>
                  <span><span className="block text-sm font-semibold">{t(`tour.s9.${k}` as Key)}</span><span className="block text-xs text-ink/60">{t(`tour.s9.${k}.d` as Key)}</span></span>
                </li>
              ))}
            </ul>
          )}
          {s.step === 10 && <Finish s={s} workspaceId={workspaceId} workspaceName={workspaceName} onClose={finish} t={t} />}
        </main>

        <aside className="rounded-xl border border-brand/30 bg-white p-5 md:col-span-2 lg:col-span-1 lg:col-start-3 lg:row-start-1 lg:self-start">
          <span className="flex size-9 items-center justify-center rounded-lg bg-brand/10 text-brand">{s.step === 9 ? <BookOpen className="size-[18px]" /> : s.step === 10 ? <Bell className="size-[18px]" /> : <Check className="size-[18px]" />}</span>
          <h2 className="mt-3 text-xl font-semibold tracking-tight">{t(`tour.s${s.step}.title` as Key)}</h2>
          {s.step !== 10 && <p className="mt-2 text-sm text-ink/70">{t(`tour.s${s.step}.body` as Key)}</p>}
          {s.step < TOUR_STEPS && (
            <div className="mt-5 flex flex-wrap items-center gap-2">
              {s.step > 1 && <button type="button" onClick={() => goto(s.step - 1)} className={ghost}>{t("tour.back")}</button>}
              <button type="button" onClick={() => goto(s.step + 1)} className={done ? primary : ghost}>{t("tour.next")}</button>
            </div>
          )}
          {s.step === TOUR_STEPS && <button type="button" onClick={() => goto(s.step - 1)} className={`${ghost} mt-5`}>{t("tour.back")}</button>}
        </aside>
      </div>
    </div>
  )
}
