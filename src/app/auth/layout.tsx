import { AppProviders } from "@/components/AppProviders"

export default function Layout({ children }: { children: React.ReactNode }) {
  return <AppProviders>{children}</AppProviders>
}
