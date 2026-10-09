import { describe, expect, it } from "vitest"
import { zipSync, strToU8 } from "fflate"
import { cleanSlackText, parseSlackExport } from "../src/lib/import/slack"
import { parseNotionExport } from "../src/lib/import/notion"

const zip = (files: Record<string, string>) => zipSync(Object.fromEntries(Object.entries(files).map(([k, v]) => [k, strToU8(v)])))

describe("Slack import", () => {
  const users = [{ id: "U1", real_name: "Ada Lovelace", profile: { display_name: "ada" } }, { id: "U2", real_name: "Grace Hopper", profile: {} }]
  const channels = [{ id: "C1", name: "general", purpose: { value: "Company chat" } }, { id: "C2", name: "empty" }]
  const day1 = [
    { type: "message", user: "U1", text: "Hello <@U2>, see <https://example.com|the docs> &amp; <#C1|general>", ts: "1760000000.000100" },
    { type: "message", subtype: "channel_join", user: "U2", text: "joined", ts: "1760000001.000000" },
  ]
  const day2 = [{ type: "message", user: "U2", text: "Reply here", ts: "1760086400.000000", thread_ts: "1760000000.000100" }]

  it("reads channels, resolves names and skips join messages", () => {
    const out = parseSlackExport(zip({
      "users.json": JSON.stringify(users),
      "channels.json": JSON.stringify(channels),
      "general/2026-10-08.json": JSON.stringify(day1),
      "general/2026-10-09.json": JSON.stringify(day2),
    }))
    const general = out.find((c) => c.name === "general")!
    expect(general.description).toBe("Company chat")
    expect(general.messages).toHaveLength(2)
    expect(general.messages[0].author).toBe("ada")
    expect(general.messages[0].text).toBe("Hello @Grace Hopper, see the docs (https://example.com) & #general")
    expect(general.messages[1].isReply).toBe(true)
    expect(out.find((c) => c.name === "empty")!.messages).toHaveLength(0)
  })

  it("rejects something that is not a Slack export", () => {
    expect(() => parseSlackExport(zip({ "hello.json": "{}" }))).toThrow(/Slack export/)
  })

  it("cleans mentions and entities", () => {
    expect(cleanSlackText("<!channel> a &lt;b&gt;", new Map(), new Map())).toBe("@channel a <b>")
  })
})

describe("Notion import", () => {
  it("reads markdown pages, titles and strips ids from file names", () => {
    const pages = parseNotionExport(zip({
      "Export/Roadmap 0123456789abcdef0123456789abcdef.md": "# Q4 Roadmap\n\nShip importers.",
      "Export/Untitled thing fedcba9876543210fedcba9876543210.md": "Just text",
      "Export/data.csv": "a,b",
    }))
    expect(pages).toHaveLength(2)
    expect(pages.find((p) => p.title === "Q4 Roadmap")!.body).toBe("Ship importers.")
    expect(pages.find((p) => p.title === "Untitled thing")!.body).toBe("Just text")
  })
})
