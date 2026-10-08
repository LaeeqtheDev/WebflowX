import { httpRouter } from "convex/server";
import { auth } from "./auth";
import { httpAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { siteUrl } from "./emailLayout";
import { sha256Hex, hmacHex, githubMessage, plainToDelta } from "./integrations";
import { ActionCtx } from "./_generated/server";

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

// ---------------------------------------------------------------------------------------------
// Integrations: incoming webhooks, GitHub, and the public REST API (Bearer wfx_... keys).
// ---------------------------------------------------------------------------------------------

const json = (data: unknown, status = 200, headers: Record<string, string> = {}) =>
  new Response(JSON.stringify(data), { status, headers: { "Content-Type": "application/json", ...headers } })

const deny = (status: "invalid" | "plan" | "limited" | "twofactor") =>
  status === "twofactor" ? json({ error: "This workspace requires two-step verification, and the person who created this credential hasn't turned it on." }, 403)
  : status === "limited" ? json({ error: "Too many requests. Slow down." }, 429, { "Retry-After": "60" })
  : status === "plan" ? json({ error: "This feature isn't included in the workspace's current plan." }, 403)
  : json({ error: "Invalid or revoked credentials." }, 401)

const MAX_BODY = 100_000
const readJson = async (request: Request): Promise<{ ok: true; data: Record<string, unknown> } | { ok: false; res: Response }> => {
  const raw = await request.text()
  if (raw.length > MAX_BODY) return { ok: false, res: json({ error: "Body too large" }, 413) }
  try {
    const data = JSON.parse(raw)
    if (!data || typeof data !== "object" || Array.isArray(data)) throw new Error("not an object")
    return { ok: true, data }
  } catch {
    return { ok: false, res: json({ error: "Send a JSON object" }, 400) }
  }
}

const tokenFromPath = (request: Request, prefix: string) => {
  const t = new URL(request.url).pathname.slice(prefix.length).replace(/\/+$/, "")
  return /^[a-f0-9]{48}$/.test(t) ? t : null
}

// POST /hooks/incoming/<token>   body: { "text": "..." }
http.route({
  pathPrefix: "/hooks/incoming/",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const token = tokenFromPath(request, "/hooks/incoming/")
    if (!token) return json({ error: "Not found" }, 404)
    const a = await ctx.runMutation(internal.integrations.authenticate, { tokenHash: await sha256Hex(token), kind: "incoming" })
    if (a.status !== "ok") return deny(a.status)
    const body = await readJson(request)
    if (!body.ok) return body.res
    const t = body.data.text ?? body.data.content ?? body.data.message
    if (typeof t !== "string" || !t.trim()) return json({ error: "text is required" }, 400)
    if (t.length > 4000) return json({ error: "text is too long (max 4000 characters)" }, 400)
    const r = await ctx.runMutation(internal.integrations.postMessage, { id: a.id, body: plainToDelta(t.trim()) })
    return "error" in r ? json({ error: r.error }, 400) : json({ ok: true, id: r.id })
  }),
})

// POST /hooks/github/<token>   (GitHub signs the body with the secret shown when you set it up)
http.route({
  pathPrefix: "/hooks/github/",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const token = tokenFromPath(request, "/hooks/github/")
    if (!token) return json({ error: "Not found" }, 404)
    const a = await ctx.runMutation(internal.integrations.authenticate, { tokenHash: await sha256Hex(token), kind: "github" })
    if (a.status !== "ok") return deny(a.status)
    const raw = await request.text()
    if (raw.length > 1_000_000) return json({ error: "Body too large" }, 413)
    const sig = request.headers.get("x-hub-signature-256") ?? ""
    const expected = `sha256=${await hmacHex(a.secret ?? "", raw)}`
    // compare without bailing out early
    let diff = sig.length ^ expected.length
    for (let i = 0; i < expected.length; i++) diff |= (sig.charCodeAt(i) || 0) ^ expected.charCodeAt(i)
    if (diff !== 0) return json({ error: "Signature doesn't match. Check the secret in GitHub." }, 401)
    let payload: unknown
    try { payload = JSON.parse(raw) } catch { return json({ error: "Send JSON (set the content type to application/json)" }, 400) }
    const body = githubMessage(request.headers.get("x-github-event") ?? "", payload)
    if (!body) return json({ ok: true, skipped: true })
    const r = await ctx.runMutation(internal.integrations.postMessage, { id: a.id, body })
    return "error" in r ? json({ error: r.error }, 400) : json({ ok: true })
  }),
})

