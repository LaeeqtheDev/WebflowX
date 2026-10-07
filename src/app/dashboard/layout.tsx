import { ThemeSync } from "@/components/theme/theme-sync"

// Everything under /dashboard is the signed-in app, the only part of the site that has a dark theme.
export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <ThemeSync />
      {children}
    </>
  )
}
