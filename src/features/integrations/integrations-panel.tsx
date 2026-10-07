"use client"
import { useState } from "react"
import { useMutation, useQuery } from "convex/react"
import { Copy, Loader, Plus, Trash2 } from "lucide-react"
import { toast } from "sonner"
import { api } from "../../../convex/_generated/api"
import { Id } from "../../../convex/_generated/dataModel"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useLimitHandler } from "@/hooks/use-limit-handler"
import { cleanChannelName } from "@/app/dashboard/workspace/[workspaceId]/components/channel-icon"

type Kind = "apiKey" | "incoming" | "github" | "outgoing"

const EVENTS = [
  { id: "message.created", label: "Message posted" },
  { id: "task.created", label: "Task created" },
  { id: "task.completed", label: "Task completed" },
]

const SECTIONS: { kind: Kind; title: string; blurb: string; button: string }[] = [
  { kind: "apiKey", title: "API keys", button: "New API key", blurb: "Let your own scripts, Zapier or Make read channels and tasks, post messages and create tasks. Keep keys secret: they act as the person who made them." },
  { kind: "incoming", title: "Incoming webhooks", button: "New incoming webhook", blurb: "A private web address that posts into one channel. Point any tool at it to send alerts and updates." },
  { kind: "github", title: "GitHub", button: "Connect a repository", blurb: "Pushes, pull requests, issues, releases and failed builds appear in a channel." },
  { kind: "outgoing", title: "Outgoing webhooks", button: "New outgoing webhook", blurb: "We send an event to your address when something happens. This is how Zapier (Webhooks by Zapier → Catch Hook) and Make (Custom webhook) listen to WebflowX." },
]

const copy = async (text: string) => {
  try { await navigator.clipboard.writeText(text); toast.success("Copied") } catch { toast.error("Couldn't copy. Select it and copy by hand.") }
}

const Secret = ({ label, value }: { label: string; value: string }) => (
  <div className="flex flex-col gap-1">
    <p className="text-xs font-semibold text-ink/65">{label}</p>
    <div className="flex gap-2">
      <code className="flex-1 min-w-0 truncate rounded-lg bg-cream px-2.5 py-2 text-xs text-ink border border-plum/10">{value}</code>
      <Button size="sm" variant="outline" className="rounded-lg shrink-0" onClick={() => copy(value)}><Copy className="size-3.5" /></Button>
    </div>
  </div>
)

