import type { MetadataRoute } from "next"
import { SITE_URL } from "@/lib/site"

const PUBLIC = ["/", "/features", "/use-cases", "/compare", "/security", "/changelog", "/case-studies", "/terms", "/privacy"]
const PRIVATE = ["/dashboard", "/api", "/join", "/auth", "/newsletter"]

// Search and AI crawlers are named explicitly so the policy is visible and does not depend on the wildcard.
const CRAWLERS = ["Googlebot", "Bingbot", "OAI-SearchBot", "GPTBot", "ChatGPT-User", "ClaudeBot", "Claude-SearchBot", "PerplexityBot", "Google-Extended"]

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      ...CRAWLERS.map((userAgent) => ({ userAgent, allow: PUBLIC, disallow: PRIVATE })),
      { userAgent: "*", allow: PUBLIC, disallow: PRIVATE },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  }
}
