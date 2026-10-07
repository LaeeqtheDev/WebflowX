import { httpRouter } from "convex/server";
import { auth } from "./auth";
import { httpAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { siteUrl } from "./emailLayout";

const http = httpRouter();

auth.addHttpRoutes(http);

// Calendar subscription: Google Calendar / Outlook / Apple Calendar poll this link for my task due dates.
const icsEscape = (s: string) => s.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n")
const fold = (line: string) => {
  const out: string[] = []
  let rest = line
  while (rest.length > 73) { out.push(rest.slice(0, 73)); rest = " " + rest.slice(73) }
  out.push(rest)
  return out.join("\r\n")
}
const ymd = (ms: number) => new Date(ms).toISOString().slice(0, 10).replace(/-/g, "")

http.route({
  path: "/calendar.ics",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    const token = new URL(request.url).searchParams.get("token") ?? ""
    if (!/^[a-f0-9]{48}$/.test(token)) return new Response("Not found", { status: 404 })
    const items = await ctx.runMutation(internal.calendar.feedData, { token })
    if (items === null) return new Response("Not found", { status: 404 })
    if (items === "limited") return new Response("Too many requests", { status: 429, headers: { "Retry-After": "3600" } })

    const stamp = new Date().toISOString().replace(/[-:]/g, "").slice(0, 15) + "Z"
    const lines = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//WebflowX//Tasks//EN", "CALSCALE:GREGORIAN", "METHOD:PUBLISH", "X-WR-CALNAME:WebflowX tasks", "REFRESH-INTERVAL;VALUE=DURATION:PT1H"]
    for (const it of items) {
      const start = ymd(it.dueDate)
      const end = ymd(it.dueDate + 24 * 60 * 60 * 1000)
      lines.push(
        "BEGIN:VEVENT",
        `UID:${it.id}@webflowx`,
        `DTSTAMP:${stamp}`,
        `DTSTART;VALUE=DATE:${start}`,
        `DTEND;VALUE=DATE:${end}`,
        `SUMMARY:${icsEscape(`${it.title} (${it.workspace})`)}`,
        `DESCRIPTION:${icsEscape(`Priority: ${it.priority}. Status: ${it.status.replace("_", " ")}.`)}`,
        `URL:${siteUrl()}/dashboard/workspace/${it.workspaceId}/tasks`,
        "TRANSP:TRANSPARENT",
        "END:VEVENT"
      )
    }
    lines.push("END:VCALENDAR")
    return new Response(lines.map(fold).join("\r\n") + "\r\n", {
      status: 200,
      headers: { "Content-Type": "text/calendar; charset=utf-8", "Cache-Control": "private, max-age=300" },
    })
  }),
})

export default http;
