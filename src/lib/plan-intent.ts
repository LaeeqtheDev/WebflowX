// The plan someone picked on the pricing page, carried through sign-up so the plans screen opens once their workspace exists.
const KEY = "wfx-plan-intent"
const DAY = 24 * 60 * 60 * 1000
export const PAID_PLANS = ["startup", "growth", "enterprise"] as const
export type PaidPlanKey = (typeof PAID_PLANS)[number]

export const savePlanIntent = (plan: string | undefined) => {
  if (!plan || !(PAID_PLANS as readonly string[]).includes(plan)) return
  try { localStorage.setItem(KEY, JSON.stringify({ plan, at: Date.now() })) } catch {}
}

// read once, then forget, so the plans screen opens a single time
export const takePlanIntent = (): PaidPlanKey | null => {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return null
    localStorage.removeItem(KEY)
    const { plan, at } = JSON.parse(raw) as { plan: PaidPlanKey; at: number }
    return Date.now() - at < DAY && PAID_PLANS.includes(plan) ? plan : null
  } catch { return null }
}
