// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest"
import { cleanup, render, screen } from "@testing-library/react"
import { createElement } from "react"
import { BillingHistory, describeAdjustment, type BillingAdjustment } from "../src/app/dashboard/workspace/[workspaceId]/components/billing-history"
import { formatStripeAmount } from "../src/lib/stripe-amount"

afterEach(cleanup)
const row = (over: Partial<BillingAdjustment>): BillingAdjustment => ({ id: "a1", kind: "refund", amount: 2900, currency: "usd", status: "succeeded", createdAt: Date.UTC(2026, 9, 11, 12), ...over })

describe("formatStripeAmount", () => {
  it("reads the amount in the currency's smallest unit", () => {
    expect(formatStripeAmount(2900, "usd", "en-US")).toBe("$29.00")
    expect(formatStripeAmount(1050, "EUR", "en-US")).toBe("€10.50")
    expect(formatStripeAmount(2900, "jpy", "en-US")).toBe("¥2,900")
    expect(formatStripeAmount(1500, "kwd", "en-US")).toContain("1.500")
  })
  it("falls back to plain text for a currency code the browser rejects", () => {
    expect(formatStripeAmount(500, "not-a-code")).toBe("5 NOT-A-CODE")
  })
})

describe("describeAdjustment", () => {
  it("puts Stripe's statuses in the owner's words", () => {
    expect(describeAdjustment("refund", "succeeded").label).toBe("Refunded")
    expect(describeAdjustment("refund", "pending").label).toBe("On its way")
    expect(describeAdjustment("refund", "requires_action").label).toBe("On its way")
    expect(describeAdjustment("refund", "failed")).toMatchObject({ label: "Failed", tone: "bad" })
    expect(describeAdjustment("dispute", "needs_response").label).toBe("Under review")
    expect(describeAdjustment("dispute", "lost").label).toBe("Closed, payment returned")
    expect(describeAdjustment("dispute", "won").label).toBe("Closed, payment kept")
    expect(describeAdjustment("dispute", "warning_closed").label).toBe("Closed")
  })
})

describe("BillingHistory", () => {
  it("renders nothing when there are no refunds or disputes", () => {
    const { container } = render(createElement(BillingHistory, { items: [] }))
    expect(container.innerHTML).toBe("")
  })

  it("lists each refund and dispute with its amount and status, and explains a failed refund", () => {
    render(createElement(BillingHistory, {
      items: [
        row({ id: "a1" }),
        row({ id: "a2", status: "failed", amount: 1000 }),
        row({ id: "a3", kind: "dispute", status: "under_review", amount: 7900 }),
      ],
    }))
    expect(screen.getByRole("heading", { name: "Refunds and disputes" })).toBeTruthy()
    expect(screen.getAllByRole("listitem")).toHaveLength(3)
    expect(screen.getByText("Refunded")).toBeTruthy()
    expect(screen.getByText("Payment dispute")).toBeTruthy()
    expect(screen.getByText("Under review")).toBeTruthy()
    expect(screen.getByText(/couldn't reach your payment method/)).toBeTruthy()
    expect(screen.getByText(formatStripeAmount(7900, "usd"))).toBeTruthy()
  })
})
