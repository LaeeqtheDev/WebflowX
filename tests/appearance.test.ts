import { describe, expect, it } from "vitest"
import { readFileSync } from "node:fs"
import { execSync } from "node:child_process"
import { ACCENT_IDS, FONT_SCALES, THEME_IDS } from "../convex/appearanceDefs"
import { ACCENT_META, DEFAULT_LOOK, THEME_META, isLook, isThemePref } from "../src/lib/theme"

const css = readFileSync("src/app/globals.css", "utf8")
const boot = readFileSync("public/theme-boot.js", "utf8")
const schema = readFileSync("convex/schema.ts", "utf8")
const users = readFileSync("convex/users.ts", "utf8")

describe("appearance", () => {
  it("every theme has CSS (the two original ones live in :root and .dark)", () => {
    for (const id of THEME_IDS) {
      if (id === "system" || id === "light" || id === "dark") continue
      expect(css, id).toContain(`html[data-theme="${id}"]`)
    }
  })
  it("every accent has CSS for light and dark", () => {
    for (const id of ACCENT_IDS) {
      if (id === "ember") continue
      expect(css, id).toContain(`html[data-accent="${id}"]`)
      expect(css, id).toContain(`html.dark[data-accent="${id}"]`)
    }
  })
  it("picker metadata covers every concrete theme and accent", () => {
    expect(Object.keys(THEME_META).sort()).toEqual(THEME_IDS.filter((t) => t !== "system").sort())
    expect(Object.keys(ACCENT_META).sort()).toEqual([...ACCENT_IDS].sort())
  })
  it("the pre-paint script knows which themes are dark", () => {
    for (const [id, meta] of Object.entries(THEME_META)) {
      expect(boot).toMatch(new RegExp(`${id}:${meta.scheme === "dark" ? 1 : 0}`))
    }
  })
  it("backend validators accept exactly the ids the app offers", () => {
    for (const id of THEME_IDS) expect(users).toContain(`v.literal("${id}")`)
    for (const id of ACCENT_IDS) { expect(users).toContain(`v.literal("${id}")`); expect(schema).toContain(`v.literal("${id}")`) }
    for (const f of FONT_SCALES) expect(users).toContain(`v.literal(${f})`)
  })
  it("validates stored values", () => {
    expect(isThemePref("onyx")).toBe(true)
    expect(isThemePref("neon")).toBe(false)
    expect(isLook(DEFAULT_LOOK)).toBe(true)
    expect(isLook({ ...DEFAULT_LOOK, fontScale: 80 })).toBe(false)
    expect(isLook({ ...DEFAULT_LOOK, accent: "red" })).toBe(false)
  })
  it("no hardcoded brand orange is left in app components", () => {
    const hits = execSync(`grep -rnE "\\[#(ff5018|e6430f)\\]" src/app/dashboard src/features src/components/ui || true`).toString().trim()
    expect(hits).toBe("")
  })
  it("the app frame uses theme colors, not hardcoded plum", () => {
    const hits = execSync(`grep -rnE "\\[#(381d2a|4a2838|402633|2a1722|1e1019|2a1420|241620|1a0f15)\\]" src/app/dashboard src/features src/components/ui || true`).toString().trim()
    expect(hits).toBe("")
  })
  it("every theme sets the frame colors", () => {
    for (const id of ["snow", "ash", "onyx", "midnight", "forest"]) {
      const block = css.slice(css.indexOf(`html[data-theme="${id}"]`)).split("}")[0]
      for (const v of ["--wfx-rail", "--wfx-chrome", "--wfx-avatar", "--sidebar:"]) expect(block, `${id} ${v}`).toContain(v)
    }
  })
})
