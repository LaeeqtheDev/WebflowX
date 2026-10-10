import { describe, it, expect } from "vitest"
import { recallMessages, rememberMessages } from "@/lib/message-cache"

describe("message cache", () => {
  it("returns what was last seen for a channel", () => {
    rememberMessages("c1", [{ id: 1 }])
    expect(recallMessages("c1")).toEqual([{ id: 1 }])
    expect(recallMessages("nope")).toBeUndefined()
  })
  it("never replaces a good copy with an empty one", () => {
    rememberMessages("c2", [{ id: 1 }])
    rememberMessages("c2", [])
    expect(recallMessages("c2")).toEqual([{ id: 1 }])
  })
  it("keeps only the most recent channels", () => {
    for (let i = 0; i < 40; i++) rememberMessages(`k${i}`, [{ i }])
    expect(recallMessages("k0")).toBeUndefined()
    expect(recallMessages("k39")).toBeDefined()
  })
})
