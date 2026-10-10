import { describe, it, expect } from "vitest"
import { tokenLooksValid } from "@/lib/token-check"

const make = (payload: object) => `h.${Buffer.from(JSON.stringify(payload)).toString("base64url")}.s`
const now = 1_800_000_000_000

describe("tokenLooksValid", () => {
  it("accepts a token that expires later", () => expect(tokenLooksValid(make({ exp: now / 1000 + 3600 }), now)).toBe(true))
  it("rejects expired or nearly expired tokens", () => {
    expect(tokenLooksValid(make({ exp: now / 1000 - 1 }), now)).toBe(false)
    expect(tokenLooksValid(make({ exp: now / 1000 + 5 }), now)).toBe(false)
  })
  it("rejects missing, malformed or exp-less tokens", () => {
    for (const t of [undefined, null, "", "abc", "a.b", "a.!!!.c", make({}), make({ exp: "soon" })]) expect(tokenLooksValid(t as string, now)).toBe(false)
  })
})
