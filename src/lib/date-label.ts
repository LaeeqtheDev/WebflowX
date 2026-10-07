import { format } from "date-fns"

const pad = (n: number) => String(n).padStart(2, "0")

/**
 * Local calendar-day key ("YYYY-MM-DD") for a timestamp, in the viewer's timezone.
 * Use this to group messages by day.
 */
export const dayKey = (ts: number | Date): string => {
  const d = typeof ts === "number" ? new Date(ts) : ts
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

/**
 * Parse a "YYYY-MM-DD" key as a LOCAL date (noon, so DST shifts can never move it to another day).
 * `new Date("2026-10-06")` would be parsed as UTC midnight, which is the previous evening in any
 * timezone behind UTC, and that is what made "Today" show as "Yesterday" for US users.
 */
const parseDayKey = (key: string): Date => {
  const [y, m, d] = key.split("-").map(Number)
  return new Date(y, (m ?? 1) - 1, d ?? 1, 12, 0, 0, 0)
}

/** "Today", "Yesterday", or "Monday, October 6th" (with the year when it is not the current year). */
export const formatDayLabel = (key: string, now: number | Date = new Date()): string => {
  const today = typeof now === "number" ? new Date(now) : now
  if (key === dayKey(today)) return "Today"

  const yesterday = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1, 12)
  if (key === dayKey(yesterday)) return "Yesterday"

  const date = parseDayKey(key)
  return format(date, date.getFullYear() === today.getFullYear() ? "EEEE, MMMM do" : "EEEE, MMMM do, yyyy")
}
