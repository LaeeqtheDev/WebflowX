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

  it("shows messages without loading the Quill editor", () => {
    const r = read(join(root, "src", "components", "renderer.tsx"))
    expect(r).not.toMatch(/from ["']quill["']/)
    expect(r).toMatch(/renderDelta/)
    const msg = read(join(root, "src", "app", "dashboard", "workspace", "[workspaceId]", "components", "message.tsx"))
    expect(msg).toMatch(/import Renderer from ["']@\/components\/renderer["']/)
  })

  it("builds the pinned/saved lookup once per result, not once per message", () => {
    expect(read(join(root, "src", "features", "marks", "use-marks.ts"))).toMatch(/WeakMap/)
  })

  it("checks sign-in in the middleware without a database call", () => {
    const m = read(join(root, "src", "middleware.ts"))
    expect(m).not.toMatch(/isAuthenticatedNextjs\(/)
    expect(m).toMatch(/tokenLooksValid/)
  })
})

describe("signed-in app weight", () => {
  const ws = join(root, "src", "app", "dashboard", "workspace", "[workspaceId]", "components")
  const importsStatically = (file: string, mod: RegExp) =>
    read(file).split("\n").some((l) => /^\s*import\s/.test(l) && !/import\s+type/.test(l) && mod.test(l))

  it("loads the settings, invite and account dialogs only when they are first opened", () => {
    expect(importsStatically(join(ws, "WorkspaceHeader.tsx"), /preferences-modal|inviteModal/)).toBe(false)
    const ub = join(root, "src", "features", "auth", "components", "user-button.tsx")
    expect(importsStatically(ub, /edit-profile-modal|security-modal|appearance-modal/)).toBe(false)
  })

  it("keeps the search palette (cmdk) out of the app shell", () => {
    expect(importsStatically(join(ws, "toolbar.tsx"), /ui\/command/)).toBe(false)
    expect(importsStatically(join(ws, "quick-switcher.tsx"), /ui\/command/)).toBe(false)
  })

  it("keeps the two-step sign-in screens and QR-code library out of the gate every page loads", () => {
    const gate = join(root, "src", "features", "security", "two-factor-gate.tsx")
    expect(importsStatically(gate, /two-factor-setup|two-factor-screens|auth-screen|auth-ui/)).toBe(false)
  })

  it("ships only English up front; other languages are fetched on demand", () => {
    const i = read(join(root, "src", "lib", "i18n", "index.tsx"))
    expect(i).not.toMatch(/^import\s.*from\s+["']\.\/(es|fr|de|pt|hi)["']/m)
    expect(i).toMatch(/import\(["']\.\/hi["']\)/)
  })

  it("does not make every message re-render when a thread or profile panel opens", () => {
    const m = read(join(ws, "message.tsx"))
    expect(m).not.toMatch(/usePanel\(\)/)
    expect(m).toMatch(/usePanelActions/)
  })

  it("builds each message's hover action bar only once that message is pointed at or focused", () => {
    expect(read(join(ws, "message.tsx"))).toMatch(/onPointerEnter=\{wake\}/)
    expect(read(join(ws, "Toolbar2.tsx"))).toMatch(/live &&/)
  })
})
