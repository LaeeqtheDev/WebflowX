import { ThemeSync } from "@/components/theme/theme-sync"
import { TwoFactorGate } from "@/features/security/two-factor-gate"
import { PwaRegister } from "@/features/push/pwa-register"

// Everything under /dashboard is the signed-in app, the only part of the site that has a dark theme.
// Someone with two-step verification on sees only the code screen until they pass it.
export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <ThemeSync />
      <PwaRegister />
      <TwoFactorGate>{children}</TwoFactorGate>
    </>
  )
}
