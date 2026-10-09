import { describe, expect, it } from "vitest"
import { safeNext } from "../src/lib/safe-next"

describe("safeNext", () => {
  it("accepts in-site paths", () => {
    expect(safeNext("/dashboard")).toBe("/dashboard")
    expect(safeNext("/join/abc?code=123")).toBe("/join/abc?code=123")
  })
  it.each(["//evil.com", "/\\evil.com", "https://evil.com", "javascript:alert(1)", "evil", "/a\nb", ""])("rejects %j", (v) => {
    expect(safeNext(v)).toBeUndefined()
  })
  it("rejects missing and overlong values", () => {
    expect(safeNext(null)).toBeUndefined()
    expect(safeNext("/" + "a".repeat(2001))).toBeUndefined()
  })
})
