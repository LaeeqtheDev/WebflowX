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
  it("the meeting room and other dark surfaces use theme colours, not fixed plum shades", () => {
    const hits = execSync(`grep -rnE "\\[#(150c11|1b1017|f4ece7|ff8a63|c73a0a)\\]|rgba\\(255, ?80, ?24" src/app/dashboard src/features/databases src/features/onboarding || true`).toString().trim()
    expect(hits).toBe("")
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

// WCAG contrast of the colours the themes and accents are built from.
const lum = (h: string) => {
  const c = [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4))
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]
}
const ratio = (a: string, b: string) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05) }
const mix = (f: string, b: string, a: number) =>
  "#" + [1, 3, 5].map((i) => Math.round(parseInt(f.slice(i, i + 2), 16) * a + parseInt(b.slice(i, i + 2), 16) * (1 - a)).toString(16).padStart(2, "0")).join("")
const pick = (block: string, name: string) => new RegExp(`${name}: (#[0-9a-fA-F]{6})`).exec(block)?.[1]

describe("contrast", () => {
  it("white text on every accent is readable (ember is the original brand colour, kept at the large-text level)", () => {
    for (const m of css.matchAll(/^html\[data-accent="(\w+)"\] \{([^}]*)\}/gm)) {
      expect(ratio("#ffffff", pick(m[2], "--wfx-accent")!), `${m[1]} accent`).toBeGreaterThanOrEqual(4.5)
      expect(ratio("#ffffff", pick(m[2], "--wfx-accent-hover")!), `${m[1]} hover`).toBeGreaterThanOrEqual(4.5)
    }
    expect(ratio("#ffffff", "#ff5018")).toBeGreaterThanOrEqual(3)
  })
  it("slate accent stays usable on dark themes", () => {
    const m = /html\.dark\[data-accent="slate"\] \{([^}]*)\}/.exec(css)![1]
    expect(ratio("#ffffff", pick(m, "--wfx-accent")!)).toBeGreaterThanOrEqual(4.5)
  })
  it("link-colour text of every accent reads on every theme background", () => {
    const bgs: Record<string, [string, boolean]> = { light: ["#fbf9f7", false], snow: ["#f4f6f9", false], dark: ["#1a0f15", true], ash: ["#313338", true], onyx: ["#000000", true], midnight: ["#101830", true], forest: ["#12241b", true] }
    for (const m of css.matchAll(/^html(\.dark)?\[data-accent="(\w+)"\] \{([^}]*)\}/gm)) {
      const ink = pick(m[3], "--wfx-orange-ink")!
      for (const [t, [bg, isDark]] of Object.entries(bgs)) {
        if (!!m[1] !== isDark) continue
        expect(ratio(ink, bg), `${m[2]} on ${t}`).toBeGreaterThanOrEqual(4.5)
      }
    }
  })
  it("body text and 60% text read on each theme's surfaces", () => {
    for (const id of ["snow", "ash", "onyx", "midnight", "forest"]) {
      const b = css.slice(css.indexOf(`html[data-theme="${id}"]`)).split("\n}")[0]
      const ink = pick(b, "--wfx-ink")!
      for (const s of ["--background", "--wfx-cream-soft", "--wfx-cream-deep", "--wfx-surface"]) {
        const bg = pick(b, s)!
        expect(ratio(ink, bg), `${id} ink on ${s}`).toBeGreaterThanOrEqual(7)
        expect(ratio(mix(ink, bg, 0.6), bg), `${id} ink/60 on ${s}`).toBeGreaterThanOrEqual(4.5)
      }
      expect(ratio("#ffffff", pick(b, "--wfx-avatar")!), `${id} avatar`).toBeGreaterThanOrEqual(7)
    }
  })
  it("no faint text/50 or /55 is left (it fails AA on the light themes)", () => {
    const hits = execSync(`grep -rnE "text-ink/(50|55)([^0-9]|$)" src || true`).toString().trim()
    expect(hits).toBe("")
  })
})
