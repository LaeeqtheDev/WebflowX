// Turns a stored message (a Quill Delta as JSON) into the same HTML Quill would produce, without loading Quill.
// Quill is ~70 KB and building one per message was the slowest part of opening a channel. Returns null for anything this
// doesn't handle (embeds, code blocks, indents, alignment, unknown formats) so the caller can fall back to Quill.

type Attrs = Record<string, unknown>
type Op = { insert?: unknown; attributes?: Attrs }
export type Rendered = { html: string; empty: boolean }

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/ /g, "&nbsp;")
const escAttr = (s: string) => esc(s).replace(/"/g, "&quot;")

const SAFE_LINK = /^(https?:|mailto:|tel:|sms:)/i
// Outermost first. This is the order Quill nests inline formats in.
const INLINE_ORDER = ["code", "bold", "italic", "strike", "underline", "link", "mention"] as const
const INLINE_ONLY = new Set<string>(INLINE_ORDER)
const LINE_FORMATS = new Set(["header", "list", "blockquote"])

type Open = { key: string; open: string; close: string }

const inlineOpens = (a: Attrs): Open[] | null => {
  const out: Open[] = []
  for (const name of INLINE_ORDER) {
    const v = a[name]
    if (!v) continue
    switch (name) {
      case "mention":
        if (typeof v !== "string") return null
        out.push({ key: `mention:${v}`, open: `<span class="mention" data-member-id="${escAttr(v)}">`, close: "</span>" })
        break
      case "link":
        if (typeof v !== "string" || !SAFE_LINK.test(v)) return null
        out.push({ key: `link:${v}`, open: `<a href="${escAttr(v)}" rel="noopener noreferrer" target="_blank">`, close: "</a>" })
        break
      case "underline": out.push({ key: "u", open: "<u>", close: "</u>" }); break
      case "strike": out.push({ key: "s", open: "<s>", close: "</s>" }); break
      case "italic": out.push({ key: "em", open: "<em>", close: "</em>" }); break
      case "bold": out.push({ key: "strong", open: "<strong>", close: "</strong>" }); break
      case "code": out.push({ key: "code", open: "<code>", close: "</code>" }); break
    }
  }
  return out
}

type Run = { text: string; attrs: Attrs }
type Line = { runs: Run[]; attrs: Attrs }

const renderRuns = (runs: Run[]): string | null => {
  let html = ""
  let stack: Open[] = []
  for (const run of runs) {
    const want = inlineOpens(run.attrs)
    if (!want) return null
    let i = 0
    while (i < stack.length && i < want.length && stack[i].key === want[i].key) i++
    for (let j = stack.length - 1; j >= i; j--) html += stack[j].close
    for (let j = i; j < want.length; j++) html += want[j].open
    stack = want
    html += esc(run.text)
  }
  for (let j = stack.length - 1; j >= 0; j--) html += stack[j].close
  return html
}

export const deltaToHtml = (value: string): Rendered | null => {
  let ops: unknown
  try {
    const parsed = JSON.parse(value)
    ops = Array.isArray(parsed) ? parsed : parsed?.ops
  } catch {
    return null
  }
  if (!Array.isArray(ops)) return null

  // split into lines; the attributes of a "\n" are the line's block format
  const lines: Line[] = []
  let cur: Run[] = []
  let plain = ""
  for (const raw of ops as Op[]) {
    if (!raw || typeof raw.insert !== "string") return null // embeds (images, video, formulas) aren't handled here
    const attrs = raw.attributes ?? {}
    const parts = raw.insert.split("\n")
    for (let p = 0; p < parts.length; p++) {
      if (parts[p]) {
        for (const k of Object.keys(attrs)) if (!INLINE_ONLY.has(k) && attrs[k]) return null
        cur.push({ text: parts[p], attrs })
        plain += parts[p]
      }
      if (p < parts.length - 1) {
        for (const k of Object.keys(attrs)) if (attrs[k] && !LINE_FORMATS.has(k)) return null
        lines.push({ runs: cur, attrs })
        cur = []
      }
    }
  }
  if (cur.length) lines.push({ runs: cur, attrs: {} })

  let html = ""
  let list: string | null = null // open <ol> (Quill renders every list, bullet or numbered, inside an <ol>)
  for (const line of lines) {
    const inner = renderRuns(line.runs)
    if (inner === null) return null
    const body = inner || "<br>"
    const listType = line.attrs.list
    if (listType) {
      if (listType !== "bullet" && listType !== "ordered") return null
      if (!list) { html += "<ol>"; list = "ol" }
      html += `<li data-list="${listType}"><span class="ql-ui" contenteditable="false"></span>${body}</li>`
      continue
    }
    if (list) { html += "</ol>"; list = null }
    const header = line.attrs.header
    if (header) {
      if (typeof header !== "number" || header < 1 || header > 6) return null
      html += `<h${header}>${body}</h${header}>`
    } else if (line.attrs.blockquote) {
      html += `<blockquote>${body}</blockquote>`
    } else {
      html += `<p>${body}</p>`
    }
  }
  if (list) html += "</ol>"
  return { html, empty: plain.trim().length === 0 }
}

// Messages repeat on every re-render and re-open; remember the last few hundred.
const cache = new Map<string, Rendered | null>()
export const renderDelta = (value: string): Rendered | null => {
  if (cache.has(value)) return cache.get(value)!
  const r = deltaToHtml(value)
  if (cache.size >= 500) cache.delete(cache.keys().next().value as string)
  cache.set(value, r)
  return r
}
