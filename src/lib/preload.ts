// Warms the code-split chunks the workspace is about to need (message editor, message renderer, thread panel),
// once the browser is idle after first paint. They are lazy so the first screen stays light, but waiting for
// them on the first click made channels feel slow, especially on a long round trip to the servers.
let started = false
export const preloadWorkspaceChunks = () => {
  if (started || typeof window === "undefined") return
  started = true
  const conn = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection
  if (conn?.saveData) return
  const run = () => {
    void import("@/app/dashboard/workspace/[workspaceId]/components/Editor")
    void import("@/components/renderer")
    void import("@/app/dashboard/workspace/[workspaceId]/components/threads")
  }
  const ric = (window as Window & { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number }).requestIdleCallback
  if (ric) ric(run, { timeout: 4000 })
  else setTimeout(run, 2500)
}
