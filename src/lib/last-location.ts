// Remembers the last channel someone had open so opening the app can go straight there. Without it, /dashboard waits
// for the workspace list, then the workspace page waits for three more queries, and only then the channel starts to
// load: three round trips in a row before any message appears, painful on a slow connection.
const KEY = "wfx:last-path"
const SHAPE = /^\/dashboard\/workspace\/[A-Za-z0-9]+\/channel\/[A-Za-z0-9]+$/

export const rememberLocation = (path: string) => {
  if (!SHAPE.test(path)) return
  try { window.localStorage.setItem(KEY, path) } catch { /* private mode */ }
}

export const lastLocation = (): string | null => {
  try {
    const v = window.localStorage.getItem(KEY)
    return v && SHAPE.test(v) ? v : null
  } catch { return null }
}

export const forgetLocation = () => {
  try { window.localStorage.removeItem(KEY) } catch { /* private mode */ }
}
