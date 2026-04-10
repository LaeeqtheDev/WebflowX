"use client"

import { useState } from "react"
import { useWorkspaceId } from "@/hooks/use-workspace-id"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import {
    Users, Hash, FileText, Video, BookOpen,
    Zap, CheckCircle, Crown, Rocket, Building2,
    Loader, ChevronRight
} from "lucide-react"
import { useUpgradePlan } from "@/features/workspaces/api/use-upgrade-plan"
import { useGetUsage } from "@/features/workspaces/api/use-get-usage"

interface MoreModalProps {
    open: boolean
    onClose: () => void
}

const PLAN_CONFIG = {
    free: { label: "Free", color: "text-slate-600", bg: "bg-slate-100", icon: Zap },
    startup: { label: "Startup", color: "text-blue-600", bg: "bg-blue-50", icon: Rocket },
    growth: { label: "Growth", color: "text-purple-600", bg: "bg-purple-50", icon: Crown },
    enterprise: { label: "Enterprise", color: "text-amber-600", bg: "bg-amber-50", icon: Building2 },
}

const PLAN_FEATURES: Record<string, string[]> = {
    free: ["1 workspace", "10 members", "5 channels", "10 documents", "5 meetings/month", "2 AI summaries", "10 personal notes", "20 workspace notes"],
    startup: ["3 workspaces", "25 members", "20 channels", "50 documents", "20 meetings/month", "10 AI summaries", "50 personal notes", "100 workspace notes"],
    growth: ["10 workspaces", "100 members", "50 channels", "200 documents", "50 meetings/month", "30 AI summaries", "Unlimited personal notes", "Unlimited workspace notes"],
    enterprise: ["Unlimited workspaces", "Unlimited members", "Unlimited channels", "Unlimited documents", "Unlimited meetings", "Unlimited AI summaries", "Unlimited notes", "Priority support"],
}

const PRICES: Record<string, number> = { free: 0, startup: 19, growth: 49, enterprise: 149 }

// ─── Usage Bar ────────────────────────────────────────────────────────────────

const UsageBar = ({ label, icon: Icon, current, limit, iconColor }: {
    label: string
    icon: any
    current: number
    limit: number
    iconColor: string
}) => {
    const isUnlimited = limit === -1
    const pct = isUnlimited ? 0 : Math.min((current / limit) * 100, 100)
    const isNearLimit = !isUnlimited && pct >= 80
    const isAtLimit = !isUnlimited && pct >= 100

    return (
        <div className="flex flex-col gap-2 p-3 rounded-lg border bg-white">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Icon className={cn("size-4", iconColor)} />
                    <span className="text-xs font-semibold">{label}</span>
                </div>
                <span className={cn(
                    "text-xs font-bold",
                    isAtLimit ? "text-red-500" :
                        isNearLimit ? "text-yellow-600" :
                            "text-muted-foreground"
                )}>
                    {current}
                    <span className="font-normal text-muted-foreground">
                        /{isUnlimited ? "∞" : limit}
                    </span>
                </span>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-2">
                <div
                    className={cn(
                        "h-2 rounded-full transition-all",
                        isUnlimited ? "bg-green-400" :
                            isAtLimit ? "bg-red-500" :
                                isNearLimit ? "bg-yellow-400" :
                                    "bg-[#ff5018]"
                    )}
                    style={{ width: isUnlimited ? "100%" : `${pct}%` }}
                />
            </div>
            {isAtLimit && (
                <p className="text-[10px] text-red-500 font-medium">
                    Limit reached — upgrade to add more
                </p>
            )}
            {isNearLimit && !isAtLimit && (
                <p className="text-[10px] text-yellow-600 font-medium">
                    Approaching limit
                </p>
            )}
            {isUnlimited && (
                <p className="text-[10px] text-green-600 font-medium">
                    Unlimited
                </p>
            )}
        </div>
    )
}

// ─── More Modal ───────────────────────────────────────────────────────────────

