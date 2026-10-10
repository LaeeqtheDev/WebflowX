"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { useMutation, useQuery } from "convex/react"
import { toast } from "sonner"
import { ArrowLeft, Check, CheckSquare, Copy, FileText, Hash, MessageSquare, Video, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { AuthShell } from "@/features/auth/components/auth-screen"
import { signOutAndLeave } from "@/lib/sign-out"
import { useAuthActions } from "@convex-dev/auth/react"
import { useCreateWorkspace } from "@/features/workspaces/api/use-create-workspace"
import { useLimitHandler } from "@/hooks/use-limit-handler"
import { errorMessage } from "@/lib/error-message"
import { parseLimitError } from "@/lib/plans"
import { LanguagePicker, useT } from "@/lib/i18n"
import type { Key } from "@/lib/i18n/en"
import { TEMPLATES, getTemplate } from "@/lib/templates"
import { OnboardingTour } from "./tour/tour"
import { freshTour, loadTour, type TourState } from "./tour/state"
import { api } from "../../../convex/_generated/api"
import { Id } from "../../../convex/_generated/dataModel"

const TOTAL = 5

type UseCase = "chat" | "projects" | "docs" | "meetings"

const USE_CASES: { key: UseCase; icon: React.ElementType }[] = [
    { key: "chat", icon: MessageSquare },
    { key: "projects", icon: CheckSquare },
    { key: "docs", icon: FileText },
    { key: "meetings", icon: Video },
]

const SUGGESTED: Record<UseCase, string[]> = {
    chat: ["announcements", "random"],
    projects: ["engineering", "product-roadmap"],
    docs: ["resources"],
    meetings: ["standup"],
}

const primary =
    "h-12 w-full cursor-pointer rounded-xl bg-brand text-[15px] font-semibold text-white shadow-[0_10px_30px_-12px_color-mix(in_srgb,var(--wfx-accent)_80%,transparent)] hover:bg-brand-hover"

const Progress = ({ step }: { step: number }) => {
    const t = useT()
    return (
    <div className="mb-8">
        <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-ink/60">
            <span>{t("wiz.step", { n: step, total: TOTAL })}</span>
            <span>{t("wiz.pct", { p: Math.round(((step - 1) / (TOTAL - 1)) * 100) })}</span>
        </div>
        <div className="mt-2 flex gap-1.5" role="progressbar" aria-valuemin={1} aria-valuemax={TOTAL} aria-valuenow={step}>
            {Array.from({ length: TOTAL }).map((_, i) => (
                <span key={i} className={`h-1.5 flex-1 rounded-full transition-colors ${i < step ? "bg-brand" : "bg-ink/10"}`} />
            ))}
        </div>
    </div>
    )
}

const Heading = ({ title, text }: { title: string; text: string }) => (
    <>
        <h1 className="text-[2rem] font-semibold leading-tight tracking-[-0.03em] text-ink">{title}</h1>
        <p className="mt-2 text-[15px] text-ink/65">{text}</p>
    </>
)

// Guided setup for someone who has no workspace yet. The step lives in the URL
// (/dashboard?setup=<workspaceId>&step=3) so a refresh never loses your place.
export const OnboardingWizard = ({ firstName }: { firstName?: string }) => {
    const t = useT()
    const router = useRouter()
    const params = useSearchParams()
    const rawSetup = params.get("setup")
    // Convex ids are 32 lowercase letters/digits; anything else is ignored rather than crashing the query.
    const setupId = rawSetup && /^[a-z0-9]{20,40}$/.test(rawSetup) ? (rawSetup as Id<"workspaces">) : null
    const urlStep = Math.min(TOTAL, Math.max(1, parseInt(params.get("step") ?? "1", 10) || 1))
    const step = setupId ? Math.max(urlStep, 3) : Math.min(urlStep, 2)

    const [uses, setUses] = useState<UseCase[]>(["chat"])
    // chosen in step 1 (or arrives from the /templates page); kept in the URL so a refresh keeps it
    const [tplKey, setTplKey] = useState<string | null>(() => getTemplate(params.get("template") ?? params.get("tpl"))?.key ?? null)
    const template = getTemplate(tplKey)
    const [name, setName] = useState("")
    const [chosen, setChosen] = useState<string[] | null>(null)
    const [busy, setBusy] = useState(false)
    const [copied, setCopied] = useState(false)
    const [touring, setTouring] = useState<TourState | null>(null)
    const [saved, setSaved] = useState<TourState | null>(null)
    const { mutate, isPending } = useCreateWorkspace()
    const { handleLimitError } = useLimitHandler()
    const createChannel = useMutation(api.channels.create)
    const createTask = useMutation(api.tasks.create)
    const createNote = useMutation(api.notes.create)
    const { signOut } = useAuthActions()
    const submitted = useRef(false)

    const workspace = useQuery(api.workspaces.getById, setupId ? { id: setupId } : "skip")

    const suggestions = useMemo(() => {
        if (template) return template.channels
        const set = new Set<string>()
        for (const u of uses) SUGGESTED[u].forEach((c) => set.add(c))
        return Array.from(set).slice(0, 4)
    }, [uses, template])
    const picked = chosen ?? suggestions

    // A stale or foreign setup link: leave the wizard instead of waiting on a workspace that will never load.
    const invalid = !!setupId && (workspace === null || (workspace !== undefined && workspace !== null && !workspace.joinCode))
    useEffect(() => {
        if (!invalid) return
        router.replace(workspace && setupId ? `/dashboard/workspace/${setupId}` : "/dashboard")
    }, [invalid, workspace, setupId, router])

    // Progress from an earlier visit to the tour (it is kept in this browser).
    useEffect(() => {
        if (step === 5 && setupId) setSaved(loadTour(setupId))
    }, [step, setupId])

    const go = (n: number, id?: string | null) => {
        const q = new URLSearchParams()
        const target = id ?? setupId
        if (target) q.set("setup", target)
        if (tplKey) q.set("tpl", tplKey)
        q.set("step", String(n))
        router.push(`/dashboard?${q.toString()}`)
    }

    const toggleUse = (k: UseCase) => {
        setChosen(null)
        setUses((cur) => (cur.includes(k) ? cur.filter((x) => x !== k) : [...cur, k]))
    }
    const pickTemplate = (key: string | null) => { setChosen(null); setTplKey(key) }

    const createWorkspace = (e: React.FormEvent) => {
        e.preventDefault()
        const clean = name.trim()
        if (clean.length < 3) {
            toast.error("Use at least 3 characters for the name")
            return
        }
        if (submitted.current) return
        submitted.current = true
        // tells the dashboard not to bounce us into the new workspace before step 3 shows
        try { window.sessionStorage.setItem("wfx-setup", String(Date.now())) } catch { /* private mode */ }
        mutate({ name: clean }, {
            onSuccess(id) { go(3, id) },
            onError(error) {
                submitted.current = false
                handleLimitError(error, "Couldn't create the workspace. Please try again.")
            },
        })
    }

    const addChannels = async () => {
        if (!setupId) return
        setBusy(true)
        try {
            let failed = false
            for (const c of picked) {
                try {
                    await createChannel({ name: c, workspaceId: setupId })
                } catch (err) {
                    const msg = errorMessage(err)
                    if (/already exists/i.test(msg)) continue
                    failed = true
                    if (parseLimitError(msg)) break // plan limit: stop trying, the rest can wait
                }
            }
            // a chosen template also brings its starter tasks and note
            if (template) {
                for (const task of template.tasks) {
                    try { await createTask({ workspaceId: setupId, title: task.title, status: task.status, priority: task.priority }) } catch { failed = true; break }
                }
                try { await createNote({ workspaceId: setupId, title: template.note.title, body: template.note.body, type: "workspace" }) } catch { failed = true }
            }
            if (failed) toast.error("Some channels couldn't be added. You can create them later from the sidebar.")
            go(4)
        } finally {
            setBusy(false)
        }
    }

    const link = workspace && typeof window !== "undefined" ? `${window.location.origin}/join/${setupId}?code=${workspace.joinCode}` : ""
    const copyLink = () => {
        if (!link) return
        navigator.clipboard.writeText(link)
            .then(() => { setCopied(true); toast.success("Invite link copied"); setTimeout(() => setCopied(false), 2000) })
            .catch(() => toast.error("Couldn't copy. Select the link and copy it manually."))
    }

    const openWorkspace = () => {
        try { window.sessionStorage.removeItem("wfx-setup"); window.localStorage.setItem(`wfx:get-started-dismissed:${setupId}`, "1") } catch { /* ignore */ }
        router.replace(`/dashboard/workspace/${setupId}`)
    }

    const stepKey = (n: number, part: "title" | "body") => `wiz.s${n}.${part}` as Key
    const resumable = saved && !saved.finished

    return (
        <AuthShell title={t(stepKey(step, "title"))} body={t(stepKey(step, "body"))}>
            <div className="mb-6 flex items-center justify-between">
                <LanguagePicker />
                <button type="button" onClick={() => { void signOutAndLeave(signOut) }} className="cursor-pointer text-sm text-ink/60 hover:text-ink">{t("wiz.signout")}</button>
            </div>
            <Progress step={step} />

            {step === 1 && (
                <>
                    <Heading title={firstName ? t("wiz.welcomeName", { name: firstName }) : t("wiz.welcome")} text={t("wiz.use.q")} />
                    <div className="mt-6 grid gap-3 sm:grid-cols-2">
                        {USE_CASES.map(({ key, icon: Icon }) => {
                            const on = uses.includes(key)
                            return (
                                <button
                                    key={key}
                                    type="button"
                                    onClick={() => toggleUse(key)}
                                    aria-pressed={on}
                                    className={`cursor-pointer rounded-xl border p-4 text-left transition-colors ${on ? "border-brand bg-brand/10" : "border-ink/15 bg-surface hover:border-ink/30"}`}
                                >
                                    <Icon className={`size-5 ${on ? "text-brand" : "text-ink/60"}`} />
                                    <p className="mt-3 text-sm font-semibold text-ink">{t(`wiz.use.${key}` as Key)}</p>
                                    <p className="mt-0.5 text-xs text-ink/60">{t(`wiz.use.${key}.hint` as Key)}</p>
                                </button>
                            )
                        })}
                    </div>
                    <p className="mt-6 text-sm font-medium text-ink">{t("wiz.tpl.h")}</p>
                    <div className="mt-2 flex flex-wrap gap-2">
                        {[{ key: null as string | null, label: t("wiz.tpl.none") }, ...TEMPLATES.map((x) => ({ key: x.key as string | null, label: t(`tpl.${x.key}` as Key) }))].map((o) => {
                            const on = tplKey === o.key
                            return (
                                <button key={o.key ?? "none"} type="button" aria-pressed={on} onClick={() => pickTemplate(o.key)}
                                    className={`cursor-pointer rounded-full border px-3.5 py-2 text-sm transition-colors ${on ? "border-brand bg-brand/10 text-ink" : "border-ink/15 bg-surface text-ink/70 hover:border-ink/30"}`}>
                                    {o.label}
                                </button>
                            )
                        })}
                    </div>
                    {template && <p className="mt-2 text-xs text-ink/60">{t("wiz.tpl.hint")} {template.channels.map((c) => `#${c}`).join(" ")}</p>}
                    <Button className={`${primary} mt-8`} size="lg" onClick={() => go(2)}>{t("wiz.continue")}</Button>
                </>
            )}

            {step === 2 && (
                <form onSubmit={createWorkspace}>
                    <Heading title={t("wiz.s2.h")} text={t("wiz.s2.t")} />
                    <label htmlFor="ws-name" className="mt-6 block text-sm font-medium text-ink">{t("wiz.s2.label")}</label>
                    <Input
                        id="ws-name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        disabled={isPending}
                        autoFocus
                        maxLength={60}
                        placeholder={t("wiz.s2.ph")}
                        className="mt-2 h-12 rounded-xl bg-surface"
                    />
                    <Button type="submit" className={`${primary} mt-6`} size="lg" disabled={isPending || name.trim().length < 3}>
                        {isPending ? t("wiz.creating") : t("wiz.create")}
                    </Button>
                    <button type="button" onClick={() => go(1)} className="mt-6 inline-flex cursor-pointer items-center gap-1.5 text-sm text-ink/60 hover:text-ink">
                        <ArrowLeft size={16} /> {t("wiz.back")}
                    </button>
                </form>
            )}

            {step === 3 && (
                <>
                    <Heading title={t("wiz.s3.h")} text={t("wiz.s3.t")} />
                    <div className="mt-6 flex flex-wrap gap-2">
                        {Array.from(new Set([...suggestions, "announcements", "random", "engineering", "design", "support"])).map((c) => {
                            const on = picked.includes(c)
                            return (
                                <button
                                    key={c}
                                    type="button"
                                    aria-pressed={on}
                                    onClick={() => setChosen(on ? picked.filter((x) => x !== c) : [...picked, c].slice(0, 4))}
                                    className={`inline-flex cursor-pointer items-center gap-1 rounded-full border px-3.5 py-2 text-sm transition-colors ${on ? "border-brand bg-brand/10 text-ink" : "border-ink/15 bg-surface text-ink/70 hover:border-ink/30"}`}
                                >
                                    <Hash className="size-3.5" />{c}{on && <Check className="size-3.5 text-brand" />}
                                </button>
                            )
                        })}
                    </div>
                    <p className="mt-3 text-xs text-ink/60">{t("wiz.s3.hint")}</p>
                    {template && <p className="mt-1 text-xs text-ink/60">{t(`tpl.${template.key}` as Key)}: {t("wiz.tpl.hint")}</p>}
                    <Button className={`${primary} mt-8`} size="lg" disabled={busy} onClick={addChannels}>
                        {busy ? t("wiz.s3.adding") : picked.length ? t("wiz.s3.add", { n: picked.length }) : t("wiz.continue")}
                    </Button>
                </>
            )}

            {step === 4 && (
                <>
                    <Heading title={t("wiz.s4.h")} text={t("wiz.s4.t")} />
                    <div className="mt-6 flex items-center gap-2 rounded-xl border border-ink/15 bg-surface p-2 pl-4">
                        <span className="min-w-0 flex-1 truncate text-sm text-ink/80">{link || t("wiz.preparing")}</span>
                        <Button type="button" onClick={copyLink} disabled={!link} className="h-10 shrink-0 rounded-lg bg-brand text-white hover:bg-brand-hover">
                            {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
                            <span className="ml-2">{copied ? t("wiz.copied") : t("wiz.copy")}</span>
                        </Button>
                    </div>
                    <Button className={`${primary} mt-8`} size="lg" onClick={() => go(5)}>{t("wiz.continue")}</Button>
                    <button type="button" onClick={() => go(5)} className="mt-4 cursor-pointer text-sm text-ink/60 hover:text-ink">{t("wiz.skipNow")}</button>
                </>
            )}

            {step === 5 && (
                <>
                    <Heading title={t("wiz.s5.h")} text={workspace ? t("wiz.s5.live", { name: workspace.name }) : t("wiz.s5.ready")} />
                    <p className="mt-5 rounded-xl border border-ink/10 bg-surface p-4 text-sm text-ink/70">{t("wiz.s5.offer")}</p>
                    <Button className={`${primary} mt-6`} size="lg" disabled={!setupId || !workspace} onClick={() => setTouring(resumable ? saved : freshTour())}>
                        <Sparkles className="mr-2 size-4" /> {resumable ? `${t("wiz.s5.resume")} (${t("tour.step", { n: saved!.step, total: 10 })})` : t("wiz.s5.tour")}
                    </Button>
                    <button type="button" onClick={openWorkspace} className="mt-4 cursor-pointer text-sm text-ink/60 hover:text-ink">{t("wiz.s5.skip")}</button>
                </>
            )}

            {touring && setupId && workspace && (
                <OnboardingTour
                    workspaceId={setupId}
                    workspaceName={workspace.name}
                    channels={picked}
                    initial={touring}
                    onSkip={() => { setTouring(null); if (setupId) setSaved(loadTour(setupId)) }}
                    onFinish={() => { setTouring(null); openWorkspace() }}
                />
            )}
        </AuthShell>
    )
}