// ---- REST API v1 ----

const withKey = async (ctx: ActionCtx, request: Request) => {
  const m = /^Bearer (wfx_[a-f0-9]{48})$/.exec(request.headers.get("authorization") ?? "")
  if (!m) return json({ error: "Send your key as: Authorization: Bearer wfx_..." }, 401)
  const a = await ctx.runMutation(internal.integrations.authenticate, { tokenHash: await sha256Hex(m[1]), kind: "apiKey" })
  if (a.status !== "ok") return deny(a.status)
  return { id: a.id }
}

http.route({
  path: "/api/v1/channels",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    const k = await withKey(ctx, request)
    if (k instanceof Response) return k
    return json({ channels: await ctx.runQuery(internal.integrations.apiChannels, { id: k.id }) })
  }),
})

http.route({
  path: "/api/v1/members",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    const k = await withKey(ctx, request)
    if (k instanceof Response) return k
    return json({ members: await ctx.runQuery(internal.integrations.apiMembers, { id: k.id }) })
  }),
})

http.route({
  path: "/api/v1/messages",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    const k = await withKey(ctx, request)
    if (k instanceof Response) return k
    const u = new URL(request.url)
    const channelId = u.searchParams.get("channelId") ?? ""
    const limit = Math.min(50, Math.max(1, parseInt(u.searchParams.get("limit") ?? "20", 10) || 20))
    let out
    try {
      // @ts-expect-error channelId is checked by Convex; a bad id is reported as 400 below
      out = await ctx.runQuery(internal.integrations.apiMessages, { id: k.id, channelId, limit })
    } catch {
      return json({ error: "channelId is invalid" }, 400)
    }
    if (out === null) return json({ error: "Channel not found" }, 404)
    return json({ messages: out })
  }),
})

http.route({
  path: "/api/v1/messages",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const k = await withKey(ctx, request)
    if (k instanceof Response) return k
    const body = await readJson(request)
    if (!body.ok) return body.res
    const { channelId, text } = body.data
    if (typeof channelId !== "string") return json({ error: "channelId is required" }, 400)
    if (typeof text !== "string" || !text.trim()) return json({ error: "text is required" }, 400)
    if (text.length > 4000) return json({ error: "text is too long (max 4000 characters)" }, 400)
    let r
    try {
      // @ts-expect-error channelId is checked by Convex; a bad id is reported as 400 below
      r = await ctx.runMutation(internal.integrations.postMessage, { id: k.id, channelId, body: plainToDelta(text.trim()) })
    } catch {
      return json({ error: "channelId is invalid" }, 400)
    }
    return "error" in r ? json({ error: r.error }, r.error === "Channel not found" ? 404 : 400) : json({ id: r.id }, 201)
  }),
})

http.route({
  path: "/api/v1/tasks",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    const k = await withKey(ctx, request)
    if (k instanceof Response) return k
    const status = new URL(request.url).searchParams.get("status") ?? undefined
    return json({ tasks: await ctx.runQuery(internal.integrations.apiTasks, { id: k.id, status }) })
  }),
})

http.route({
  path: "/api/v1/tasks",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const k = await withKey(ctx, request)
    if (k instanceof Response) return k
    const body = await readJson(request)
    if (!body.ok) return body.res
    const d = body.data
    const str = (x: unknown) => (typeof x === "string" ? x : undefined)
    if (typeof d.title !== "string") return json({ error: "title is required" }, 400)
    const r = await ctx.runMutation(internal.integrations.apiCreateTask, {
      id: k.id, title: d.title, description: str(d.description), status: str(d.status),
      priority: str(d.priority), assigneeId: str(d.assigneeId), dueDate: str(d.dueDate),
    })
    return "error" in r ? json({ error: r.error }, 400) : json({ id: r.id }, 201)
  }),
})

export default http;
