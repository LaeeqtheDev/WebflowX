"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { useMutation, useQuery } from "convex/react"
import { toast } from "sonner"
import { ArrowLeft, Check, CheckSquare, Copy, FileText, Hash, MessageSquare, Search, Video, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { AuthShell } from "@/features/auth/components/auth-screen"
import { useAuthActions } from "@convex-dev/auth/react"
import { useCreateWorkspace } from "@/features/workspaces/api/use-create-workspace"
import { useLimitHandler } from "@/hooks/use-limit-handler"
import { errorMessage } from "@/lib/error-message"
import { parseLimitError } from "@/lib/plans"
import { api } from "../../../convex/_generated/api"
import { Id } from "../../../convex/_generated/dataModel"

const TOTAL = 5

type UseCase = "chat" | "projects" | "docs" | "meetings"

const USE_CASES: { key: UseCase; label: string; hint: string; icon: React.ElementType }[] = [
    { key: "chat", label: "Team chat", hint: "Channels, DMs and threads", icon: MessageSquare },
    { key: "projects", label: "Projects & tasks", hint: "Boards, sprints, assignments", icon: CheckSquare },
    { key: "docs", label: "Docs & notes", hint: "Shared documents and notes", icon: FileText },
    { key: "meetings", label: "Meetings", hint: "Calls with AI summaries", icon: Video },
]

const SUGGESTED: Record<UseCase, string[]> = {
    chat: ["announcements", "random"],
    projects: ["engineering", "product-roadmap"],
    docs: ["resources"],
    meetings: ["standup"],
}

const primary =
    "h-12 w-full cursor-pointer rounded-xl bg-[#ff5018] text-[15px] font-semibold text-white shadow-[0_10px_30px_-12px_rgba(255,80,24,0.8)] hover:bg-[#e6430f]"

const STEP_COPY: Record<number, { title: string; body: string }> = {
    1: { title: "Let's set up your team's home.", body: "Five quick steps and your workspace is ready for people." },
    2: { title: "Give your workspace a name.", body: "Most teams use their company or team name. You can change it later." },
    3: { title: "Start with the right channels.", body: "Channels keep conversations organised. We'll add a few to get you going." },
    4: { title: "Bring your team in.", body: "Share the invite link. People sign up and land straight in your workspace." },
    5: { title: "You're all set.", body: "Your workspace is live. Here's where to find the good stuff." },
}

const Progress = ({ step }: { step: number }) => (
    <div className="mb-8">
        <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-ink/50">
            <span>Step {step} of {TOTAL}</span>
            <span>{Math.round(((step - 1) / (TOTAL - 1)) * 100)}% done</span>
        </div>
        <div className="mt-2 flex gap-1.5" role="progressbar" aria-valuemin={1} aria-valuemax={TOTAL} aria-valuenow={step}>
            {Array.from({ length: TOTAL }).map((_, i) => (
                <span key={i} className={`h-1.5 flex-1 rounded-full transition-colors ${i < step ? "bg-[#ff5018]" : "bg-ink/10"}`} />
            ))}
        </div>
    </div>
)

const Heading = ({ title, text }: { title: string; text: string }) => (
    <>
        <h1 className="text-[2rem] font-semibold leading-tight tracking-[-0.03em] text-ink">{title}</h1>
        <p className="mt-2 text-[15px] text-ink/65">{text}</p>
    </>
)

// Guided setup for someone who has no workspace yet. The step lives in the URL
// (/dashboard?setup=<workspaceId>&step=3) so a refresh never loses your place.
export const OnboardingWizard = ({ firstName }: { firstName?: string }) => {
    const router = useRouter()
    const params = useSearchParams()
    const rawSetup = params.get("setup")
    // Convex ids are 32 lowercase letters/digits; anything else is ignored rather than crashing the query.
    const setupId = rawSetup && /^[a-z0-9]{20,40}$/.test(rawSetup) ? (rawSetup as Id<"workspaces">) : null
    const urlStep = Math.min(TOTAL, Math.max(1, parseInt(params.get("step") ?? "1", 10) || 1))
    const step = setupId ? Math.max(urlStep, 3) : Math.min(urlStep, 2)

    const [uses, setUses] = useState<UseCase[]>(["chat"])
    const [name, setName] = useState("")
    const [chosen, setChosen] = useState<string[] | null>(null)
    const [busy, setBusy] = useState(false)
    const [copied, setCopied] = useState(false)
    const { mutate, isPending } = useCreateWorkspace()
    const { handleLimitError } = useLimitHandler()
    const createChannel = useMutation(api.channels.create)
    const { signOut } = useAuthActions()
    const submitted = useRef(false)

    const workspace = useQuery(api.workspaces.getById, setupId ? { id: setupId } : "skip")

    const suggestions = useMemo(() => {
        const set = new Set<string>()
        for (const u of uses) SUGGESTED[u].forEach((c) => set.add(c))
        return Array.from(set).slice(0, 4)
    }, [uses])
    const picked = chosen ?? suggestions

    // A stale or foreign setup link: leave the wizard instead of waiting on a workspace that will never load.
    const invalid = !!setupId && (workspace === null || (workspace !== undefined && workspace !== null && !workspace.joinCode))
    useEffect(() => {
        if (!invalid) return
        router.replace(workspace && setupId ? `/dashboard/workspace/${setupId}` : "/dashboard")
    }, [invalid, workspace, setupId, router])

    const go = (n: number, id?: string | null) => {
        const q = new URLSearchParams()
        const target = id ?? setupId
        if (target) q.set("setup", target)
        q.set("step", String(n))
        router.push(`/dashboard?${q.toString()}`)
    }

    const toggleUse = (k: UseCase) => {
        setChosen(null)
        setUses((cur) => (cur.includes(k) ? cur.filter((x) => x !== k) : [...cur, k]))
    }

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

    const copy = STEP_COPY[step]

    return (
        <AuthShell title={copy.title} body={copy.body}>
            <div className="mb-6 flex justify-end">
                <button type="button" onClick={() => { void signOut() }} className="cursor-pointer text-sm text-ink/55 hover:text-ink">Sign out</button>
            </div>
            <Progress step={step} />

            {step === 1 && (
                <>
                    <Heading title={`Welcome${firstName ? `, ${firstName}` : ""}!`} text="What will your team use WebflowX for? Pick any that apply." />
                    <div className="mt-6 grid gap-3 sm:grid-cols-2">
                        {USE_CASES.map(({ key, label, hint, icon: Icon }) => {
                            const on = uses.includes(key)
                            return (
                                <button
                                    key={key}
                                    type="button"
                                    onClick={() => toggleUse(key)}
                                    aria-pressed={on}
                                    className={`cursor-pointer rounded-xl border p-4 text-left transition-colors ${on ? "border-[#ff5018] bg-[#ff5018]/10" : "border-ink/15 bg-surface hover:border-ink/30"}`}
                                >
                                    <Icon className={`size-5 ${on ? "text-[#ff5018]" : "text-ink/55"}`} />
                                    <p className="mt-3 text-sm font-semibold text-ink">{label}</p>
                                    <p className="mt-0.5 text-xs text-ink/60">{hint}</p>
                                </button>
                            )
                        })}
                    </div>
                    <Button className={`${primary} mt-8`} size="lg" onClick={() => go(2)}>Continue</Button>
                </>
            )}

            {step === 2 && (
                <form onSubmit={createWorkspace}>
                    <Heading title="Name your workspace" text="You'll be the owner. People you invite join as members." />
                    <label htmlFor="ws-name" className="mt-6 block text-sm font-medium text-ink">Workspace name</label>
                    <Input
                        id="ws-name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        disabled={isPending}
                        autoFocus
                        maxLength={60}
                        placeholder="e.g. Acme Design, North Foundry"
                        className="mt-2 h-12 rounded-xl bg-surface"
                    />
                    <Button type="submit" className={`${primary} mt-6`} size="lg" disabled={isPending || name.trim().length < 3}>
                        {isPending ? "Creating…" : "Create workspace"}
                    </Button>
                    <button type="button" onClick={() => go(1)} className="mt-6 inline-flex cursor-pointer items-center gap-1.5 text-sm text-ink/55 hover:text-ink">
                        <ArrowLeft size={16} /> Back
                    </button>
                </form>
            )}

            {step === 3 && (
                <>
                    <Heading title="Pick starter channels" text="#general is already there. Add any of these now, or create your own later." />
                    <div className="mt-6 flex flex-wrap gap-2">
                        {Array.from(new Set([...suggestions, "announcements", "random", "engineering", "design", "support"])).map((c) => {
                            const on = picked.includes(c)
                            return (
                                <button
                                    key={c}
                                    type="button"
                                    aria-pressed={on}
                                    onClick={() => setChosen(on ? picked.filter((x) => x !== c) : [...picked, c].slice(0, 4))}
                                    className={`inline-flex cursor-pointer items-center gap-1 rounded-full border px-3.5 py-2 text-sm transition-colors ${on ? "border-[#ff5018] bg-[#ff5018]/10 text-ink" : "border-ink/15 bg-surface text-ink/70 hover:border-ink/30"}`}
                                >
                                    <Hash className="size-3.5" />{c}{on && <Check className="size-3.5 text-[#ff5018]" />}
                                </button>
                            )
                        })}
                    </div>
                    <p className="mt-3 text-xs text-ink/55">Pick up to 4. You can add more any time.</p>
                    <Button className={`${primary} mt-8`} size="lg" disabled={busy} onClick={addChannels}>
                        {busy ? "Adding…" : picked.length ? `Add ${picked.length} channel${picked.length === 1 ? "" : "s"} and continue` : "Continue"}
                    </Button>
                </>
            )}

            {step === 4 && (
                <>
                    <Heading title="Invite your teammates" text="Anyone who opens this link can create an account and join. You can do this later from the workspace menu." />
                    <div className="mt-6 flex items-center gap-2 rounded-xl border border-ink/15 bg-surface p-2 pl-4">
                        <span className="min-w-0 flex-1 truncate text-sm text-ink/80">{link || "Preparing your link…"}</span>
                        <Button type="button" onClick={copyLink} disabled={!link} className="h-10 shrink-0 rounded-lg bg-[#ff5018] text-white hover:bg-[#e6430f]">
                            {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
                            <span className="ml-2">{copied ? "Copied" : "Copy"}</span>
                        </Button>
                    </div>
                    <p className="mt-3 text-xs text-ink/55">
                        The link includes your 6-character code{workspace?.joinCode ? <> (<strong className="text-ink/75">{workspace.joinCode}</strong>)</> : null}. You can switch to code-free links in the Invite dialog.
                    </p>
                    <Button className={`${primary} mt-8`} size="lg" onClick={() => go(5)}>Continue</Button>
                    <button type="button" onClick={() => go(5)} className="mt-4 cursor-pointer text-sm text-ink/55 hover:text-ink">Skip for now</button>
                </>
            )}

            {step === 5 && (
                <>
                    <Heading title="Your workspace is ready" text={workspace ? `${workspace.name} is live.` : "Everything is in place."} />
                    <ul className="mt-6 space-y-3">
                        {[
                            { icon: MessageSquare, t: "Chat in channels", d: "Reply in threads, mention people with @, react with emoji." },
                            { icon: CheckSquare, t: "Track tasks", d: "Turn any message into a task from its menu." },
                            { icon: FileText, t: "Write docs and notes", d: "Shared documents with live editing." },
                            { icon: Video, t: "Meet and summarise", d: "Start a call and get an AI summary afterwards." },
                            { icon: Search, t: "Jump anywhere", d: "Press Ctrl or ⌘ + K to search channels and people." },
                        ].map(({ icon: Icon, t, d }) => (
                            <li key={t} className="flex gap-3 rounded-xl border border-ink/10 bg-surface p-3.5">
                                <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-[#ff5018]/10 text-[#ff5018]"><Icon className="size-[18px]" /></span>
                                <span><span className="block text-sm font-semibold text-ink">{t}</span><span className="block text-xs text-ink/60">{d}</span></span>
                            </li>
                        ))}
                    </ul>
                    <Button className={`${primary} mt-8`} size="lg" onClick={() => { try { window.sessionStorage.removeItem("wfx-setup"); window.localStorage.setItem(`wfx:get-started-dismissed:${setupId}`, "1") } catch { /* ignore */ } router.replace(`/dashboard/workspace/${setupId}`) }}>
                        <Sparkles className="mr-2 size-4" /> Open my workspace
                    </Button>
                </>
            )}
        </AuthShell>
    )
}
