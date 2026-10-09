/**
 * Sends a crash report to ERROR_WEBHOOK_URL (a Slack, Discord or any JSON-accepting webhook) when it is set.
 * Does nothing without it, so it is safe in every environment. Never throws.
 */
export async function reportError(where: string, err: unknown, extra?: Record<string, unknown>) {
  const url = process.env.ERROR_WEBHOOK_URL
  if (!url) return
  const e = err instanceof Error ? err : new Error(String(err))
  const text = `WebflowX error in ${where}: ${e.message}`.slice(0, 500)
  const body = { text, content: text, where, message: e.message.slice(0, 500), stack: e.stack?.slice(0, 1500), ...extra }
  try {
    await fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body), signal: AbortSignal.timeout(4000) })
  } catch {
    // reporting must never cause another error
  }
}
