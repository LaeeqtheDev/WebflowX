// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from "vitest"
import { forgetLocation, lastLocation, rememberLocation } from "@/lib/last-location"

describe("last location", () => {
  beforeEach(() => localStorage.clear())
  it("remembers a channel and forgets it", () => {
    rememberLocation("/dashboard/workspace/abc123/channel/def456")
    expect(lastLocation()).toBe("/dashboard/workspace/abc123/channel/def456")
    forgetLocation()
    expect(lastLocation()).toBeNull()
  })
  it("only ever stores a channel path inside the app (no open redirects)", () => {
    for (const bad of ["https://evil.com", "//evil.com", "/dashboard/workspace/a/channel/b/../../x", "/other", "javascript:alert(1)", "/dashboard/workspace/a/tasks"]) {
      rememberLocation(bad)
      expect(lastLocation()).toBeNull()
    }
    localStorage.setItem("wfx:last-path", "https://evil.com")
    expect(lastLocation()).toBeNull()
  })
})
