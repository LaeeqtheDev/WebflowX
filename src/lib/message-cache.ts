// The last messages seen in each channel or conversation, kept in memory only. Coming back to one shows these at once
// while the live list is fetched (a round trip to the server, ~300 ms from far away), then the live list takes over.
// Nothing is written to disk, and a reload or sign-out clears it.
const MAX = 25
const seen = new Map<string, unknown[]>()

export const rememberMessages = <T,>(key: string, rows: T[]) => {
  if (!rows.length) return
  seen.delete(key)
  seen.set(key, rows)
  if (seen.size > MAX) seen.delete(seen.keys().next().value as string)
}

export const recallMessages = <T,>(key: string): T[] | undefined => seen.get(key) as T[] | undefined
