// @vitest-environment node
import { describe, it, expect } from "vitest"
import { readdirSync, readFileSync, statSync } from "node:fs"
import { join } from "node:path"

// Guards for the things that keep the public pages light. They read source, so they run anywhere without a build.
const root = join(__dirname, "..")
const walk = (dir: string): string[] =>
  readdirSync(dir).flatMap((f) => {
    const p = join(dir, f)
    return statSync(p).isDirectory() ? walk(p) : [p]
  })
const src = walk(join(root, "src")).filter((f) => /\.(ts|tsx)$/.test(f) && !/\.test\./.test(f))
const read = (f: string) => readFileSync(f, "utf8")

describe("public page weight", () => {
  it("only imports the animation library dynamically, so it stays out of the first-load JS", () => {
    const offenders = src.filter((f) => /^\s*import\s[^;]*from\s+["']gsap(\/[^"']*)?["']/m.test(read(f)) && !/import\s+type/.test(read(f).match(/^\s*import\s[^;]*from\s+["']gsap[^"']*["']/m)?.[0] ?? ""))
    expect(offenders).toEqual([])
  })

  it("keeps the sign-in page free of the animation library", () => {
    const auth = walk(join(root, "src", "features", "auth")).filter((f) => f.endsWith(".tsx"))
    expect(auth.filter((f) => /landing\/gsap|from ["']gsap/.test(read(f)))).toEqual([])
  })

  it("loads the Convex client only when the newsletter form is submitted", () => {
    const s = read(join(root, "src", "components", "newslettersignup.tsx"))
    expect(s).not.toMatch(/from ["']convex\/react["']/)
    expect(s).not.toMatch(/PublicConvexProvider/)
    expect(s).toMatch(/import\(["']convex\/browser["']\)/)
  })

  it("skips animation and warm-up downloads on very slow or data-saving connections", () => {
    expect(read(join(root, "src", "components", "landing", "gsap.ts"))).toMatch(/isLowData/)
    expect(read(join(root, "src", "lib", "preload.ts"))).toMatch(/isLowData/)
  })

  it("serves small images where a plain <image> bypasses the optimiser", () => {
    expect(statSync(join(root, "public", "logo-sm.png")).size).toBeLessThan(20_000)
  })
})
