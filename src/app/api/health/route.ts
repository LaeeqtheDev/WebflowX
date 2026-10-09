// Public and cheap on purpose: uptime monitors call this. It confirms the web app is serving requests.
export const dynamic = "force-dynamic"

export function GET() {
  return Response.json({ ok: true, service: "webflowx-web", time: new Date().toISOString() }, { headers: { "cache-control": "no-store" } })
}
