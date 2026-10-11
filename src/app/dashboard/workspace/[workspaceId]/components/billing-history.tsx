import { cn } from "@/lib/utils"
import { formatStripeAmount } from "@/lib/stripe-amount"

export type BillingAdjustment = {
    id: string
    kind: "refund" | "dispute"
    amount: number
    currency: string
    status: string
    createdAt: number
}

type Tone = "good" | "wait" | "bad" | "plain"
const TONES: Record<Tone, string> = {
    good: "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300",
    wait: "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300",
    bad: "bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400",
    plain: "bg-plum/5 text-plum/60",
}

// Stripe's status words, in the workspace owner's terms.
export const describeAdjustment = (kind: BillingAdjustment["kind"], status: string): { label: string; tone: Tone; note?: string } => {
    if (kind === "refund") {
        if (status === "succeeded") return { label: "Refunded", tone: "good" }
        if (status === "failed") return { label: "Failed", tone: "bad", note: "The refund couldn't reach your payment method. Contact support@northfoundry.co." }
        if (status === "canceled") return { label: "Cancelled", tone: "plain" }
        return { label: "On its way", tone: "wait" }
    }
    if (status === "lost") return { label: "Closed, payment returned", tone: "plain" }
    if (status === "won") return { label: "Closed, payment kept", tone: "plain" }
    if (["needs_response", "under_review", "warning_needs_response", "warning_under_review"].includes(status)) return { label: "Under review", tone: "wait" }
    return { label: "Closed", tone: "plain" }
}

const dateOf = (ms: number) => new Date(ms).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })

// Refunds and disputes on this workspace's payments. Rendered for the owner only, and only when there are any.
export const BillingHistory = ({ items }: { items: BillingAdjustment[] }) => {
    if (items.length === 0) return null
    return (
        <section aria-labelledby="billing-history-title" className="rounded-2xl border border-plum/10 bg-surface p-5">
            <h4 id="billing-history-title" className="text-sm font-semibold text-ink">Refunds and disputes</h4>
            <ul className="mt-3 flex flex-col divide-y divide-plum/8">
                {items.map((item) => {
                    const { label, tone, note } = describeAdjustment(item.kind, item.status)
                    return (
                        <li key={item.id} className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 py-2.5 first:pt-0 last:pb-0">
                            <div className="min-w-0">
                                <p className="text-sm text-ink">{item.kind === "refund" ? "Refund" : "Payment dispute"}</p>
                                <p className="text-xs text-plum/60">{dateOf(item.createdAt)}</p>
                                {note && <p className="mt-1 text-xs text-red-600 dark:text-red-400">{note}</p>}
                            </div>
                            <div className="flex items-center gap-3">
                                <span className="text-sm font-semibold tabular-nums text-ink">{formatStripeAmount(item.amount, item.currency)}</span>
                                <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide", TONES[tone])}>{label}</span>
                            </div>
                        </li>
                    )
                })}
            </ul>
        </section>
    )
}
