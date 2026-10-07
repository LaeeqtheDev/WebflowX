"use client"
import { useState } from "react"
import { useMutation, useQuery } from "convex/react"
import { Check, Copy, GitBranch, KeyRound, Loader, Lock, Plus, Power, Trash2, Webhook, Send } from "lucide-react"
import { toast } from "sonner"
import { api } from "../../../convex/_generated/api"
import { Id } from "../../../convex/_generated/dataModel"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useLimitHandler } from "@/hooks/use-limit-handler"
import { cn } from "@/lib/utils"
import { cleanChannelName } from "@/app/dashboard/workspace/[workspaceId]/components/channel-icon"

type Kind = "apiKey" | "incoming" | "github" | "outgoing"

const EVENTS = [
  { id: "message.created", label: "Message posted" },
  { id: "task.created", label: "Task created" },
  { id: "task.completed", label: "Task completed" },
]

const SECTIONS: { kind: Kind; title: string; blurb: string; button: string; plan: string; icon: typeof KeyRound }[] = [
  { kind: "apiKey", icon: KeyRound, plan: "Startup+", title: "API keys", button: "New key", blurb: "Let your scripts, Zapier or Make read channels and tasks, post messages and create tasks." },
  { kind: "incoming", icon: Webhook, plan: "Startup+", title: "Incoming webhooks", button: "New webhook", blurb: "A private web address that posts into one channel. Point any tool at it to send alerts and updates." },
  { kind: "github", icon: GitBranch, plan: "Growth+", title: "GitHub", button: "Connect repo", blurb: "Pushes, pull requests, issues, releases and failed builds appear in a channel." },
  { kind: "outgoing", icon: Send, plan: "Growth+", title: "Outgoing webhooks", button: "New webhook", blurb: "We send a signed event to your address when something happens. Zapier (Catch Hook) and Make (Custom webhook) listen this way." },
]

const copy = async (text: string) => {
  try { await navigator.clipboard.writeText(text); toast.success("Copied") } catch { toast.error("Couldn't copy. Select it and copy by hand.") }
}

const CopyBtn = ({ value, label = "Copy" }: { value: string; label?: string }) => {
  const [done, setDone] = useState(false)
  return (
    <Button type="button" size="sm" variant="outline" className="h-8 shrink-0 gap-1.5 rounded-lg px-2.5 text-xs"
      onClick={async () => { await copy(value); setDone(true); setTimeout(() => setDone(false), 1500) }}>
      {done ? <Check className="size-3.5 text-emerald-600" /> : <Copy className="size-3.5" />}{label}
    </Button>
  )
}

const Secret = ({ label, value }: { label: string; value: string }) => (
  <div className="flex flex-col gap-1.5">
    <p className="text-xs font-semibold text-ink/70">{label}</p>
    <div className="flex items-stretch gap-2">
      <code className="min-w-0 flex-1 break-all rounded-lg border border-plum/10 bg-surface px-3 py-2 text-xs leading-relaxed text-ink">{value}</code>
      <CopyBtn value={value} />
    </div>
  </div>
)

