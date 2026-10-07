import { cronJobs } from "convex/server"
import { internal } from "./_generated/api"

const crons = cronJobs()

// Calls where everyone closed the tab without leaving would otherwise stay "live" forever.
crons.interval("end stale meetings", { hours: 1 }, internal.meetings.endStale)

// Uploads that never ended up attached to a message are removed after a day.
crons.interval("clean unattached uploads", { hours: 6 }, internal.files.cleanupUnattached)

// Uploads that were never registered are removed after an hour.
crons.interval("sweep orphan uploads", { hours: 1 }, internal.files.sweepOrphans)

// Expired rate-limit windows are cleared out daily.
crons.interval("prune rate limits", { hours: 6 }, internal.rateLimit.prune)

// Unconfirmed newsletter sign-ups are dropped after 7 days.
crons.interval("prune pending newsletter signups", { hours: 24 }, internal.newsletter.prunePending)

export default crons
