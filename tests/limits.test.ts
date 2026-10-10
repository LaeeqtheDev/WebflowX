import { describe, expect, it } from "vitest"
import { HISTORY_DAYS_FREE, PLANS, getPlan, historyCutoff } from "../convex/limits"
import { PLANS as MARKETING_PLANS } from "../src/lib/marketing-content"

describe("getPlan", () => {
  it("falls back to free for unknown or missing plans", () => {
    expect(getPlan(undefined)).toBe("free")
    expect(getPlan("platinum")).toBe("free")
    expect(getPlan("growth")).toBe("growth")
  })
})

describe("plan limits", () => {
  const order = ["free", "startup", "growth", "enterprise"] as const
  const numeric = ["members", "channels", "dbRows", "meetings", "aiSummaries", "storageMb", "workspaces"] as const

  it("never lowers a limit on a higher plan (-1 means unlimited)", () => {
    const rank = (n: number) => (n === -1 ? Infinity : n)
    for (const key of numeric) {
      for (let i = 1; i < order.length; i++) {
        expect(rank(PLANS[order[i]][key]), `${key}: ${order[i]} vs ${order[i - 1]}`).toBeGreaterThanOrEqual(rank(PLANS[order[i - 1]][key]))
      }
    }
  })

  it("keeps meetings and AI summaries capped even on Enterprise", () => {
    expect(PLANS.enterprise.meetings).toBeGreaterThan(0)
    expect(PLANS.enterprise.aiSummaries).toBeGreaterThan(0)
  })

  it("keeps guests and integrations off the Free plan", () => {
    expect(PLANS.free.guests).toBe(0)
    expect(PLANS.free.apiKeys).toBe(0)
    expect(PLANS.free.outgoingHooks).toBe(0)
  })

  it("matches the prices advertised on the public pages", () => {
    for (const p of MARKETING_PLANS) {
      expect(PLANS[p.name.toLowerCase() as keyof typeof PLANS].price).toBe(Number(p.price))
    }
  })
})

describe("historyCutoff", () => {
  it("hides old messages only on the Free plan", () => {
    const cutoff = historyCutoff("free")!
    const days = (Date.now() - cutoff) / 86_400_000
    expect(Math.round(days)).toBe(HISTORY_DAYS_FREE)
    expect(historyCutoff("startup")).toBeNull()
    expect(historyCutoff(undefined)).not.toBeNull()
  })
})

import { removedContentDays } from "../convex/limits"
describe("removedContentDays", () => {
  it("is 90 days on Free and unlimited on paid plans", () => {
    expect(removedContentDays("free")).toBe(90)
    expect(removedContentDays(undefined)).toBe(90)
    for (const p of ["startup", "growth", "enterprise"]) expect(removedContentDays(p)).toBeNull()
  })
})
