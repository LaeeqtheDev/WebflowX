import { expect, test, type Page } from "@playwright/test"

// Signed-in checks against a real deployment. They need a real Convex backend and a throwaway account, so they
// are skipped unless these are set (never use a real person's login):
//   E2E_EMAIL / E2E_PASSWORD   an existing password account that already has a workspace with a #general channel
//   NEXT_PUBLIC_CONVEX_URL     the deployment the build was made against (set before `npm run build`)
// Run:  E2E_EMAIL=... E2E_PASSWORD=... npm run e2e -- signed-in
const EMAIL = process.env.E2E_EMAIL
const PASSWORD = process.env.E2E_PASSWORD
test.skip(!EMAIL || !PASSWORD, "set E2E_EMAIL and E2E_PASSWORD to run the signed-in flow")
test.describe.configure({ mode: "serial" })
test.setTimeout(90_000)

const IGNORED = [/speed-insights/, /fonts\.gstatic\.com/, /fonts\.googleapis\.com/, /Failed to load resource/]
const problems: string[] = []
let workspaceUrl = ""

async function signIn(page: Page) {
  await page.goto("/auth")
  await page.getByLabel("Email").fill(EMAIL!)
  await page.getByLabel("Password").fill(PASSWORD!)
  await page.getByRole("button", { name: "Continue" }).click()
  await page.waitForURL(/\/dashboard/, { timeout: 30_000 })
}

test.beforeEach(({ page }) => {
  problems.length = 0
  page.on("console", (m) => {
    const t = m.text()
    // a blocked inline script or style under the nonce CSP shows up here
    if ((m.type() === "error" || /Content Security Policy/i.test(t)) && !IGNORED.some((r) => r.test(t))) problems.push(t)
  })
  page.on("pageerror", (e) => problems.push(`pageerror: ${e.message}`))
})

test("signs in and reaches the workspace with no CSP or script errors", async ({ page }) => {
  await signIn(page)
  await page.waitForURL(/\/dashboard\/workspace\/[^/]+/, { timeout: 30_000 })
  workspaceUrl = new URL(page.url()).pathname.split("/").slice(0, 4).join("/")
  expect(workspaceUrl).toMatch(/^\/dashboard\/workspace\/.+/)
  await page.waitForLoadState("networkidle")
  expect(problems).toEqual([])
})

test("posts a message in #general and sees it in the list", async ({ page }) => {
  await signIn(page)
  await page.waitForURL(/\/dashboard\/workspace\/[^/]+/)
  await page.getByRole("link", { name: /general/ }).first().click()
  await page.waitForURL(/\/channel\//)
  const text = `e2e message ${Date.now()}`
  const editor = page.locator(".ql-editor").first()
  await editor.click()
  await page.keyboard.type(text)
  await page.keyboard.press("Enter")
  await expect(page.getByText(text).first()).toBeVisible({ timeout: 15_000 })
  expect(problems).toEqual([])
})

test("creates a task from the Tasks page", async ({ page }) => {
  await signIn(page)
  await page.waitForURL(/\/dashboard\/workspace\/[^/]+/)
  const base = new URL(page.url()).pathname.split("/").slice(0, 4).join("/")
  await page.goto(`${base}/tasks`)
  await page.getByRole("button", { name: /new task/i }).click()
  const title = `e2e task ${Date.now()}`
  await page.getByPlaceholder("What needs to be done?").fill(title)
  await page.getByRole("button", { name: "Create task" }).click()
  await expect(page.getByText(title).first()).toBeVisible({ timeout: 15_000 })
  expect(problems).toEqual([])
})

test("changing the theme in Appearance applies it before and after a reload", async ({ page }) => {
  await signIn(page)
  await page.waitForURL(/\/dashboard\/workspace\/[^/]+/)
  await page.locator("button:has([class*='ring-white/15'])").first().click()
  await page.getByRole("menuitem", { name: /More themes/ }).click()
  await page.getByRole("radio", { name: /^Onyx/ }).click()
  await expect(page.locator("html")).toHaveAttribute("data-theme", "onyx")
  await expect(page.locator("html")).toHaveClass(/dark/)
  await page.reload()
  await expect(page.locator("html")).toHaveAttribute("data-theme", "onyx")
  // put the account back to following the computer
  await page.locator("button:has([class*='ring-white/15'])").first().click()
  await page.getByRole("menuitem", { name: /More themes/ }).click()
  await page.getByRole("radio", { name: /Sync with computer/ }).click()
  expect(problems).toEqual([])
})
