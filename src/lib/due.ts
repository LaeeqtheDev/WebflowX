import { format } from "date-fns"

// Due dates are saved as midnight UTC of the day the person picked (that's what a date input gives us).
// Show that same calendar day everywhere, whatever time zone the viewer is in.
export const dueAsLocalDate = (ms: number) => {
  const d = new Date(ms)
  return new Date(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate())
}

export const formatDue = (ms: number, pattern = "MMM d") => format(dueAsLocalDate(ms), pattern)

// Overdue means the whole due day has passed in UTC terms, which is what the saved value represents.
export const isPastDue = (ms: number, now: number) => ms + 24 * 60 * 60 * 1000 <= now
