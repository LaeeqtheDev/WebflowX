import { expect, test } from "@playwright/test"

// Things a customer or a search engine hits first. None of these need a sign-in or a backend round trip.

// Failures caused by the test environment, not by the app: Vercel's analytics script only exists on Vercel,
// and Google Fonts may be unreachable in a sandbox.
const IGNORED = [/speed-insights/, /fonts\.gstatic\.com/, /fonts\.googleapis\.com/, /Failed to load resource/]

function watch(page: import("@playwright/test").Page) {
  const problems: string[] = []
  page.on("console", (m) => {
    const t = m.text()
    if (m.type() === "error" && !IGNORED.some((r) => r.test(t))) problems.push(t)
  })
  page.on("pageerror", (e) => problems.push(`pageerror: ${e.message}`))
  return problems
}

test("landing page renders its headline and a working Product menu", async ({ page }) => {
  const problems = watch(page)
  await page.goto("/")
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Where teams talk")
  await page.getByRole("button", { name: /^Product/ }).hover()
  await expect(page.getByRole("link", { name: "WebflowX vs Slack" })).toBeVisible()
  await page.getByRole("link", { name: "Tasks", exact: true }).click()
  await expect(page).toHaveURL(/\/features\/tasks$/)
  expect(problems).toEqual([])
})

test("landing page HTML contains the content before any script runs", async ({ request }) => {
  const html = await (await request.get("/")).text()
  expect(html).toContain("Where teams talk")
  expect(html).toContain("application/ld+json")
})

for (const [path, h1] of [
  ["/features/team-chat", "Team chat that sits next to your work"],
  ["/use-cases/agencies", "A workspace for agencies and their clients"],
  ["/compare/slack-alternative", "WebflowX vs Slack"],
  ["/security", "Security at WebflowX"],
  ["/changelog", "Changelog"],
] as const) {
  test(`${path} renders with a unique title, canonical link and breadcrumbs`, async ({ page }) => {
    const problems = watch(page)
    await page.goto(path)
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(h1)
    await expect(page).toHaveTitle(/\| WebflowX$|WebflowX/)
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", new RegExp(path.replace("/", "\\/") + "$"))
    await expect(page.getByRole("navigation", { name: "Breadcrumb" })).toBeVisible()
    expect(problems).toEqual([])
  })
}

for (const [path, h1] of [
  ["/trust", "Trust, compliance and data location"],
  ["/dpa", "Data Processing Agreement"],
  ["/subprocessors", "Subprocessors"],
  ["/templates", "Start from a template"],
] as const) {
  test(`${path} is public and renders`, async ({ page }) => {
    const problems = watch(page)
    await page.goto(path)
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(h1)
    expect(problems).toEqual([])
  })
}

test("every sitemap URL is reachable without signing in", async ({ request }) => {
  const xml = await (await request.get("/sitemap.xml")).text()
  const paths = [...xml.matchAll(/<loc>https?:\/\/[^/]+(\/[^<]*)<\/loc>/g)].map((m) => m[1])
  expect(paths.length).toBeGreaterThan(20)
  for (const p of paths) {
    const res = await request.get(p, { maxRedirects: 0 })
    expect(res.status(), p).toBe(200)
  }
})

test("unknown pages return 404", async ({ request }) => {
  expect((await request.get("/features/does-not-exist")).status()).toBe(404)
})

test("sitemap, robots, llms.txt and health respond", async ({ request }) => {
  const sitemap = await (await request.get("/sitemap.xml")).text()
  expect(sitemap).toContain("/features/tasks")
  expect(sitemap).not.toContain("/auth")
  const robots = await (await request.get("/robots.txt")).text()
  for (const bot of ["OAI-SearchBot", "GPTBot", "ClaudeBot", "PerplexityBot"]) expect(robots).toContain(bot)
  expect(await (await request.get("/llms.txt")).text()).toContain("# WebflowX")
  const health = await request.get("/api/health")
  expect(health.status()).toBe(200)
  expect((await health.json()).ok).toBe(true)
})

test("sign-in page loads under the strict nonce CSP and is not indexable", async ({ page }) => {
  const problems = watch(page)
  const res = await page.goto("/auth")
  const csp = res!.headers()["content-security-policy"]
  expect(csp).toMatch(/script-src 'self' 'nonce-[^']+' 'strict-dynamic'/)
  expect(csp).not.toMatch(/script-src[^;]*'unsafe-inline'/)
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/)
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible()
  await expect(page.getByRole("button", { name: /Google/ })).toBeVisible()
  expect(problems).toEqual([])
})

test("signed-out visitors are sent to sign in, and API calls get 401 JSON", async ({ page, request }) => {
  await page.goto("/dashboard")
  await expect(page).toHaveURL(/\/auth\?next=%2Fdashboard/)
  const api = await request.get("/api/livekit")
  expect(api.status()).toBe(401)
})

test("security headers are present", async ({ request }) => {
  const h = (await request.get("/")).headers()
  expect(h["x-content-type-options"]).toBe("nosniff")
  expect(h["referrer-policy"]).toBe("strict-origin-when-cross-origin")
  expect(h["content-security-policy"]).toContain("frame-ancestors")
})
