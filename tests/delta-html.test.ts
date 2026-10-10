// @vitest-environment jsdom
import { describe, it, expect, beforeAll } from "vitest"
import Quill from "quill"
import { deltaToHtml } from "@/lib/delta-html"

// The fast renderer must produce exactly what Quill would, for every message shape people actually send.
const quillHtml = (ops: unknown[]) => {
  const q = new Quill(document.createElement("div"), { theme: "snow" })
  q.enable(false)
  q.setContents(ops as never)
  return q.root.innerHTML
}
const norm = (html: string) => { const d = document.createElement("div"); d.innerHTML = html; return d.innerHTML }

beforeAll(async () => { await import("@/app/dashboard/workspace/[workspaceId]/components/mention-blot") })

const cases: Record<string, unknown[]> = {
  plain: [{ insert: "Hello world\n" }],
  empty: [{ insert: "\n" }],
  multiline: [{ insert: "one\ntwo\n\nfour\n" }],
  bold: [{ insert: "a " }, { insert: "bold", attributes: { bold: true } }, { insert: " word\n" }],
  allInline: [{ insert: "x", attributes: { bold: true, italic: true, strike: true, underline: true, code: true } }, { insert: "\n" }],
  link: [{ insert: "see " }, { insert: "docs", attributes: { link: "https://example.com/a?b=1&c=2" } }, { insert: "\n" }],
  linkBold: [{ insert: "a", attributes: { link: "https://x.com", bold: true } }, { insert: "b", attributes: { link: "https://x.com" } }, { insert: "\n" }],
  mention: [{ insert: "hi " }, { insert: "@Sam", attributes: { mention: "abc123" } }, { insert: " and " }, { insert: "@Ana", attributes: { mention: "def", bold: true } }, { insert: "\n" }],
  escaping: [{ insert: "<script>alert(1)</script> & \"quotes\" 'x'\n" }],
  nbsp: [{ insert: "a b  c\n" }],
  bullets: [{ insert: "one" }, { insert: "\n", attributes: { list: "bullet" } }, { insert: "two" }, { insert: "\n", attributes: { list: "bullet" } }, { insert: "after\n" }],
  ordered: [{ insert: "one" }, { insert: "\n", attributes: { list: "ordered" } }, { insert: "two" }, { insert: "\n", attributes: { list: "ordered" } }],
  mixedLists: [{ insert: "a" }, { insert: "\n", attributes: { list: "bullet" } }, { insert: "b" }, { insert: "\n", attributes: { list: "ordered" } }],
  listFormatted: [{ insert: "bold item", attributes: { bold: true } }, { insert: "\n", attributes: { list: "bullet" } }],
  headers: [{ insert: "Title" }, { insert: "\n", attributes: { header: 1 } }, { insert: "Sub" }, { insert: "\n", attributes: { header: 2 } }, { insert: "text\n" }],
  quote: [{ insert: "wise" }, { insert: "\n", attributes: { blockquote: true } }, { insert: "words" }, { insert: "\n", attributes: { blockquote: true } }],
  noTrailingNewline: [{ insert: "no newline" }],
  emoji: [{ insert: "ship it 🚀 ✅\n" }],
}

describe("deltaToHtml matches Quill", () => {
  for (const [name, ops] of Object.entries(cases)) {
    it(name, () => {
      const mine = deltaToHtml(JSON.stringify(ops))
      expect(mine).not.toBeNull()
      expect(norm(mine!.html)).toBe(norm(quillHtml(ops)))
    })
  }
})

describe("deltaToHtml hands off what it can't render", () => {
  it.each([
    ["image", [{ insert: { image: "https://x.com/a.png" } }, { insert: "\n" }]],
    ["code block", [{ insert: "x" }, { insert: "\n", attributes: { "code-block": true } }]],
    ["indent", [{ insert: "x" }, { insert: "\n", attributes: { list: "bullet", indent: 1 } }]],
    ["align", [{ insert: "x" }, { insert: "\n", attributes: { align: "center" } }]],
    ["color", [{ insert: "x", attributes: { color: "#f00" } }, { insert: "\n" }]],
    ["javascript link", [{ insert: "x", attributes: { link: "javascript:alert(1)" } }, { insert: "\n" }]],
  ])("%s", (_n, ops) => expect(deltaToHtml(JSON.stringify(ops))).toBeNull())

  it("bad JSON", () => expect(deltaToHtml("not json")).toBeNull())
  it("flags empty messages", () => expect(deltaToHtml(JSON.stringify([{ insert: "  \n" }]))?.empty).toBe(true))
  it("accepts the {ops:[]} shape", () => expect(deltaToHtml(JSON.stringify({ ops: [{ insert: "hi\n" }] }))?.html).toBe("<p>hi</p>"))
})
