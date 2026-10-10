# Operations notes

Settings added with the audit work. Everything is optional; nothing breaks if unset.

| Where | Name | What it does |
| --- | --- | --- |
| Vercel env | `ERROR_WEBHOOK_URL` | Slack/Discord/any JSON webhook. Receives server and browser crash reports. |
| Vercel env | `CSP_CONNECT_EXTRA` | Space-separated extra origins allowed in the CSP `connect-src` (add any new vendor here first). |
| Vercel env | `NEXT_PUBLIC_MICROSOFT_SIGNIN=1` | Shows the Microsoft button on the sign-in and sign-up cards. |
| Convex env | `AUTH_MICROSOFT_ENTRA_ID_ID`, `_SECRET`, `_ISSUER` | Turns on the Microsoft provider. Redirect URI: `<convex site url>/api/auth/callback/microsoft-entra-id`. |
| GitHub repo variable | `SITE_URL` | Used by the Uptime check workflow, which calls `/api/health` every 15 minutes. A failed run emails the repo owner. |

Tests: `npm test` (Vitest). They run in CI together with type checks and lint.

After pulling this change run `npx convex dev --once` (or `npx convex deploy` for production): two indexes were added (`meetings.by_workspace_started`, `newsletterSubscribers.by_status`).

## Content Security Policy
- `/dashboard`, `/auth` and `/join` get a strict policy from `src/middleware.ts`: scripts need this request's nonce (`'strict-dynamic'`), so injected inline script cannot run.
- Public marketing pages are static (no per-request nonce is possible), so they use the looser policy in `next.config.ts` that still allows inline scripts. They hold no user content.
- Styles still allow `'unsafe-inline'` (React and the editor set inline styles).
- The dark-mode boot script is `public/theme-boot.js`, loaded with a nonce from the dashboard layout.

## Importers
Settings, Import (owners and admins). Slack: public channels from a standard export zip. Notion: Markdown & CSV export zip, imported as workspace notes. Parsers are in `src/lib/import` with tests.

## Case studies
`CASE_STUDIES` in `src/lib/marketing-content.ts` is empty on purpose. Add an entry only with client approval and real figures; until then `/case-studies` is noindex and out of the sitemap.

## Tests
- `npm test`: Vitest. Pure logic (permissions, limits, importers, content) plus Convex message flows, plan limits and leaving a workspace, run against an in-memory Convex (`convex-test`).
- `npm run e2e`: Playwright smoke tests against the production build (public pages, SEO files, sign-in page under the nonce CSP, redirects). Build first. Set `PW_CHROMIUM_PATH` to reuse an installed Chromium.
- Not covered yet: a signed-in browser flow (sign in, send a message, create a task). That needs a dedicated test deployment and test account.

## Leaving a workspace
A person's channel messages and reactions stay, shown as "Name (former member)". Free plan: erased 90 days after they left (daily job). Paid plans keep them, matching full history. Direct messages are removed on leaving. Rules live in `removedContentDays` (`convex/limits.ts`).
