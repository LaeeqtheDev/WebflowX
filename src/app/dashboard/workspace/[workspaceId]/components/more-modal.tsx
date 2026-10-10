"use client"

import { useState } from "react"
import type { ComponentType } from "react"
import { useWorkspaceId } from "@/hooks/use-workspace-id"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import { Loader } from "lucide-react"
import {
    People20Regular,
    NumberSymbol20Regular,
    DocumentText20Regular,
    Video20Regular,
    Notebook20Regular,
    Book20Regular,
    Flash20Regular,
    Rocket20Regular,
    Crown20Regular,
    Building20Regular,
    Checkmark16Filled,
    ArrowRight16Regular,
    ShieldCheckmark20Regular,
} from "@fluentui/react-icons"
import { useAction, useQuery } from "convex/react"
import { api } from "../../../../../../convex/_generated/api"
import { friendlyError } from "@/hooks/use-limit-handler"
import { Id } from "../../../../../../convex/_generated/dataModel"
import { useGetUsage } from "@/features/workspaces/api/use-get-usage"

interface MoreModalProps {
    open: boolean
    onClose: () => void
    /** Defaults to the workspace in the URL. */
    workspaceId?: Id<"workspaces">
    initialTab?: "usage" | "plans"
}

type IconLike = ComponentType<{ className?: string }>
type PlanKey = "free" | "startup" | "growth" | "enterprise"

const PLANS: {
    key: PlanKey
    label: string
    price: number
    tagline: string
    icon: IconLike
    popular?: boolean
    features: string[]
}[] = [
    {
        key: "free",
        label: "Free",
        price: 0,
        tagline: "For trying WebflowX with a small crew.",
        icon: Flash20Regular,
        features: ["1 workspace", "10 members", "5 channels", "20 pages", "500 database rows", "5 meetings / month", "2 AI summaries", "10 personal notes", "20 workspace notes", "90 days of history"],
    },
    {
        key: "startup",
        label: "Startup",
        price: 29,
        tagline: "For small teams that ship every week.",
        icon: Rocket20Regular,
        features: ["3 workspaces", "25 members", "20 channels", "100 pages", "5,000 database rows", "20 meetings / month", "10 AI summaries", "50 personal notes", "100 workspace notes", "5 guests", "API + 5 incoming webhooks"],
    },
    {
        key: "growth",
        label: "Growth",
        price: 79,
        tagline: "For growing teams that run on process.",
        icon: Crown20Regular,
        popular: true,
        features: ["10 workspaces", "100 members", "50 channels", "500 pages", "50,000 database rows", "50 meetings / month", "30 AI summaries", "Unlimited personal notes", "Unlimited workspace notes", "25 guests", "Outgoing webhooks + GitHub"],
    },
    {
        key: "enterprise",
        label: "Enterprise",
        price: 249,
        tagline: "For organisations with no ceiling.",
        icon: Building20Regular,
        features: ["Unlimited workspaces", "Unlimited members", "Unlimited channels", "Unlimited pages and database rows", "200 meetings / month", "150 AI summaries / month", "Unlimited notes", "Unlimited guests + integrations", "Email support"],
    },
]

const UsageCard = ({ label, icon: Icon, current, limit }: {
    label: string
    icon: IconLike
    current: number
    limit: number
}) => {
    const unlimited = limit === -1
    const pct = unlimited ? 0 : Math.min((current / limit) * 100, 100)
    const atLimit = !unlimited && pct >= 100
    const near = !unlimited && pct >= 80

    return (
        <div className="rounded-2xl border border-plum/10 bg-surface p-4 shadow-[0_1px_0_rgba(56,29,42,0.04)]">
            <div className="flex items-center justify-between">
                <span className="flex size-9 items-center justify-center rounded-xl bg-brand/10 text-brand">
                    <Icon className="size-5" />
                </span>
                <span className={cn(
                    "rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
                    atLimit ? "bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400" : near ? "bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-300" : "bg-plum/5 text-plum/60"
                )}>
                    {unlimited ? "Unlimited" : atLimit ? "Limit reached" : near ? "Near limit" : "On track"}
                </span>
            </div>
            <p className="mt-4 text-xs font-medium text-plum/60">{label}</p>
            <p className="mt-0.5 flex items-baseline gap-1 text-2xl font-semibold tracking-tight text-ink">
                {current}
                <span className="text-sm font-medium text-plum/40 dark:text-plum/60">/ {unlimited ? "∞" : limit}</span>
            </p>
            <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-plum/8">
                <div
                    className={cn("h-full rounded-full transition-all", atLimit ? "bg-red-500" : near ? "bg-amber-500" : "bg-brand")}
                    style={{ width: unlimited ? "8%" : `${Math.max(pct, current > 0 ? 6 : 0)}%` }}
                />
            </div>
        </div>
    )
}

