import { describe, it, expect } from "vitest"
import { sameKind } from "@/lib/soft-nav"

const ch = (w: string, c: string) => `/dashboard/workspace/${w}/channel/${c}`
const dm = (w: string, m: string) => `/dashboard/workspace/${w}/member/${m}`

describe("soft navigation", () => {
  it("switches in place between two channels, or two DMs, of one workspace", () => {
    expect(sameKind(ch("w1", "a"), ch("w1", "b"))).toBe(true)
    expect(sameKind(dm("w1", "a"), dm("w1", "b"))).toBe(true)
  })
  it("leaves everything else to the normal router", () => {
    expect(sameKind(ch("w1", "a"), dm("w1", "b"))).toBe(false)
    expect(sameKind(ch("w1", "a"), ch("w2", "b"))).toBe(false)
    expect(sameKind("/dashboard/workspace/w1/tasks", ch("w1", "b"))).toBe(false)
    expect(sameKind(ch("w1", "a"), "/dashboard/workspace/w1/tasks")).toBe(false)
    expect(sameKind(ch("w1", "a"), "https://evil.com/dashboard/workspace/w1/channel/b")).toBe(false)
  })
})
