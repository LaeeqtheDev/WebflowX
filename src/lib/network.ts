// Helpers for working on a bad connection: what state the link is in, whether to save data, and uploads that
// report progress, give up when they stall, and say so clearly.

export type LinkStatus = "online" | "reconnecting" | "offline"

/** How long the live connection must be down before we tell the person (short drops are normal and invisible). */
export const RECONNECT_GRACE_MS = 3000

export const linkStatus = (s: { browserOnline: boolean; socketConnected: boolean; hasEverConnected: boolean; socketDownMs: number }): LinkStatus => {
  if (!s.browserOnline) return "offline"
  if (s.hasEverConnected && !s.socketConnected && s.socketDownMs >= RECONNECT_GRACE_MS) return "reconnecting"
  return "online"
}

export type DataSaverPref = "auto" | "on" | "off"
export const DATA_SAVER_KEY = "wfx-datasaver"

type Conn = { saveData?: boolean; effectiveType?: string; downlink?: number } | undefined

/** True when the browser asks for less data, or the connection is very slow. An explicit On/Off from the person wins. */
export const isLowData = (conn: Conn, pref: DataSaverPref = "auto"): boolean => {
  if (pref === "on") return true
  if (pref === "off") return false
  if (!conn) return false
  if (conn.saveData) return true
  if (conn.effectiveType === "slow-2g" || conn.effectiveType === "2g") return true
  return typeof conn.downlink === "number" && conn.downlink > 0 && conn.downlink < 0.7
}

export const isDataSaverPref = (v: unknown): v is DataSaverPref => v === "auto" || v === "on" || v === "off"

/** Wait before try number `attempt` (0 = first retry): 1s, 2s, 4s, capped at 8s. */
export const retryDelay = (attempt: number) => Math.min(1000 * 2 ** attempt, 8000)

/** An error the person can fix by trying again once the connection is better. Its message is safe to show. */
export class NetworkError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "NetworkError"
  }
}

export type UploadProgress = { loaded: number; total: number }

/**
 * POSTs a file with progress. Gives up when nothing has moved for `stallMs` (a stalled upload on a weak
 * connection otherwise hangs for minutes) and throws NetworkError so callers can offer a retry.
 */
export const postFile = (url: string, file: File, opts: { onProgress?: (p: UploadProgress) => void; stallMs?: number } = {}): Promise<{ storageId: string }> =>
  new Promise((resolve, reject) => {
    const stallMs = opts.stallMs ?? 20_000
    const xhr = new XMLHttpRequest()
    let timer: ReturnType<typeof setTimeout>
    const arm = () => {
      clearTimeout(timer)
      timer = setTimeout(() => { xhr.abort(); reject(new NetworkError("The upload stalled. Check your connection and try again.")) }, stallMs)
    }
    xhr.open("POST", url)
    xhr.setRequestHeader("Content-Type", file.type || "application/octet-stream")
    xhr.upload.onprogress = (e) => {
      arm()
      if (e.lengthComputable) opts.onProgress?.({ loaded: e.loaded, total: e.total })
    }
    xhr.onload = () => {
      clearTimeout(timer)
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const body = JSON.parse(xhr.responseText) as { storageId?: string }
          if (body.storageId) return resolve({ storageId: body.storageId })
        } catch { /* falls through */ }
        return reject(new Error("The upload finished but the server's answer wasn't understood. Please try again."))
      }
      // 4xx is a real refusal (too big, not allowed); 5xx and odd statuses are worth another try
      reject(xhr.status >= 400 && xhr.status < 500 ? new Error("That file was refused. Check its type and size.") : new NetworkError("The upload didn't go through. Please try again."))
    }
    xhr.onerror = () => { clearTimeout(timer); reject(new NetworkError("Couldn't reach the server. Check your connection and try again.")) }
    xhr.onabort = () => clearTimeout(timer)
    arm()
    xhr.send(file)
  })

/** Runs `fn` again after a pause when it throws NetworkError, up to `retries` extra times. Other errors stop at once. */
export const withRetry = async <T,>(fn: () => Promise<T>, retries = 2, sleep: (ms: number) => Promise<void> = (ms) => new Promise((r) => setTimeout(r, ms))): Promise<T> => {
  for (let attempt = 0; ; attempt++) {
    try {
      return await fn()
    } catch (e) {
      if (!(e instanceof NetworkError) || attempt >= retries) throw e
      await sleep(retryDelay(attempt))
    }
  }
}

// ---- unsent text ----

const DRAFT_PREFIX = "wfx:draft:"
export type DraftOps = { insert: unknown; attributes?: unknown }[]

export const loadDraft = (key: string): DraftOps | null => {
  try {
    const raw = window.localStorage.getItem(DRAFT_PREFIX + key)
    if (!raw) return null
    const ops = (JSON.parse(raw) as { ops?: DraftOps }).ops
    return Array.isArray(ops) && ops.length > 0 ? ops : null
  } catch { return null }
}

/** Saves what is typed (a Quill delta), or removes the draft when it is empty. */
export const saveDraft = (key: string, delta: { ops?: DraftOps }, isEmpty: boolean) => {
  try {
    if (isEmpty || !delta.ops?.length) window.localStorage.removeItem(DRAFT_PREFIX + key)
    else window.localStorage.setItem(DRAFT_PREFIX + key, JSON.stringify({ ops: delta.ops }))
  } catch { /* private mode or full storage: the draft just isn't kept */ }
}

export const clearDraft = (key: string) => { try { window.localStorage.removeItem(DRAFT_PREFIX + key) } catch { /* ignore */ } }

/** Drafts belong to the person who typed them, so they are removed when they sign out. */
export const clearAllDrafts = () => {
  try {
    for (const k of Object.keys(window.localStorage)) if (k.startsWith(DRAFT_PREFIX)) window.localStorage.removeItem(k)
  } catch { /* ignore */ }
}