export const IntegrationsPanel = ({ workspaceId }: { workspaceId: Id<"workspaces"> }) => {
  const data = useQuery(api.integrations.list, { workspaceId })
  const channels = useQuery(api.channels.get, { workspaceId })
  const create = useMutation(api.integrations.create)
  const setActive = useMutation(api.integrations.setActive)
  const remove = useMutation(api.integrations.remove)
  const { handleLimitError } = useLimitHandler()

  const [adding, setAdding] = useState<Kind | null>(null)
  const [name, setName] = useState("")
  const [channelId, setChannelId] = useState("")
  const [url, setUrl] = useState("")
  const [events, setEvents] = useState<string[]>(EVENTS.map((e) => e.id))
  const [busy, setBusy] = useState(false)
  const [reveal, setReveal] = useState<{ kind: Kind; token?: string; secret?: string } | null>(null)

  if (data === undefined) return <Loader className="size-5 animate-spin text-[#ff5018] mx-auto my-6" />

  const site = data.site || "https://YOUR-DEPLOYMENT.convex.site"
  const hookUrl = (kind: Kind, token: string) => `${site}/hooks/${kind === "github" ? "github" : "incoming"}/${token}`

  const submit = async () => {
    if (!adding) return
    setBusy(true)
    try {
      const r = await create({
        workspaceId,
        kind: adding,
        name,
        channelId: adding === "incoming" || adding === "github" ? ((channelId || channels?.[0]?._id) as Id<"channels">) : undefined,
        url: adding === "outgoing" ? url : undefined,
        events: adding === "outgoing" ? events : undefined,
      })
      setReveal({ kind: adding, token: r.token, secret: r.secret })
      setAdding(null); setName(""); setUrl("")
    } catch (e) {
      handleLimitError(e, "Couldn't create that")
    } finally {
      setBusy(false)
    }
  }

  const run = async (fn: () => Promise<unknown>) => {
    try { await fn() } catch (e) { handleLimitError(e, "Something went wrong") }
  }

  return (
    <div className="flex flex-col gap-6">
      {reveal && (
        <div className="rounded-xl border border-[#ff5018]/40 bg-[#ff5018]/5 p-4 flex flex-col gap-3">
          <p className="text-sm font-semibold text-ink">Copy this now. For safety we can&apos;t show it again.</p>
          {reveal.kind === "apiKey" && reveal.token && <Secret label="API key" value={reveal.token} />}
          {(reveal.kind === "incoming" || reveal.kind === "github") && reveal.token && <Secret label="Webhook address" value={hookUrl(reveal.kind, reveal.token)} />}
          {reveal.kind === "github" && reveal.secret && (
            <>
              <Secret label="Secret" value={reveal.secret} />
              <p className="text-xs text-ink/65">In GitHub: Settings → Webhooks → Add webhook. Paste the address as Payload URL, set Content type to <b>application/json</b>, paste the secret, and choose the events you want.</p>
            </>
          )}
          {reveal.kind === "outgoing" && reveal.secret && (
            <>
              <Secret label="Signing secret" value={reveal.secret} />
              <p className="text-xs text-ink/65">Each request carries <code>X-WebflowX-Signature: sha256=…</code>, an HMAC-SHA256 of the raw body using this secret.</p>
            </>
          )}
          <Button size="sm" variant="outline" className="self-start rounded-lg" onClick={() => setReveal(null)}>Done</Button>
        </div>
      )}

      {SECTIONS.map((sec) => {
        const rows = data.rows.filter((r) => r.kind === sec.kind)
        const allowed = data.allowed[sec.kind]
        return (
          <section key={sec.kind} className="flex flex-col gap-2">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-ink">{sec.title}</p>
                <p className="text-xs text-ink/65 max-w-md">{sec.blurb}</p>
                {!allowed && <p className="text-xs text-[#ff5018] mt-1">Not included in your current plan.</p>}
              </div>
              <Button size="sm" variant="outline" className="rounded-lg shrink-0" onClick={() => { setAdding(adding === sec.kind ? null : sec.kind); setReveal(null) }}>
                <Plus className="size-4 mr-1" /> {sec.button}
              </Button>
            </div>

            {adding === sec.kind && (
              <div className="rounded-xl border border-plum/12 bg-surface p-3 flex flex-col gap-2">
                <Input value={name} maxLength={60} onChange={(e) => setName(e.target.value)} placeholder={sec.kind === "github" ? "e.g. webflowx-app repo" : "Name, e.g. Deploy alerts"} />
                {(sec.kind === "incoming" || sec.kind === "github") && (
                  <select value={channelId || channels?.[0]?._id || ""} onChange={(e) => setChannelId(e.target.value)}
                    className="h-9 rounded-md border border-plum/15 bg-surface px-2 text-sm text-ink">
                    {(channels ?? []).map((c) => <option key={c._id} value={c._id}>#{cleanChannelName(c.name)}</option>)}
                  </select>
                )}
                {sec.kind === "outgoing" && (
                  <>
                    <Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://hooks.zapier.com/hooks/catch/…" />
                    <div className="flex flex-wrap gap-x-4 gap-y-1">
                      {EVENTS.map((ev) => (
                        <label key={ev.id} className="flex items-center gap-1.5 text-sm text-ink cursor-pointer">
                          <input type="checkbox" className="size-4 accent-[#ff5018]" checked={events.includes(ev.id)}
                            onChange={(e) => setEvents(e.target.checked ? [...events, ev.id] : events.filter((x) => x !== ev.id))} />
                          {ev.label}
                        </label>
                      ))}
                    </div>
                  </>
                )}
                <div className="flex gap-2">
                  <Button size="sm" className="bg-[#ff5018] hover:bg-[#e6430f] text-white rounded-lg" disabled={busy || !name.trim()} onClick={submit}>
                    {busy ? <Loader className="size-4 animate-spin" /> : "Create"}
                  </Button>
                  <Button size="sm" variant="outline" className="rounded-lg" onClick={() => setAdding(null)}>Cancel</Button>
                </div>
              </div>
            )}

            {rows.map((r) => (
              <div key={r._id} className="rounded-xl border border-plum/10 bg-surface px-4 py-2.5 flex items-center gap-3">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-ink truncate">{r.name}{!r.active && <span className="ml-2 text-xs font-normal text-rose-600">Off</span>}</p>
                  <p className="text-xs text-ink/65 truncate">
                    {r.prefix ? `${r.prefix}… · ` : ""}
                    {r.channelId ? `#${cleanChannelName(channels?.find((c) => c._id === r.channelId)?.name ?? "channel")} · ` : ""}
                    {r.url ? `${new URL(r.url).host} · ` : ""}
                    {r.lastUsedAt ? `Last used ${new Date(r.lastUsedAt).toLocaleString()}` : "Never used"}
                    {r.kind === "outgoing" && r.lastStatus ? ` · last response ${r.lastStatus}` : ""}
                  </p>
                  {r.kind === "outgoing" && !r.active && r.failCount >= 15 && <p className="text-xs text-rose-600">Switched off after repeated failures.</p>}
                </div>
                <Button size="sm" variant="outline" className="rounded-lg" onClick={() => run(() => setActive({ id: r._id, active: !r.active }))}>{r.active ? "Turn off" : "Turn on"}</Button>
                <button aria-label={`Delete ${r.name}`} className="text-ink/45 hover:text-rose-600" onClick={() => { if (confirm(`Delete "${r.name}"? Anything using it will stop working.`)) run(() => remove({ id: r._id })) }}>
                  <Trash2 className="size-4" />
                </button>
              </div>
            ))}
          </section>
        )
      })}

      <section className="flex flex-col gap-2">
        <p className="text-sm font-semibold text-ink">Using the API</p>
        <p className="text-xs text-ink/65">Base address: <code>{site}/api/v1</code>. Send your key in the <code>Authorization</code> header. Up to 120 requests a minute per key.</p>
        <pre className="rounded-xl bg-[#1e1019] text-white/90 text-xs p-3 overflow-x-auto whitespace-pre">{`# channels, members, tasks
curl ${site}/api/v1/channels -H "Authorization: Bearer wfx_…"
curl ${site}/api/v1/members  -H "Authorization: Bearer wfx_…"
curl "${site}/api/v1/tasks?status=todo" -H "Authorization: Bearer wfx_…"

# read / post messages (public channels)
curl "${site}/api/v1/messages?channelId=CHANNEL_ID&limit=20" -H "Authorization: Bearer wfx_…"
curl -X POST ${site}/api/v1/messages -H "Authorization: Bearer wfx_…" \\
  -H "Content-Type: application/json" -d '{"channelId":"CHANNEL_ID","text":"Hello"}'

# create a task
curl -X POST ${site}/api/v1/tasks -H "Authorization: Bearer wfx_…" \\
  -H "Content-Type: application/json" \\
  -d '{"title":"Call the client","priority":"high","dueDate":"2026-12-31"}'

# incoming webhook
curl -X POST ${site}/hooks/incoming/TOKEN -H "Content-Type: application/json" -d '{"text":"Deploy finished"}'`}</pre>
        <p className="text-xs text-ink/65">Zapier and Make: use their webhook and HTTP modules with the key above, and add an outgoing webhook here to trigger a Zap or scenario from WebflowX.</p>
      </section>
    </div>
  )
}
