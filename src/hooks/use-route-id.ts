"use client"
import { useParams, usePathname } from "next/navigation"

// Ids are read from the address itself, not from Next's route params. That lets the app switch channels in the browser
// (see lib/soft-nav.ts) without asking the server for a new page: the params would still describe the old channel.
export const useRouteId = (segment: "workspace" | "channel" | "member", param: string): string => {
  const pathname = usePathname()
  const params = useParams()
  const m = new RegExp(`/${segment}/([^/?#]+)`).exec(pathname ?? "")
  return m?.[1] ?? (params[param] as string)
}
