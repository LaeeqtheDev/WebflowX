import { unzipSync, strFromU8 } from "fflate"

export type SlackMessage = { author: string; ts: number; text: string; isReply: boolean }
export type SlackChannel = { name: string; description: string; messages: SlackMessage[] }

type RawUser = { id: string; name?: string; real_name?: string; profile?: { display_name?: string; real_name?: string } }
type RawChannel = { id: string; name: string; purpose?: { value?: string }; topic?: { value?: string } }
type RawMessage = { type?: string; subtype?: string; user?: string; username?: string; bot_profile?: { name?: string }; text?: string; ts?: string; thread_ts?: string; files?: { name?: string }[] }

const SKIP_SUBTYPES = new Set(["channel_join", "channel_leave", "channel_archive", "channel_unarchive", "channel_purpose", "channel_topic", "channel_name", "pinned_item", "unpinned_item", "group_join", "group_leave"])

/** Turns Slack's message markup into plain readable text. */
export function cleanSlackText(raw: string, users: Map<string, string>, channels: Map<string, string>): string {
  return raw
    .replace(/<@([UW][A-Z0-9]+)(?:\|[^>]*)?>/g, (_, id) => `@${users.get(id) ?? "someone"}`)
    .replace(/<#([A-Z0-9]+)(?:\|([^>]*))?>/g, (_, id, name) => `#${name || channels.get(id) || "channel"}`)
    .replace(/<!(channel|here|everyone)(?:\|[^>]*)?>/g, "@$1")
    .replace(/<!subteam\^[A-Z0-9]+(?:\|([^>]*))?>/g, (_, label) => label || "@group")
    .replace(/<(https?:[^|>]+)\|([^>]+)>/g, "$2 ($1)")
    .replace(/<(https?:[^>]+)>/g, "$1")
    .replace(/<mailto:([^|>]+)(?:\|[^>]*)?>/g, "$1")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
}

/** Reads a Slack workspace export (.zip). Public channels only: that is what Slack's standard export contains. */
export function parseSlackExport(zip: Uint8Array): SlackChannel[] {
  const files = unzipSync(zip, { filter: (f) => f.name.endsWith(".json") && f.originalSize < 50_000_000 })
  const read = <T>(name: string): T | undefined => {
    const key = Object.keys(files).find((k) => k === name || k.endsWith("/" + name))
    if (!key) return undefined
    try {
      return JSON.parse(strFromU8(files[key])) as T
    } catch {
      return undefined
    }
  }
  const rawUsers = read<RawUser[]>("users.json") ?? []
  const rawChannels = read<RawChannel[]>("channels.json")
  if (!rawChannels) throw new Error("This does not look like a Slack export. It should contain channels.json.")

  const users = new Map<string, string>()
  for (const u of rawUsers) users.set(u.id, u.profile?.display_name || u.real_name || u.profile?.real_name || u.name || "Someone")
  const channelNames = new Map(rawChannels.map((c) => [c.id, c.name]))

  const out: SlackChannel[] = []
  for (const c of rawChannels) {
    const days = Object.keys(files)
      .filter((k) => {
        const parts = k.split("/")
        return parts.length >= 2 && parts[parts.length - 2] === c.name && /^\d{4}-\d{2}-\d{2}\.json$/.test(parts[parts.length - 1])
      })
      .sort((a, b) => a.split("/").pop()!.localeCompare(b.split("/").pop()!))
    const messages: SlackMessage[] = []
    for (const k of days) {
      let arr: RawMessage[] = []
      try {
        arr = JSON.parse(strFromU8(files[k]))
      } catch {
        continue
      }
      for (const m of arr) {
        if (m.type && m.type !== "message") continue
        if (m.subtype && SKIP_SUBTYPES.has(m.subtype)) continue
        const attached = (m.files ?? []).map((f) => f.name).filter(Boolean)
        let text = cleanSlackText(m.text ?? "", users, channelNames).trim()
        if (attached.length) text += `${text ? "\n" : ""}[Files in Slack: ${attached.join(", ")}]`
        if (!text) continue
        const ts = Math.round(parseFloat(m.ts ?? "0") * 1000)
        if (!ts) continue
        messages.push({
          author: (m.user && users.get(m.user)) || m.bot_profile?.name || m.username || "Someone",
          ts,
          text,
          isReply: !!m.thread_ts && m.thread_ts !== m.ts,
        })
      }
    }
    messages.sort((a, b) => a.ts - b.ts)
    out.push({ name: c.name, description: c.purpose?.value || c.topic?.value || "", messages })
  }
  return out
}