const when = (ms?: number) => {
  if (!ms) return "Never used"
  const mins = Math.round((Date.now() - ms) / 60000)
  if (mins < 1) return "Used just now"
  if (mins < 60) return `Used ${mins} min ago`
  const h = Math.round(mins / 60)
  if (h < 24) return `Used ${h} hr ago`
  return `Used ${new Date(ms).toLocaleDateString()}`
}

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
  const [includePrivate, setIncludePrivate] = useState(false)
  const [busy, setBusy] = useState(false)
  const [reveal, setReveal] = useState<{ kind: Kind; token?: string; secret?: string } | null>(null)
  const [doc, setDoc] = useState(0)

  if (data === undefined) return <Loader className="mx-auto my-8 size-5 animate-spin text-[#ff5018]" />

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
        includePrivate: adding === "outgoing" ? includePrivate : undefined,
      })
      setReveal({ kind: adding, token: r.token, secret: r.secret })
      setAdding(null); setName(""); setUrl(""); setIncludePrivate(false)
    } catch (e) {
      handleLimitError(e, "Couldn't create that")
    } finally {
      setBusy(false)
    }
  }

  const run = async (fn: () => Promise<unknown>) => {
    try { await fn() } catch (e) { handleLimitError(e, "Something went wrong") }
  }

  const docs = [
    { title: "Read channels & tasks", code: `curl ${site}/api/v1/channels \\\n  -H "Authorization: Bearer wfx_…"\n\ncurl "${site}/api/v1/tasks?status=todo" \\\n  -H "Authorization: Bearer wfx_…"` },
    { title: "Post a message", code: `curl -X POST ${site}/api/v1/messages \\\n  -H "Authorization: Bearer wfx_…" \\\n  -H "Content-Type: application/json" \\\n  -d '{"channelId":"CHANNEL_ID","text":"Hello"}'` },
    { title: "Create a task", code: `curl -X POST ${site}/api/v1/tasks \\\n  -H "Authorization: Bearer wfx_…" \\\n  -H "Content-Type: application/json" \\\n  -d '{"title":"Call the client","priority":"high","dueDate":"2026-12-31"}'` },
    { title: "Incoming webhook", code: `curl -X POST ${site}/hooks/incoming/TOKEN \\\n  -H "Content-Type: application/json" \\\n  -d '{"text":"Deploy finished"}'` },
  ]

  const field = "h-10 w-full rounded-lg border border-plum/15 bg-surface px-3 text-sm text-ink outline-none focus:border-[#ff5018] focus:ring-2 focus:ring-[#ff5018]/20"

  return (
    <div className="flex flex-col gap-5">
      <p className="text-sm text-ink/70">
        Connect WebflowX to your other tools. Keys and webhook addresses are shown once when you create them, so copy them straight away.
      </p>

      {reveal && (
        <div className="flex flex-col gap-3 rounded-2xl border-2 border-[#ff5018]/50 bg-[#ff5018]/5 p-4">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-semibold text-ink">Created. Copy it now, we can&apos;t show it again.</p>
            <Button size="sm" variant="outline" className="h-8 rounded-lg" onClick={() => setReveal(null)}>Done</Button>
          </div>
          {reveal.kind === "apiKey" && reveal.token && <Secret label="API key" value={reveal.token} />}
          {(reveal.kind === "incoming" || reveal.kind === "github") && reveal.token && <Secret label="Webhook address" value={hookUrl(reveal.kind, reveal.token)} />}
          {reveal.kind === "github" && reveal.secret && (
            <>
              <Secret label="Secret" value={reveal.secret} />
              <p className="text-xs leading-relaxed text-ink/70">
                In GitHub open <b>Settings → Webhooks → Add webhook</b>. Paste the address as <b>Payload URL</b>, set <b>Content type</b> to <b>application/json</b>, paste the secret, then choose the events you want.
              </p>
            </>
          )}
          {reveal.kind === "outgoing" && reveal.secret && (
            <>
              <Secret label="Signing secret" value={reveal.secret} />
              <p className="text-xs leading-relaxed text-ink/70">
                Every request has an <code className="rounded bg-surface px-1">X-WebflowX-Signature: sha256=…</code> header: an HMAC-SHA256 of the raw body, made with this secret.
              </p>
            </>
          )}
        </div>
      )}

      {SECTIONS.map((sec) => {
        const rows = data.rows.filter((r) => r.kind === sec.kind)
        const allowed = data.allowed[sec.kind]
        const Icon = sec.icon
        return (
          <section key={sec.kind} className="overflow-hidden rounded-2xl border border-plum/12 bg-surface">
            <div className="flex flex-wrap items-start gap-x-4 gap-y-3 p-4 sm:p-5">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[#381d2a] text-[#ff5018]">
                <Icon className="size-5" />
              </span>
              <div className="min-w-0 flex-1 basis-56">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-[15px] font-semibold tracking-tight text-ink">{sec.title}</h3>
                  <span className={cn(
                    "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
                    allowed ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300" : "bg-[#ff5018]/10 text-[#ff5018]"
                  )}>
                    {!allowed && <Lock className="size-3" />}{allowed ? "Included" : `Upgrade · ${sec.plan}`}
                  </span>
                </div>
                <p className="mt-1 text-[13px] leading-relaxed text-ink/65">{sec.blurb}</p>
              </div>
              <Button size="sm" className="h-9 shrink-0 gap-1.5 rounded-lg bg-[#ff5018] text-white hover:bg-[#e6430f]"
                onClick={() => { setAdding(adding === sec.kind ? null : sec.kind); setReveal(null) }}>
                <Plus className="size-4" /> {sec.button}
              </Button>
            </div>

            {adding === sec.kind && (
              <div className="flex flex-col gap-3 border-t border-plum/10 bg-cream/60 p-4 sm:p-5">
                <label className="flex flex-col gap-1.5">
                  <span className="text-xs font-semibold text-ink/70">Name</span>
                  <Input value={name} maxLength={60} onChange={(e) => setName(e.target.value)} autoFocus
                    placeholder={sec.kind === "github" ? "e.g. webflowx-app repo" : sec.kind === "apiKey" ? "e.g. Zapier" : "e.g. Deploy alerts"} />
                </label>
                {(sec.kind === "incoming" || sec.kind === "github") && (
                  <label className="flex flex-col gap-1.5">
                    <span className="text-xs font-semibold text-ink/70">Post into</span>
                    <select value={channelId || channels?.[0]?._id || ""} onChange={(e) => setChannelId(e.target.value)} className={field}>
                      {(channels ?? []).map((c) => <option key={c._id} value={c._id}>#{cleanChannelName(c.name)}</option>)}
                    </select>
                  </label>
                )}
                {sec.kind === "outgoing" && (
                  <>
                    <label className="flex flex-col gap-1.5">
                      <span className="text-xs font-semibold text-ink/70">Send events to</span>
                      <Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://hooks.zapier.com/hooks/catch/…" />
                    </label>
                    <div className="flex flex-col gap-1.5">
                      <span className="text-xs font-semibold text-ink/70">Events</span>
                      <div className="flex flex-wrap gap-2">
                        {EVENTS.map((ev) => {
                          const on = events.includes(ev.id)
                          return (
                            <button key={ev.id} type="button" onClick={() => setEvents(on ? events.filter((x) => x !== ev.id) : [...events, ev.id])}
                              className={cn("flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition",
                                on ? "border-[#ff5018] bg-[#ff5018]/10 text-[#ff5018]" : "border-plum/15 bg-surface text-ink/65 hover:text-ink")}>
                              {on && <Check className="size-3.5" />}{ev.label}
                            </button>
                          )
                        })}
                      </div>
                    </div>
                    <label className="flex cursor-pointer items-start gap-2.5 rounded-lg border border-plum/10 bg-surface p-3">
                      <input type="checkbox" className="mt-0.5 size-4 accent-[#ff5018]" checked={includePrivate} onChange={(e) => setIncludePrivate(e.target.checked)} />
                      <span className="text-xs text-ink/70"><b className="text-ink">Include locked channels.</b> Off by default, so messages from private channels never leave WebflowX unless you turn this on.</span>
                    </label>
                  </>
                )}
                <div className="flex gap-2 pt-1">
                  <Button size="sm" className="h-9 rounded-lg bg-[#ff5018] px-4 text-white hover:bg-[#e6430f]" disabled={busy || !name.trim()} onClick={submit}>
                    {busy ? <Loader className="size-4 animate-spin" /> : "Create"}
                  </Button>
                  <Button size="sm" variant="outline" className="h-9 rounded-lg" onClick={() => setAdding(null)}>Cancel</Button>
                </div>
              </div>
            )}

            {rows.length > 0 && (
              <ul className="divide-y divide-plum/10 border-t border-plum/10">
                {rows.map((r) => (
                  <li key={r._id} className="flex flex-wrap items-center gap-x-3 gap-y-2 px-4 py-3 sm:px-5">
                    <span className={cn("size-2 shrink-0 rounded-full", r.active ? "bg-emerald-500" : "bg-ink/25")} aria-hidden />
                    <div className="min-w-0 flex-1 basis-48">
                      <p className="truncate text-sm font-semibold text-ink">{r.name}</p>
                      <p className="truncate text-xs text-ink/60">
                        {[
                          r.prefix ? `${r.prefix}…` : null,
                          r.channelId ? `#${cleanChannelName(channels?.find((c) => c._id === r.channelId)?.name ?? "channel")}` : null,
                          r.url ? new URL(r.url).host : null,
                          when(r.lastUsedAt),
                          r.kind === "outgoing" && r.lastStatus ? `last response ${r.lastStatus}` : null,
                        ].filter(Boolean).join(" · ")}
                      </p>
                      {r.kind === "outgoing" && !r.active && r.failCount >= 15 && <p className="text-xs text-rose-600">Switched off after repeated failures.</p>}
                    </div>
                    <Button size="sm" variant="outline" className="h-8 gap-1.5 rounded-lg text-xs" onClick={() => run(() => setActive({ id: r._id, active: !r.active }))}>
                      <Power className="size-3.5" />{r.active ? "Turn off" : "Turn on"}
                    </Button>
                    <button aria-label={`Delete ${r.name}`} title="Delete"
                      className="flex size-8 items-center justify-center rounded-lg text-ink/50 hover:bg-rose-500/10 hover:text-rose-600"
                      onClick={() => { if (confirm(`Delete "${r.name}"? Anything using it will stop working.`)) run(() => remove({ id: r._id })) }}>
                      <Trash2 className="size-4" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>
        )
      })}

      <section className="overflow-hidden rounded-2xl border border-plum/12 bg-surface">
        <div className="flex flex-col gap-2 p-4 sm:p-5">
          <h3 className="text-[15px] font-semibold tracking-tight text-ink">Developer docs</h3>
          <p className="text-[13px] leading-relaxed text-ink/65">Send your key in the <code className="rounded bg-cream px-1">Authorization</code> header. Up to 120 requests a minute per key.</p>
          <div className="mt-1 flex items-center gap-2">
            <code className="min-w-0 flex-1 truncate rounded-lg border border-plum/10 bg-cream px-3 py-2 text-xs text-ink">{site}/api/v1</code>
            <CopyBtn value={`${site}/api/v1`} />
          </div>
        </div>
        <div className="border-t border-plum/10">
          <div className="flex gap-1 overflow-x-auto px-3 pt-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {docs.map((d, i) => (
              <button key={d.title} type="button" onClick={() => setDoc(i)}
                className={cn("whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-semibold transition",
                  doc === i ? "bg-[#381d2a] text-white" : "text-ink/65 hover:bg-cream hover:text-ink")}>
                {d.title}
              </button>
            ))}
          </div>
          <div className="relative p-3 sm:p-4">
            <pre className="whitespace-pre-wrap break-all rounded-xl bg-[#1e1019] p-4 pr-20 text-xs leading-relaxed text-white/90">{docs[doc].code}</pre>
            <div className="absolute right-5 top-5 sm:right-7 sm:top-7"><CopyBtn value={docs[doc].code} /></div>
          </div>
        </div>
        <p className="border-t border-plum/10 px-4 py-3 text-xs leading-relaxed text-ink/65 sm:px-5">
          Zapier and Make: use their Webhooks / HTTP modules with an API key, and add an outgoing webhook above to start a Zap or scenario from WebflowX.
        </p>
      </section>
    </div>
  )
}
