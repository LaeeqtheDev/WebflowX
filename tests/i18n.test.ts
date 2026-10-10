import { describe, expect, it } from "vitest"
import { DICTS, LOCALES, translate } from "../src/lib/i18n"
import { en } from "../src/lib/i18n/en"

const ph = (s: string) => (s.match(/\{[a-zA-Z]+\}/g) ?? []).sort().join(",")

describe("i18n", () => {
  for (const { code } of LOCALES) {
    it(`${code} has every key with the same placeholders`, () => {
      const d = DICTS[code] as Record<string, string>
      for (const [k, v] of Object.entries(en)) {
        expect(d[k], `${code} missing ${k}`).toBeTruthy()
        expect(ph(d[k]), `${code} placeholders differ for ${k}`).toBe(ph(v))
      }
      expect(Object.keys(d).sort()).toEqual(Object.keys(en).sort())
    })
  }
  it("fills placeholders and falls back to English", () => {
    expect(translate("en", "wiz.step", { n: 2, total: 5 })).toBe("Step 2 of 5")
    expect(translate("es", "wiz.step", { n: 2, total: 5 })).toBe("Paso 2 de 5")
  })
})
