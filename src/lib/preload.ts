// Warms the code-split chunks the workspace is about to need (message editor, message renderer, thread panel),
// once the browser is idle after first paint. They are lazy so the first screen stays light, but waiting for
// them on the first click made channels feel slow, especially on a long round trip to the servers.
import { isLowData } from "@/lib/network"

let started = false
export const preloadWorkspaceChunks = () => {
  if (started || typeof window === "undefined") return
  started = true
  const conn = (navigator as Navigator & { connection?: { saveData?: boolean; effectiveType?: string; downlink?: number } }).connection
  // Warming ~300 KB of chunks helps on a good link and competes with what the person is waiting for on a bad one.
  if (isLowData(conn) || conn?.effectiveType === "3g") return
  const run = () => {
    void import("@/app/dashboard/workspace/[workspaceId]/components/Editor")
    void import("@/components/renderer")
    void import("@/app/dashboard/workspace/[workspaceId]/components/threads")
  }
  const ric = (window as Window & { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number }).requestIdleCallback
  if (ric) ric(run, { timeout: 4000 })
  else setTimeout(run, 2500)
}
