import type { MetadataRoute } from "next"
import { CASE_STUDIES, COMPARISONS, FEATURES, USE_CASES } from "@/lib/marketing-content"
import { SITE_URL } from "@/lib/site"

// Dates are the last time each page's content changed in the repo; bump when you edit a page.
const HOME_UPDATED = new Date("2026-10-09")
const CONTENT_UPDATED = new Date("2026-10-10")
const LEGAL_UPDATED = new Date("2026-10-07")

export default function sitemap(): MetadataRoute.Sitemap {
  const group = (base: string, items: { slug: string }[]) =>
    items.map((p) => ({ url: `${SITE_URL}/${base}/${p.slug}`, lastModified: CONTENT_UPDATED, changeFrequency: "monthly" as const, priority: 0.7 }))
  return [
    { url: `${SITE_URL}/`, lastModified: HOME_UPDATED, changeFrequency: "weekly", priority: 1 },
    { url: `${SITE_URL}/features`, lastModified: CONTENT_UPDATED, changeFrequency: "monthly", priority: 0.8 },
    ...group("features", FEATURES),
    { url: `${SITE_URL}/use-cases`, lastModified: CONTENT_UPDATED, changeFrequency: "monthly", priority: 0.8 },
    ...group("use-cases", USE_CASES),
    { url: `${SITE_URL}/compare`, lastModified: CONTENT_UPDATED, changeFrequency: "monthly", priority: 0.8 },
    ...group("compare", COMPARISONS),
    { url: `${SITE_URL}/templates`, lastModified: CONTENT_UPDATED, changeFrequency: "monthly", priority: 0.7 },
    { url: `${SITE_URL}/changelog`, lastModified: CONTENT_UPDATED, changeFrequency: "weekly", priority: 0.5 },
    ...(CASE_STUDIES.length ? [{ url: `${SITE_URL}/case-studies`, lastModified: CONTENT_UPDATED, changeFrequency: "monthly" as const, priority: 0.7 }, ...group("case-studies", CASE_STUDIES)] : []),
    { url: `${SITE_URL}/security`, lastModified: CONTENT_UPDATED, changeFrequency: "monthly", priority: 0.7 },
    { url: `${SITE_URL}/trust`, lastModified: CONTENT_UPDATED, changeFrequency: "monthly", priority: 0.5 },
    { url: `${SITE_URL}/dpa`, lastModified: CONTENT_UPDATED, changeFrequency: "yearly", priority: 0.3 },
    { url: `${SITE_URL}/subprocessors`, lastModified: CONTENT_UPDATED, changeFrequency: "monthly", priority: 0.3 },
    { url: `${SITE_URL}/terms`, lastModified: LEGAL_UPDATED, changeFrequency: "yearly", priority: 0.3 },
    { url: `${SITE_URL}/privacy`, lastModified: LEGAL_UPDATED, changeFrequency: "yearly", priority: 0.3 },
  ]
}