export const MoreModal = ({ open, onClose, workspaceId: workspaceIdProp, initialTab = "usage" }: MoreModalProps) => {
    const urlWorkspaceId = useWorkspaceId()
    const workspaceId = workspaceIdProp ?? urlWorkspaceId
    const { data: usage, isLoading } = useGetUsage({ workspaceId })
    const billing = useQuery(api.billing.get, { workspaceId })
    const startCheckout = useAction(api.stripe.createCheckout)
    const openPortal = useAction(api.stripe.createPortal)
    const [interval, setInterval] = useState<"month" | "year">("month")
    const [busy, setBusy] = useState<string | null>(null)
    const [activeTab, setActiveTab] = useState<"usage" | "plans">(initialTab)

    const currentPlan = (usage?.plan ?? "free") as PlanKey
    const current = PLANS.find((p) => p.key === currentPlan) ?? PLANS[0]
    const CurrentIcon = current.icon

    const hasSub = !!billing && ["active", "trialing", "past_due"].includes(billing.status ?? "")
    const canManage = !!billing?.isOwner && billing.configured
    const go = async (key: string, run: () => Promise<{ url: string }>) => {
        setBusy(key)
        try {
            const { url } = await run()
            window.location.assign(url)
        } catch (e) {
            toast.error(friendlyError(e, "Couldn't open billing. Please try again."))
            setBusy(null)
        }
    }
    const handleUpgrade = (plan: "startup" | "growth" | "enterprise") => go(plan, () => startCheckout({ workspaceId, plan, interval }))
    const handlePortal = () => go("portal", () => openPortal({ workspaceId }))
    const dateOf = (ms: number | null | undefined) => (ms ? new Date(ms).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" }) : "")

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="[&>button]:text-white [&>button]:opacity-80 [&>button]:hover:opacity-100 [&>button]:top-5 [&>button]:right-5 flex h-[min(760px,90vh)] w-[min(1040px,calc(100vw-2rem))] max-w-none flex-col gap-0 overflow-hidden rounded-3xl border-plum/10 bg-cream-soft p-0 sm:max-w-none">
                <DialogHeader className="shrink-0 bg-avatar px-7 pb-0 pt-6 text-white">
                    <DialogTitle className="flex items-center gap-4">
                        <span className="flex size-11 items-center justify-center rounded-2xl bg-brand text-white">
                            <CurrentIcon className="size-6" />
                        </span>
                        <span className="flex flex-col">
                            <span className="text-lg font-semibold leading-none tracking-tight">Workspace overview</span>
                            <span className="mt-1.5 text-xs font-normal text-white/65">
                                {current.label} plan · {current.price === 0 ? "Free forever" : `$${current.price}/month`}
                            </span>
                        </span>
                    </DialogTitle>
                    <div className="mt-5 flex gap-1">
                        {(["usage", "plans"] as const).map((tab) => (
                            <button
                                key={tab}
                                onClick={() => setActiveTab(tab)}
                                className={cn(
                                    "rounded-t-xl px-5 py-2.5 text-sm font-medium transition-colors",
                                    activeTab === tab
                                        ? "bg-cream-soft text-ink"
                                        : "text-white/65 hover:text-white"
                                )}
                            >
                                {tab === "plans" ? "Plans & billing" : "Usage"}
                            </button>
                        ))}
                    </div>
                </DialogHeader>

                <div className="flex-1 overflow-y-auto p-7">
                    {isLoading ? (
                        <div className="flex h-56 items-center justify-center">
                            <Loader className="size-6 animate-spin text-brand" />
                        </div>
                    ) : activeTab === "usage" ? (
                        <div className="flex flex-col gap-6">
                            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                                <UsageCard label="Members" icon={People20Regular} current={usage?.usage.members.current ?? 0} limit={usage?.usage.members.limit ?? 0} />
                                <UsageCard label="Channels" icon={NumberSymbol20Regular} current={usage?.usage.channels.current ?? 0} limit={usage?.usage.channels.limit ?? 0} />
                                <UsageCard label="Pages" icon={DocumentText20Regular} current={usage?.usage.docs.current ?? 0} limit={usage?.usage.docs.limit ?? 0} />
                                <UsageCard label="Database rows" icon={DocumentText20Regular} current={usage?.usage.dbRows.current ?? 0} limit={usage?.usage.dbRows.limit ?? 0} />
                                <UsageCard label="Meetings this month" icon={Video20Regular} current={usage?.usage.meetings.current ?? 0} limit={usage?.usage.meetings.limit ?? 0} />
                                <UsageCard label="AI summaries this month" icon={Video20Regular} current={usage?.usage.aiSummaries.current ?? 0} limit={usage?.usage.aiSummaries.limit ?? 0} />
                                <UsageCard label="Storage (MB)" icon={Notebook20Regular} current={usage?.usage.storage.current ?? 0} limit={usage?.usage.storage.limit ?? 0} />
                                <UsageCard label="Workspaces you own" icon={NumberSymbol20Regular} current={usage?.usage.workspaces.current ?? 0} limit={usage?.usage.workspaces.limit ?? 0} />
                                <UsageCard label="Personal notes" icon={Book20Regular} current={usage?.usage.personalNotes.current ?? 0} limit={usage?.usage.personalNotes.limit ?? 0} />
                                <UsageCard label="Workspace notes" icon={Notebook20Regular} current={usage?.usage.workspaceNotes.current ?? 0} limit={usage?.usage.workspaceNotes.limit ?? 0} />
                            </div>

                            {currentPlan === "free" && (
                                <div className="flex items-center justify-between gap-4 rounded-2xl bg-avatar p-5 text-white">
                                    <div>
                                        <p className="text-sm font-semibold">Ready to scale?</p>
                                        <p className="mt-1 text-xs text-white/65">
                                            Startup is $29/month: more members, channels and pages.
                                        </p>
                                    </div>
                                    <button
                                        onClick={() => setActiveTab("plans")}
                                        className="flex shrink-0 items-center gap-1.5 rounded-full bg-brand px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-brand-hover"
                                    >
                                        View plans <ArrowRight16Regular />
                                    </button>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="flex flex-col gap-5">
                            <div className="flex flex-wrap items-end justify-between gap-2">
                                <div>
                                    <h3 className="text-xl font-semibold tracking-tight text-ink">Choose your plan</h3>
                                    <p className="mt-1 text-sm text-plum/60">One flat price per workspace, not per seat. Change or cancel any time.</p>
                                </div>
                                <div className="flex flex-wrap items-center gap-3">
                                    {billing?.annualAvailable && (
                                        <div role="group" aria-label="Billing period" className="flex rounded-full border border-plum/12 bg-surface p-0.5 text-xs font-semibold">
                                            {(["month", "year"] as const).map((i) => (
                                                <button key={i} type="button" onClick={() => setInterval(i)}
                                                    className={cn("rounded-full px-3 py-1 transition-colors", interval === i ? "bg-brand text-white" : "text-plum/65 hover:text-ink")}>
                                                    {i === "month" ? "Monthly" : "Yearly · 2 months free"}
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                    <span className="flex items-center gap-1.5 text-xs text-plum/60">
                                        <ShieldCheckmark20Regular className="size-4 text-brand" />
                                        {billing?.canTrial && billing.trialDays > 0 && !hasSub ? `${billing.trialDays}-day free trial, no card needed` : "Secure payments by Stripe"}
                                    </span>
                                </div>
                            </div>

                            {billing && billing.status === "past_due" && (
                                <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">
                                    <span>Your last payment didn&apos;t go through. Update your card to keep the {current.label} plan.</span>
                                    {canManage && <button onClick={handlePortal} className="rounded-full bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-700">Update payment</button>}
                                </div>
                            )}
                            {billing && billing.status === "trialing" && !billing.cancelAtPeriodEnd && (
                                <div className="rounded-xl border border-brand/25 bg-brand/8 px-4 py-3 text-sm text-ink">
                                    You&apos;re on a free trial of {current.label} until <strong>{dateOf(billing.trialEnd ?? billing.periodEnd)}</strong>. Add a card before then to keep it.
                                </div>
                            )}
                            {billing && hasSub && billing.cancelAtPeriodEnd && (
                                <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200">
                                    Your {current.label} plan ends on <strong>{dateOf(billing.periodEnd)}</strong>, then this workspace moves to Free. Your content stays, but you won&apos;t be able to add more past the Free limits.
                                </div>
                            )}

                            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
                                {PLANS.map((plan) => {
                                    const isCurrent = currentPlan === plan.key
                                    const Icon = plan.icon
                                    return (
                                        <div
                                            key={plan.key}
                                            className={cn(
                                                "relative flex flex-col rounded-2xl border p-5 transition-shadow",
                                                plan.popular
                                                    ? "border-plum dark:border-white/20 bg-avatar text-white shadow-[0_20px_40px_-24px_rgba(56,29,42,0.9)]"
                                                    : "border-plum/10 bg-surface text-ink",
                                                isCurrent && !plan.popular && "border-brand ring-2 ring-brand/20"
                                            )}
                                        >
                                            <div className="flex items-center justify-between">
                                                <span className={cn(
                                                    "flex size-9 items-center justify-center rounded-xl",
                                                    plan.popular ? "bg-brand text-white" : "bg-brand/10 text-brand"
                                                )}>
                                                    <Icon className="size-5" />
                                                </span>
                                                {isCurrent ? (
                                                    <span className="rounded-full bg-brand px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-white">Current</span>
                                                ) : plan.popular ? (
                                                    <span className="rounded-full bg-white/15 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-white">Most popular</span>
                                                ) : null}
                                            </div>

                                            <p className="mt-4 text-sm font-semibold">{plan.label}</p>
                                            <p className="mt-1 flex items-baseline gap-1">
                                                <span className="text-3xl font-semibold tracking-tight">${interval === "year" ? plan.price * 10 : plan.price}</span>
                                                <span className={cn("text-xs", plan.popular ? "text-white/60" : "text-plum/50")}>{interval === "year" && plan.price > 0 ? "/ year" : "/ month"}</span>
                                            </p>
                                            <p className={cn("mt-2 min-h-8 text-xs leading-relaxed", plan.popular ? "text-white/65" : "text-plum/60")}>{plan.tagline}</p>

                                            {(() => {
                                                const base = "mt-4 flex items-center justify-center rounded-full py-2 text-xs font-semibold transition-colors disabled:opacity-60"
                                                const tone = plan.popular
                                                    ? "bg-brand text-white hover:bg-brand-hover"
                                                    : "bg-avatar text-white hover:bg-chrome"
                                                const spin = <Loader className="size-4 animate-spin" />
                                                if (isCurrent && !hasSub) {
                                                    return (
                                                        <div className={cn("mt-4 rounded-full py-2 text-center text-xs font-semibold", plan.popular ? "bg-white/10 text-white" : "bg-plum/5 text-plum/70")}>
                                                            Your current plan
                                                        </div>
                                                    )
                                                }
                                                if (isCurrent) {
                                                    return (
                                                        <button onClick={handlePortal} disabled={busy !== null || !canManage} className={cn(base, tone)}>
                                                            {busy === "portal" ? spin : "Manage billing"}
                                                        </button>
                                                    )
                                                }
                                                if (plan.key === "free") {
                                                    return hasSub ? (
                                                        <button onClick={handlePortal} disabled={busy !== null || !canManage} className="mt-4 rounded-full py-2 text-center text-xs font-medium text-plum/60 underline-offset-2 hover:underline disabled:opacity-60">
                                                            Downgrade in billing portal
                                                        </button>
                                                    ) : (
                                                        <div className="mt-4 rounded-full py-2 text-center text-xs font-medium text-plum/40 dark:text-plum/60">Included</div>
                                                    )
                                                }
                                                const k = plan.key as "startup" | "growth" | "enterprise"
                                                return (
                                                    <button
                                                        onClick={() => (hasSub ? handlePortal() : handleUpgrade(k))}
                                                        disabled={busy !== null || !canManage}
                                                        title={!billing?.isOwner ? "Only the workspace owner can change the plan" : undefined}
                                                        className={cn(base, tone)}
                                                    >
                                                        {busy === plan.key || (hasSub && busy === "portal") ? spin : hasSub ? `Switch to ${plan.label}` : billing?.canTrial && billing.trialDays > 0 ? `Try ${plan.label} free` : `Upgrade to ${plan.label}`}
                                                    </button>
                                                )
                                            })()}

                                            <ul className={cn("mt-5 flex flex-col gap-2 border-t pt-5", plan.popular ? "border-white/15" : "border-plum/10")}>
                                                {plan.features.map((f) => (
                                                    <li key={f} className="flex items-start gap-2 text-xs">
                                                        <Checkmark16Filled className="mt-px size-3.5 shrink-0 text-brand" />
                                                        <span className={plan.popular ? "text-white/85" : "text-plum/80"}>{f}</span>
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    )
                                })}
                            </div>

                            <p className="text-center text-[11px] text-plum/50">
                                {billing && !billing.isOwner
                                    ? "Only the workspace owner can change the plan."
                                    : billing && !billing.configured
                                        ? "Online payments aren't switched on for this deployment yet."
                                        : "Payments are handled securely by Stripe. Your card details never touch WebflowX."}
                            </p>
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    )
}
