import { COMPARISONS, FEATURES, USE_CASES } from "@/lib/marketing-content"
import { SITE_URL } from "@/lib/site"

export const dynamic = "force-static"

export function GET() {
  const list = (base: string, items: { slug: string; name: string; description: string }[]) =>
    items.map((p) => `- [${p.name}](${SITE_URL}/${base}/${p.slug}): ${p.description}`).join("\n")
  const body = `# WebflowX

> WebflowX is a team workspace that combines chat, tasks, real-time documents, spreadsheets and databases, and video meetings with live transcripts and AI summaries. Plans are priced per workspace: Free $0, Startup $29, Growth $79, Enterprise $249 per month. Built by North Foundry.

## Features
${list("features", FEATURES)}

- [Templates](${SITE_URL}/templates): starter channels, tasks and notes for agencies, software teams, support, startups and remote teams.

## Use cases
${list("use-cases", USE_CASES)}

## Comparisons
${list("compare", COMPARISONS)}

## Company and policies
- [Security](${SITE_URL}/security): what is in place today and what is not available yet.
- [Trust and data location](${SITE_URL}/trust): SOC 2 status and roadmap, where data is stored.
- [Data Processing Agreement](${SITE_URL}/dpa)
- [Subprocessors](${SITE_URL}/subprocessors)
- [Privacy Policy](${SITE_URL}/privacy)
- [Terms of Service](${SITE_URL}/terms)
- Contact: hello@northfoundry.co
`
  return new Response(body, { headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "public, max-age=3600" } })
}
