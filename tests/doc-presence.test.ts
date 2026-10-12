import { describe, expect, it } from "vitest"
import { foldPeople, inkOn, initialsOf, safeColor, typingLabel, type ClientInfo, type DocPerson } from "../src/app/dashboard/workspace/[workspaceId]/docs/components/presence"

const tab = (connectionId: number, id: string, name: string, extra: { color?: string; typing?: boolean; avatar?: string; clientId?: number } = {}) => ({
  connectionId,
  id,
  info: { name, avatar: extra.avatar ?? "", color: "#381d2a" },
  presence: {
    __yjs_clientid: extra.clientId ?? connectionId * 10,
    __yjs: { user: { name: "Spoofed name", color: extra.color ?? "#3b82f6" }, activity: { typing: extra.typing ?? false } },
  },
})

describe("foldPeople", () => {
  it("shows one person per account however many tabs they have open, and remembers every tab", () => {
    const clients = new Map<number, ClientInfo>()
    const people = foldPeople([tab(1, "u1", "Liam"), tab(2, "u1", "Liam"), tab(3, "u2", "Dev")], "me", clients)
    expect(people.map((p) => p.name)).toEqual(["Liam", "Dev"])
    expect(people[0].clientIds).toEqual([10, 20])
    expect(clients.get(30)).toEqual({ name: "Dev", avatar: "" })
  })

  it("leaves out your own other tabs but still labels their carets", () => {
    const clients = new Map<number, ClientInfo>()
    const people = foldPeople([tab(1, "me", "Shah"), tab(2, "u1", "Liam")], "me", clients)
    expect(people.map((p) => p.id)).toEqual(["u1"])
    expect(clients.get(10)?.name).toBe("Shah")
  })

  it("takes the name from the server, not from what a browser claims", () => {
    expect(foldPeople([tab(1, "u1", "Liam")], "me")[0].name).toBe("Liam")
  })

  it("uses the caret colour, and falls back when a browser sends something that is not a colour", () => {
    expect(foldPeople([tab(1, "u1", "Liam", { color: "#10b981" })], "me")[0].color).toBe("#10b981")
    expect(foldPeople([tab(1, "u1", "Liam", { color: "red; background: url(x)" })], "me")[0].color).toBe("#ff5018")
  })

  it("marks someone as typing when any of their tabs is", () => {
    const people = foldPeople([tab(1, "u1", "Liam"), tab(2, "u1", "Liam", { typing: true })], "me")
    expect(people[0].typing).toBe(true)
  })

  it("copes with a connection that has not sent anything yet", () => {
    const people = foldPeople([{ connectionId: 7 }], "me")
    expect(people).toEqual([{ id: "connection-7", name: "Someone", avatar: "", color: "#ff5018", typing: false, self: false, clientIds: [] }])
  })
})

const person = (name: string, typing: boolean, self = false): DocPerson => ({ id: name, name, avatar: "", color: "#ff5018", typing, self, clientIds: [] })

describe("typingLabel", () => {
  it("names one or two people and counts more", () => {
    expect(typingLabel([person("Liam Park", true), person("Dev", false)])).toBe("Liam is typing…")
    expect(typingLabel([person("Liam", true), person("Dev", true)])).toBe("Liam and Dev are typing…")
    expect(typingLabel([person("A", true), person("B", true), person("C", true)])).toBe("3 people are typing…")
  })
  it("says nothing when nobody else is typing", () => {
    expect(typingLabel([person("Liam", false), person("Me", true, true)])).toBeNull()
  })
})

describe("presence helpers", () => {
  it("makes initials from a name", () => {
    expect(initialsOf("Liam Park")).toBe("LP")
    expect(initialsOf("dev")).toBe("D")
    expect(initialsOf("  ")).toBe("?")
  })
  it("picks readable text for a colour", () => {
    expect(inkOn("#f59e0b")).toBe("#1b1017")
    expect(inkOn("#381d2a")).toBe("#ffffff")
  })
  it("only lets plain hex colours through", () => {
    expect(safeColor("#ABCDEF")).toBe("#ABCDEF")
    expect(safeColor("blue")).toBe("#ff5018")
    expect(safeColor(undefined)).toBe("#ff5018")
  })
})