export const MoreModal = ({ open, onClose }: MoreModalProps) => {
    const workspaceId = useWorkspaceId()
    const { data: usage, isLoading } = useGetUsage({ workspaceId })
    const { mutate: upgradePlan, isPending } = useUpgradePlan()
    const [activeTab, setActiveTab] = useState<"usage" | "plans">("usage")
    const [upgradingPlan, setUpgradingPlan] = useState<string | null>(null)

    const currentPlan = usage?.plan ?? "free"
    const planConfig = PLAN_CONFIG[currentPlan as keyof typeof PLAN_CONFIG]
    const PlanIcon = planConfig?.icon ?? Zap

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
            }
        })
    }

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col p-0 gap-0">
                {/* Header */}
                <DialogHeader className="px-6 py-5 border-b shrink-0">
                    <DialogTitle className="flex items-center gap-3">
                        <div className={cn(
                            "size-9 rounded-xl flex items-center justify-center",
                            planConfig?.bg
                        )}>
                            <PlanIcon className={cn("size-5", planConfig?.color)} />
                        </div>
                        <div>
                            <p className="font-bold text-base leading-none">Workspace Overview</p>
                            <p className="text-xs text-muted-foreground mt-1 capitalize font-normal">
                                {currentPlan} Plan ·{" "}
                                {usage?.planDetails.price === 0
                                    ? "Free forever"
                                    : `$${usage?.planDetails.price}/mo`}
                            </p>
                        </div>
                    </DialogTitle>
                </DialogHeader>

                {/* Tabs */}
                <div className="flex border-b px-6 shrink-0 bg-gray-50/50">
                    {(["usage", "plans"] as const).map(tab => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={cn(
                                "py-3 text-sm font-medium transition-colors border-b-2 mr-8 capitalize",
                                activeTab === tab
                                    ? "border-[#ff5018] text-[#ff5018]"
                                    : "border-transparent text-muted-foreground hover:text-foreground"
                            )}
                        >
                            {tab === "plans" ? "Plans & Billing" : "Usage"}
                        </button>
                    ))}
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6">
                    {isLoading ? (
                        <div className="flex items-center justify-center h-48">
                            <Loader className="size-6 animate-spin text-[#ff5018]" />
                        </div>
                    ) : activeTab === "usage" ? (
                        <div className="flex flex-col gap-5">
                            {/* Usage grid */}
                            <div className="grid grid-cols-3 gap-3">
                                <UsageBar
                                    label="Members"
                                    icon={Users}
                                    current={usage?.usage.members.current ?? 0}
                                    limit={usage?.usage.members.limit ?? 0}
                                    iconColor="text-blue-500"
                                />
                                <UsageBar
                                    label="Channels"
                                    icon={Hash}
                                    current={usage?.usage.channels.current ?? 0}
                                    limit={usage?.usage.channels.limit ?? 0}
                                    iconColor="text-purple-500"
                                />
                                <UsageBar
                                    label="Documents"
                                    icon={FileText}
                                    current={usage?.usage.docs.current ?? 0}
                                    limit={usage?.usage.docs.limit ?? 0}
                                    iconColor="text-blue-500"
                                />
                                <UsageBar
                                    label="Meetings (this month)"
                                    icon={Video}
                                    current={usage?.usage.meetings.current ?? 0}
                                    limit={usage?.usage.meetings.limit ?? 0}
                                    iconColor="text-[#ff5018]"
                                />
                                <UsageBar
                                    label="Personal Notes"
                                    icon={BookOpen}
                                    current={usage?.usage.personalNotes.current ?? 0}
                                    limit={usage?.usage.personalNotes.limit ?? 0}
                                    iconColor="text-green-500"
                                />
                                <UsageBar
                                    label="Workspace Notes"
                                    icon={BookOpen}
                                    current={usage?.usage.workspaceNotes.current ?? 0}
                                    limit={usage?.usage.workspaceNotes.limit ?? 0}
                                    iconColor="text-amber-500"
                                />
                            </div>

                            {/* Upgrade CTA for free plan */}
                            {currentPlan === "free" && (
                                <div className="flex items-center justify-between p-4 rounded-xl bg-linear-to-r from-[#ff5018]/5 to-orange-50 border border-[#ff5018]/20">
                                    <div>
                                        <p className="text-sm font-semibold">Ready to scale?</p>
                                        <p className="text-xs text-muted-foreground mt-0.5">
                                            Upgrade to Startup for just $19/mo — more members, channels & docs
                                        </p>
                                    </div>
                                    <Button
                                        onClick={() => setActiveTab("plans")}
                                        size="sm"
                                        className="h-8 text-xs bg-[#ff5018] hover:bg-[#ff5018]/90 text-white gap-1 shrink-0 ml-4"
                                    >
                                        View Plans <ChevronRight className="size-3" />
                                    </Button>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="flex flex-col gap-4">
                            <p className="text-xs text-muted-foreground">
                                All plans are billed per workspace. Upgrade anytime — no credit card required for demo.
                            </p>

                            {/* Plans list */}
                            <div className="flex flex-col gap-3">
                                {["free", "startup", "growth", "enterprise"].map(planKey => {
                                    const config = PLAN_CONFIG[planKey as keyof typeof PLAN_CONFIG]
                                    const features = PLAN_FEATURES[planKey] ?? []
                                    const price = PRICES[planKey] ?? 0
                                    const isCurrent = currentPlan === planKey
                                    const Icon = config.icon

                                    return (
                                        <div
                                            key={planKey}
                                            className={cn(
                                                "flex items-start gap-4 p-4 rounded-xl border transition-all",
                                                isCurrent
                                                    ? "border-[#ff5018] bg-orange-50/50"
                                                    : "border-border hover:border-[#ff5018]/30 bg-white"
                                            )}
                                        >
                                            <div className={cn(
                                                "size-10 rounded-xl flex items-center justify-center shrink-0 mt-0.5",
                                                config.bg
                                            )}>
                                                <Icon className={cn("size-5", config.color)} />
                                            </div>

                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 mb-1.5">
                                                    <p className="font-bold text-sm">{config.label}</p>
                                                    <p className="text-xs text-muted-foreground">
                                                        {price === 0 ? "Free forever" : `$${price}/mo`}
                                                    </p>
                                                    {isCurrent && (
                                                        <Badge className="bg-[#ff5018] text-white text-[9px] h-4 px-1.5">
                                                            Current
                                                        </Badge>
                                                    )}
                                                </div>
                                                <div className="flex flex-wrap gap-x-4 gap-y-1">
                                                    {features.map((f, i) => (
                                                        <div key={i} className="flex items-center gap-1">
                                                            <CheckCircle className="size-2.5 text-[#ff5018] shrink-0" />
                                                            <span className="text-[11px] text-muted-foreground">{f}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>

                                            {!isCurrent && planKey !== "free" && (
                                                <Button
                                                    onClick={() => handleUpgrade(planKey as any)}
                                                    disabled={isPending}
                                                    size="sm"
                                                    className="h-8 text-xs bg-[#ff5018]/80 hover:bg-[#ff5018] text-white shrink-0 self-center"
                                                >
                                                    {upgradingPlan === planKey
                                                        ? <Loader className="size-3.5 animate-spin" />
                                                        : "Upgrade"
                                                    }
                                                </Button>
                                            )}
                                        </div>
                                    )
                                })}
                            </div>

                            <p className="text-[10px] text-center text-muted-foreground pb-1">
                                💳 Payment integration coming soon. Plan upgrades are simulated for demo purposes.
                            </p>
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    )
}