import { cronJobs } from "convex/server"
import { internal } from "./_generated/api"

const crons = cronJobs()

// Calls where everyone closed the tab without leaving would otherwise stay "live" forever.
crons.interval("end one-to-one calls at 15 minutes", { minutes: 1 }, internal.meetings.endOverTime)
crons.interval("end stale meetings", { hours: 1 }, internal.meetings.endStale)

// Uploads that never ended up attached to a message are removed after a day.
crons.interval("clean unattached uploads", { hours: 6 }, internal.files.cleanupUnattached)

// Uploads that were never registered are removed after an hour.
crons.interval("sweep orphan uploads", { hours: 1 }, internal.files.sweepOrphans, {})

// Expired rate-limit windows are cleared out daily.
crons.interval("prune rate limits", { hours: 6 }, internal.rateLimit.prune)

// Unconfirmed newsletter sign-ups are dropped after 7 days.
crons.interval("prune pending newsletter signups", { hours: 24 }, internal.newsletter.prunePending)

// "Someone is typing" markers older than a minute are removed.
crons.interval("prune typing markers", { hours: 1 }, internal.typing.prune)

// Two-step "passed" marks for sign-in sessions that are long gone.
crons.interval("prune two-step session marks", { hours: 24 }, internal.twoFactor.pruneSessions)

// Remind people about tasks due within a day (once per deadline).
crons.interval("task due reminders", { hours: 1 }, internal.calendar.sendDueReminders)

// Pages left in the trash for 30 days are erased.
crons.interval("empty old trash", { hours: 24 }, internal.docs.purgeExpired)

// Messages and reactions from people who left a Free workspace are erased 90 days after they left.
crons.interval("erase expired content of removed members", { hours: 24 }, internal.retention.purgeExpired)

export default crons
