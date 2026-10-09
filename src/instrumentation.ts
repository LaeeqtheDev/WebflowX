import type { Instrumentation } from "next"
import { reportError } from "@/lib/report-error"

// Next.js calls this for every uncaught server error (pages, route handlers, server actions).
export const onRequestError: Instrumentation.onRequestError = async (err, request) => {
  await reportError("server", err, { path: request.path, method: request.method })
}
