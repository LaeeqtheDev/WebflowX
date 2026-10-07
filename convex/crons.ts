import { cronJobs } from "convex/server"
import { internal } from "./_generated/api"

const crons = cronJobs()

// Calls where everyone closed the tab without leaving would otherwise stay "live" forever.
crons.interval("end stale meetings", { hours: 1 }, internal.meetings.endStale)

export default crons
