import { describe, expect, it } from "vitest"
import { COMPARISONS, FEATURES, SITE_FAQS, USE_CASES } from "../src/lib/marketing-content"
import sitemap from "../src/app/sitemap"
import robots from "../src/app/robots"

const all = [...FEATURES, ...USE_CASES, ...COMPARISONS]

describe("marketing content", () => {
  it("has unique slugs per section and unique titles and descriptions overall", () => {
    for (const group of [FEATURES, USE_CASES, COMPARISONS]) {
      expect(new Set(group.map((p) => p.slug)).size).toBe(group.length)
    }
    expect(new Set(all.map((p) => p.title)).size).toBe(all.length)
    expect(new Set(all.map((p) => p.description)).size).toBe(all.length)
  })

  it("keeps titles and descriptions a sensible length for search results", () => {
    for (const p of all) {
      expect(p.title.length, p.slug).toBeLessThanOrEqual(70)
      expect(p.description.length, p.slug).toBeGreaterThanOrEqual(70)
      expect(p.description.length, p.slug).toBeLessThanOrEqual(175)
    }
  })

  it("links related pages that exist", () => {
    for (const group of [FEATURES, USE_CASES, COMPARISONS]) {
      const slugs = new Set(group.map((p) => p.slug))
      for (const p of group) for (const r of p.related) expect(slugs.has(r), `${p.slug} -> ${r}`).toBe(true)
    }
  })

  it("never claims certifications or guarantees the product does not have", () => {
    const text = JSON.stringify([all, SITE_FAQS]).toLowerCase()
    for (const banned of ["soc 2 certified", "soc 2 compliant", "iso 27001 certified", "99.9", "hipaa", "gdpr compliant", "saml sso available"]) {
      expect(text.includes(banned), banned).toBe(false)
    }
  })

  it("contains no emojis", () => {
    expect(JSON.stringify(all)).not.toMatch(/\p{Extended_Pictographic}/u)
  })
})

describe("sitemap and robots", () => {
  it("lists every marketing page once and leaves out private routes", () => {
    const urls = sitemap().map((e) => e.url)
    expect(new Set(urls).size).toBe(urls.length)
    for (const p of FEATURES) expect(urls.some((u) => u.endsWith(`/features/${p.slug}`))).toBe(true)
    for (const p of COMPARISONS) expect(urls.some((u) => u.endsWith(`/compare/${p.slug}`))).toBe(true)
    expect(urls.some((u) => /\/(auth|dashboard|api)(\/|$)/.test(u))).toBe(false)
  })

  it("names the AI search crawlers explicitly", () => {
    const rules = robots().rules as { userAgent: string }[]
    const agents = rules.map((r) => r.userAgent)
    for (const a of ["OAI-SearchBot", "GPTBot", "ClaudeBot", "PerplexityBot"]) expect(agents).toContain(a)
  })
})
