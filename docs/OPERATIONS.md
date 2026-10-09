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
