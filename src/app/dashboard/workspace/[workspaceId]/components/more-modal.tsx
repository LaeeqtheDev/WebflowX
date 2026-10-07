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
import { useUpgradePlan } from "@/features/workspaces/api/use-upgrade-plan"
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
        features: ["1 workspace", "10 members", "5 channels", "10 documents", "5 meetings / month", "2 AI summaries", "10 personal notes", "20 workspace notes", "90 days of history"],
    },
    {
        key: "startup",
        label: "Startup",
        price: 29,
        tagline: "For small teams that ship every week.",
        icon: Rocket20Regular,
        features: ["3 workspaces", "25 members", "20 channels", "50 documents", "20 meetings / month", "10 AI summaries", "50 personal notes", "100 workspace notes", "5 guests", "API + 5 incoming webhooks"],
    },
    {
        key: "growth",
        label: "Growth",
        price: 79,
        tagline: "For growing teams that run on process.",
        icon: Crown20Regular,
        popular: true,
        features: ["10 workspaces", "100 members", "50 channels", "200 documents", "50 meetings / month", "30 AI summaries", "Unlimited personal notes", "Unlimited workspace notes", "25 guests", "Outgoing webhooks + GitHub"],
    },
    {
        key: "enterprise",
        label: "Enterprise",
        price: 249,
        tagline: "For organisations with no ceiling.",
        icon: Building20Regular,
        features: ["Unlimited workspaces", "Unlimited members", "Unlimited channels", "Unlimited documents", "200 meetings / month", "150 AI summaries / month", "Unlimited notes", "Unlimited guests + integrations", "Email support"],
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
                <span className="flex size-9 items-center justify-center rounded-xl bg-[#ff5018]/10 text-[#ff5018]">
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
                    className={cn("h-full rounded-full transition-all", atLimit ? "bg-red-500" : near ? "bg-amber-500" : "bg-[#ff5018]")}
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
    const { mutate: upgradePlan, isPending } = useUpgradePlan()
    const [activeTab, setActiveTab] = useState<"usage" | "plans">(initialTab)
    const [upgradingPlan, setUpgradingPlan] = useState<string | null>(null)

    const currentPlan = (usage?.plan ?? "free") as PlanKey
    const current = PLANS.find((p) => p.key === currentPlan) ?? PLANS[0]
    const CurrentIcon = current.icon

    const handleUpgrade = (plan: "startup" | "growth" | "enterprise") => {
        setUpgradingPlan(plan)
        upgradePlan({ workspaceId, plan }, {
            onSuccess: () => {
                toast.success(`Upgraded to ${plan} plan!`)
                setUpgradingPlan(null)
            },
            onError: () => {
                toast.error("Failed to upgrade plan")
                setUpgradingPlan(null)
            },
        })
    }

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="[&>button]:text-white [&>button]:opacity-80 [&>button]:hover:opacity-100 [&>button]:top-5 [&>button]:right-5 flex h-[min(760px,90vh)] w-[min(1040px,calc(100vw-2rem))] max-w-none flex-col gap-0 overflow-hidden rounded-3xl border-plum/10 bg-cream-soft p-0 sm:max-w-none">
                <DialogHeader className="shrink-0 bg-[#381d2a] px-7 pb-0 pt-6 text-white">
                    <DialogTitle className="flex items-center gap-4">
                        <span className="flex size-11 items-center justify-center rounded-2xl bg-[#ff5018] text-white">
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
                            <Loader className="size-6 animate-spin text-[#ff5018]" />
                        </div>
                    ) : activeTab === "usage" ? (
                        <div className="flex flex-col gap-6">
                            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                                <UsageCard label="Members" icon={People20Regular} current={usage?.usage.members.current ?? 0} limit={usage?.usage.members.limit ?? 0} />
                                <UsageCard label="Channels" icon={NumberSymbol20Regular} current={usage?.usage.channels.current ?? 0} limit={usage?.usage.channels.limit ?? 0} />
                                <UsageCard label="Documents" icon={DocumentText20Regular} current={usage?.usage.docs.current ?? 0} limit={usage?.usage.docs.limit ?? 0} />
                                <UsageCard label="Meetings this month" icon={Video20Regular} current={usage?.usage.meetings.current ?? 0} limit={usage?.usage.meetings.limit ?? 0} />
                                <UsageCard label="AI summaries this month" icon={Video20Regular} current={usage?.usage.aiSummaries.current ?? 0} limit={usage?.usage.aiSummaries.limit ?? 0} />
                                <UsageCard label="Storage (MB)" icon={Notebook20Regular} current={usage?.usage.storage.current ?? 0} limit={usage?.usage.storage.limit ?? 0} />
                                <UsageCard label="Workspaces you own" icon={NumberSymbol20Regular} current={usage?.usage.workspaces.current ?? 0} limit={usage?.usage.workspaces.limit ?? 0} />
                                <UsageCard label="Personal notes" icon={Book20Regular} current={usage?.usage.personalNotes.current ?? 0} limit={usage?.usage.personalNotes.limit ?? 0} />
                                <UsageCard label="Workspace notes" icon={Notebook20Regular} current={usage?.usage.workspaceNotes.current ?? 0} limit={usage?.usage.workspaceNotes.limit ?? 0} />
                            </div>

                            {currentPlan === "free" && (
                                <div className="flex items-center justify-between gap-4 rounded-2xl bg-[#381d2a] p-5 text-white">
                                    <div>
                                        <p className="text-sm font-semibold">Ready to scale?</p>
                                        <p className="mt-1 text-xs text-white/65">
                                            Startup is $29/month: more members, channels and documents.
                                        </p>
                                    </div>
                                    <button
                                        onClick={() => setActiveTab("plans")}
                                        className="flex shrink-0 items-center gap-1.5 rounded-full bg-[#ff5018] px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-[#e6430f]"
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
                                    <p className="mt-1 text-sm text-plum/60">Billed per workspace. Change or cancel any time.</p>
                                </div>
                                <span className="flex items-center gap-1.5 text-xs text-plum/60">
                                    <ShieldCheckmark20Regular className="size-4 text-[#ff5018]" />
                                    No card needed while upgrades are simulated
                                </span>
                            </div>

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
                                                    ? "border-plum dark:border-white/20 bg-[#381d2a] text-white shadow-[0_20px_40px_-24px_rgba(56,29,42,0.9)]"
                                                    : "border-plum/10 bg-surface text-ink",
                                                isCurrent && !plan.popular && "border-[#ff5018] ring-2 ring-[#ff5018]/20"
                                            )}
                                        >
                                            <div className="flex items-center justify-between">
                                                <span className={cn(
                                                    "flex size-9 items-center justify-center rounded-xl",
                                                    plan.popular ? "bg-[#ff5018] text-white" : "bg-[#ff5018]/10 text-[#ff5018]"
                                                )}>
                                                    <Icon className="size-5" />
                                                </span>
                                                {isCurrent ? (
                                                    <span className="rounded-full bg-[#ff5018] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-white">Current</span>
                                                ) : plan.popular ? (
                                                    <span className="rounded-full bg-white/15 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-white">Most popular</span>
                                                ) : null}
                                            </div>

                                            <p className="mt-4 text-sm font-semibold">{plan.label}</p>
                                            <p className="mt-1 flex items-baseline gap-1">
                                                <span className="text-3xl font-semibold tracking-tight">${plan.price}</span>
                                                <span className={cn("text-xs", plan.popular ? "text-white/60" : "text-plum/50")}>/ month</span>
                                            </p>
                                            <p className={cn("mt-2 min-h-8 text-xs leading-relaxed", plan.popular ? "text-white/65" : "text-plum/60")}>{plan.tagline}</p>

                                            {isCurrent ? (
                                                <div className={cn(
                                                    "mt-4 rounded-full py-2 text-center text-xs font-semibold",
                                                    plan.popular ? "bg-white/10 text-white" : "bg-plum/5 text-plum/70"
                                                )}>
                                                    Your current plan
                                                </div>
                                            ) : plan.key === "free" ? (
                                                <div className="mt-4 rounded-full py-2 text-center text-xs font-medium text-plum/40 dark:text-plum/60">
                                                    Included
                                                </div>
                                            ) : (
                                                <button
                                                    onClick={() => handleUpgrade(plan.key as "startup" | "growth" | "enterprise")}
                                                    disabled={isPending}
                                                    className={cn(
                                                        "mt-4 flex items-center justify-center rounded-full py-2 text-xs font-semibold transition-colors disabled:opacity-60",
                                                        plan.popular
                                                            ? "bg-[#ff5018] text-white hover:bg-[#e6430f]"
                                                            : "bg-[#381d2a] dark:bg-[#4a2838] text-white hover:bg-[#2a1420] dark:hover:bg-[#5a3246]"
                                                    )}
                                                >
                                                    {upgradingPlan === plan.key ? <Loader className="size-4 animate-spin" /> : `Upgrade to ${plan.label}`}
                                                </button>
                                            )}

                                            <ul className={cn("mt-5 flex flex-col gap-2 border-t pt-5", plan.popular ? "border-white/15" : "border-plum/10")}>
                                                {plan.features.map((f) => (
                                                    <li key={f} className="flex items-start gap-2 text-xs">
                                                        <Checkmark16Filled className="mt-px size-3.5 shrink-0 text-[#ff5018]" />
                                                        <span className={plan.popular ? "text-white/85" : "text-plum/80"}>{f}</span>
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    )
                                })}
                            </div>

                            <p className="text-center text-[11px] text-plum/50">
                                Payment integration is coming soon. Plan upgrades are simulated for demo purposes.
                            </p>
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    )
}
