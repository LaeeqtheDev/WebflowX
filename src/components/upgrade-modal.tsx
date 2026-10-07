"use client"

import { ArrowRight, Zap } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import {
    FEATURE_META,
    PLAN_LIMITS,
    formatAllowance,
    limitFor,
    nextPlanOf,
    type LimitInfo,
    type PlanKey,
} from "@/lib/plans"

interface UpgradeModalProps {
    info: LimitInfo | null
    /** Plan to describe when the error did not say which plan hit the limit (storage errors). */
    fallbackPlan?: PlanKey
    onClose: () => void
    /** Opens the existing plans view. Omit to hide the primary button. */
    onViewPlans?: () => void
}

// Other allowances worth showing next to the one that was hit.
const HIGHLIGHTS = ["members", "channels", "docs", "storage"] as const

const sentence = (feature: string, limit: number, planName: string) => {
    const meta = FEATURE_META[feature]
    if (feature === "storage") return `This workspace is out of storage on the ${planName} plan (${formatAllowance(feature, limit).replace(" of storage", "")}).`
    if (limit === 1) return `You've used the one ${meta?.singular ?? feature}${meta?.period ? ` ${meta.period}` : ""} included in the ${planName} plan.`
    return `You've used all ${formatAllowance(feature, limit)} on the ${planName} plan.`
}

export const UpgradeModal = ({ info, fallbackPlan = "free", onClose, onViewPlans }: UpgradeModalProps) => {
    if (!info) return null

    const plan: PlanKey = info.plan === "unknown" ? fallbackPlan : info.plan
    const planName = PLAN_LIMITS[plan].name
    const limit = info.limit > 0 ? info.limit : limitFor(plan, info.feature)
    const next = nextPlanOf(plan)
    const nextLimits = next ? PLAN_LIMITS[next] : null
    const nounTitle = FEATURE_META[info.feature]?.noun ?? info.feature

    const rows = nextLimits && next
        ? [info.feature, ...HIGHLIGHTS.filter((f) => f !== info.feature)].slice(0, 3).map((f) => ({
            feature: f,
            from: formatAllowance(f, limitFor(plan, f)),
            to: formatAllowance(f, limitFor(next, f)),
            hit: f === info.feature,
        }))
        : []

    return (
        <Dialog open onOpenChange={(open) => { if (!open) onClose() }}>
            <DialogContent className="gap-5 rounded-2xl p-6 sm:max-w-md">
                <DialogHeader className="gap-3 text-left">
                    <span aria-hidden className="flex size-11 items-center justify-center rounded-xl bg-[#ff5018]/10 text-orange-ink">
                        <Zap className="size-5" />
                    </span>
                    <DialogTitle className="text-xl font-semibold tracking-tight text-ink">
                        You&apos;ve reached your {nounTitle} limit
                    </DialogTitle>
                    <DialogDescription className="text-sm text-ink/70">
                        {sentence(info.feature, limit, planName)}
                    </DialogDescription>
                </DialogHeader>

                {nextLimits && next ? (
                    <div className="rounded-xl border border-plum/12 bg-cream-soft p-4">
                        <div className="flex items-baseline justify-between gap-3">
                            <p className="text-sm font-semibold text-ink">Next up: {nextLimits.name}</p>
                            <p className="text-sm font-semibold text-orange-ink">${nextLimits.price}<span className="font-normal text-ink/60"> / month</span></p>
                        </div>
                        <ul className="mt-3 flex flex-col gap-2">
                            {rows.map((r) => (
                                <li key={r.feature} className="flex flex-wrap items-center gap-x-2 text-[13px] text-ink/75">
                                    <span className={r.hit ? "font-semibold text-ink" : undefined}>{r.from}</span>
                                    <ArrowRight aria-hidden className="size-3.5 shrink-0 text-orange-ink" />
                                    <span className="font-semibold text-ink">{r.to}</span>
                                </li>
                            ))}
                        </ul>
                    </div>
                ) : (
                    <p className="rounded-xl border border-plum/12 bg-cream-soft p-4 text-sm text-ink/70">
                        You&apos;re on our highest plan. Contact us and we&apos;ll raise this limit for you.
                    </p>
                )}

                <DialogFooter className="gap-2 sm:gap-2">
                    <Button type="button" variant="outline" className="h-11 rounded-xl sm:h-10" onClick={onClose}>
                        Maybe later
                    </Button>
                    {next ? (
                        onViewPlans && (
                            <Button type="button" className="h-11 rounded-xl bg-[#ff5018] font-semibold text-white hover:bg-[#e6430f] sm:h-10" onClick={onViewPlans}>
                                View plans
                            </Button>
                        )
                    ) : (
                        <Button asChild className="h-11 rounded-xl bg-[#ff5018] font-semibold text-white hover:bg-[#e6430f] sm:h-10">
                            <a href="mailto:support@northfoundry.co?subject=Raise%20my%20plan%20limit">Contact support</a>
                        </Button>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
