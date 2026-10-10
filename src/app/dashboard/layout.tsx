import { headers } from "next/headers"
import { preconnect } from "react-dom"
import { AppProviders } from "@/components/AppProviders"
import { ThemeSync } from "@/components/theme/theme-sync"
import { TwoFactorGate } from "@/features/security/two-factor-gate"
import { PwaRegister } from "@/features/push/pwa-register"

// Everything under /dashboard is the signed-in app, the only part of the site that has a dark theme.
// Someone with two-step verification on sees only the code screen until they pass it.
export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  // The dark-mode script must run before the page paints. It is a file (not inline) and carries this request's CSP nonce.
  // Open the connection to the database while the page is still downloading, so the first query isn't also waiting
  // on DNS and TLS (several round trips from far away).
  if (process.env.NEXT_PUBLIC_CONVEX_URL) preconnect(process.env.NEXT_PUBLIC_CONVEX_URL)
  const nonce = (await headers()).get("x-nonce") ?? undefined
  return (
    <AppProviders>
      {/* eslint-disable-next-line @next/next/no-sync-scripts */}
      <script src="/theme-boot.js" nonce={nonce} />
      <ThemeSync />
      <PwaRegister />
      <TwoFactorGate>{children}</TwoFactorGate>
    </AppProviders>
  )
}
