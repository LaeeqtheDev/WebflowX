"use client"

import { useRef, useState } from "react"
import { useMutation } from "convex/react"
import { toast } from "sonner"
import { Loader, Upload } from "lucide-react"
import { api } from "../../../convex/_generated/api"
import type { Id } from "../../../convex/_generated/dataModel"
import { Button } from "@/components/ui/button"
import { errMsg } from "@/lib/errors"
import { parseSlackExport, type SlackChannel } from "@/lib/import/slack"
import { parseNotionExport, type NotionPage } from "@/lib/import/notion"

const MAX_ZIP = 150 * 1024 * 1024

type Source = "slack" | "notion"

export function ImportPanel({ workspaceId }: { workspaceId: Id<"workspaces"> }) {
  const createChannel = useMutation(api.imports.createChannel)
  const addMessages = useMutation(api.imports.addMessages)
  const addNotes = useMutation(api.imports.addNotes)
  const fileRef = useRef<HTMLInputElement>(null)
  const [source, setSource] = useState<Source>("slack")
  const [channels, setChannels] = useState<SlackChannel[] | null>(null)
  const [picked, setPicked] = useState<Set<string>>(new Set())
  const [pages, setPages] = useState<NotionPage[] | null>(null)
  const [busy, setBusy] = useState(false)
  const [progress, setProgress] = useState("")

  const reset = () => {
    setChannels(null)
    setPages(null)
    setPicked(new Set())
    setProgress("")
    if (fileRef.current) fileRef.current.value = ""
  }

  const onFile = async (file: File | undefined) => {
    if (!file) return
    reset()
    if (file.size > MAX_ZIP) return toast.error("That file is larger than 150 MB. Export fewer channels or pages and try again.")
    setBusy(true)
    try {
      const bytes = new Uint8Array(await file.arrayBuffer())
      if (source === "slack") {
        const parsed = parseSlackExport(bytes).filter((c) => c.messages.length > 0)
        if (parsed.length === 0) throw new Error("No messages were found in that export.")
        setChannels(parsed)
        setPicked(new Set(parsed.map((c) => c.name)))
      } else {
        const parsed = parseNotionExport(bytes)
        if (parsed.length === 0) throw new Error("No pages were found. Export from Notion as Markdown & CSV.")
        setPages(parsed)
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not read that file")
    } finally {
      setBusy(false)
    }
  }

  const runSlack = async () => {
    if (!channels) return
    setBusy(true)
    let done = 0
    try {
      for (const c of channels.filter((x) => picked.has(x.name))) {
        setProgress(`Creating #${c.name}`)
        const id = await createChannel({ workspaceId, name: c.name, description: c.description || undefined })
        for (let i = 0; i < c.messages.length; i += 100) {
          setProgress(`#${c.name}: ${Math.min(i + 100, c.messages.length)} of ${c.messages.length}`)
          await addMessages({ channelId: id, items: c.messages.slice(i, i + 100) })
        }
        done++
      }
      toast.success(`Imported ${done} channel${done === 1 ? "" : "s"}`)
      reset()
    } catch (e) {
      toast.error(`${errMsg(e, "Import failed")}${done ? ` (${done} channel${done === 1 ? "" : "s"} were imported before this)` : ""}`)
    } finally {
      setBusy(false)
      setProgress("")
    }
  }

  const runNotion = async () => {
    if (!pages) return
    setBusy(true)
    let created = 0
    try {
      for (let i = 0; i < pages.length; i += 20) {
        setProgress(`${Math.min(i + 20, pages.length)} of ${pages.length} pages`)
        const batch = pages.slice(i, i + 20)
        const n = await addNotes({ workspaceId, items: batch })
        created += n
        if (n < batch.length) {
          toast.message(`Stopped at your plan's note limit. ${created} of ${pages.length} pages imported.`)
          reset()
          return
        }
      }
      toast.success(`Imported ${created} pages as workspace notes`)
      reset()
    } catch (e) {
      toast.error(`${errMsg(e, "Import failed")}${created ? ` (${created} pages were imported before this)` : ""}`)
    } finally {
      setBusy(false)
      setProgress("")
    }
  }

  const total = channels?.filter((c) => picked.has(c.name)).reduce((n, c) => n + c.messages.length, 0) ?? 0

  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-2" role="tablist" aria-label="Import from">
        {(["slack", "notion"] as const).map((s) => (
          <Button key={s} type="button" role="tab" aria-selected={source === s} variant={source === s ? "default" : "outline"} disabled={busy} onClick={() => { setSource(s); reset() }}>
            {s === "slack" ? "Slack" : "Notion"}
          </Button>
        ))}
      </div>

      {source === "slack" ? (
        <p className="text-sm text-ink/70">
          In Slack, an owner or admin exports data from Settings &amp; administration, Workspace settings, Import/Export Data. Upload the .zip here. Public channels are imported as channels. Messages are posted under your name with the original author and time at the top, because those people are not members here yet. Files and private channels are not included.
        </p>
      ) : (
        <p className="text-sm text-ink/70">
          In Notion, choose Export, format Markdown &amp; CSV, and upload the .zip here. Each page becomes a workspace note (text only; images and databases are not imported). Your plan&apos;s note limit applies.
        </p>
      )}

      <div>
        <input ref={fileRef} type="file" accept=".zip,application/zip" className="sr-only" id="import-file" disabled={busy} onChange={(e) => onFile(e.target.files?.[0])} />
        <Button type="button" variant="outline" disabled={busy} onClick={() => fileRef.current?.click()}>
          {busy && !progress ? <Loader className="mr-2 size-4 animate-spin" /> : <Upload className="mr-2 size-4" />}
          Choose export (.zip)
        </Button>
      </div>

      {channels && (
        <div className="flex flex-col gap-2">
          <ul className="max-h-64 overflow-y-auto rounded-xl border border-plum/10 bg-surface">
            {channels.map((c) => (
              <li key={c.name} className="flex items-center gap-3 border-b border-plum/10 px-4 py-2 last:border-b-0">
                <input type="checkbox" id={`ch-${c.name}`} checked={picked.has(c.name)} disabled={busy} onChange={(e) => {
                  const next = new Set(picked)
                  if (e.target.checked) next.add(c.name); else next.delete(c.name)
                  setPicked(next)
                }} />
                <label htmlFor={`ch-${c.name}`} className="flex-1 text-sm">#{c.name}</label>
                <span className="text-xs text-ink/60">{c.messages.length.toLocaleString()} messages</span>
              </li>
            ))}
          </ul>
          <Button type="button" disabled={busy || picked.size === 0} onClick={runSlack}>
            {busy ? <Loader className="mr-2 size-4 animate-spin" /> : null}
            {busy ? progress || "Importing" : `Import ${picked.size} channel${picked.size === 1 ? "" : "s"} (${total.toLocaleString()} messages)`}
          </Button>
        </div>
      )}

      {pages && (
        <div className="flex flex-col gap-2">
          <p className="text-sm">{pages.length.toLocaleString()} pages found, for example: {pages.slice(0, 3).map((p) => p.title).join(", ")}</p>
          <Button type="button" disabled={busy} onClick={runNotion}>
            {busy ? <Loader className="mr-2 size-4 animate-spin" /> : null}
            {busy ? progress || "Importing" : `Import ${pages.length} pages as notes`}
          </Button>
        </div>
      )}
    </div>
  )
}
