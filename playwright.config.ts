import { defineConfig } from "@playwright/test"

const PORT = Number(process.env.E2E_PORT ?? 3100)

// Smoke tests against the production build. Run `npm run build` first, then `npm run e2e`.
// Set PW_CHROMIUM_PATH to use an already-installed Chromium instead of the one Playwright downloads.
export default defineConfig({
  testDir: "./e2e",
  timeout: 30_000,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["list"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL: `http://localhost:${PORT}`,
    launchOptions: process.env.PW_CHROMIUM_PATH ? { executablePath: process.env.PW_CHROMIUM_PATH, args: ["--no-sandbox"] } : { args: ["--no-sandbox"] },
  },
  webServer: {
    command: `npx next start -p ${PORT}`,
    url: `http://localhost:${PORT}/api/health`,
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
})
