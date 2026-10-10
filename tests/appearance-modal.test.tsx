// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest"
import { cleanup, render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { createElement } from "react"

const calls: Record<string, unknown[]> = { setTheme: [], setLook: [] }
vi.mock("convex/react", () => ({
  useMutation: (ref: { name: string }) => async (args: unknown) => { calls[ref.name].push(args); return args },
  useQuery: () => undefined,
}))
vi.mock("../convex/_generated/api", () => ({ api: { users: { setTheme: { name: "setTheme" }, setLook: { name: "setLook" } } } }))
vi.mock("sonner", () => ({ toast: { error: vi.fn() } }))

import { AppearanceModal } from "../src/features/auth/components/appearance-modal"
import { clearAppearance } from "../src/lib/theme"

const user = { _id: "u1", theme: "system" } as never
const open = () => render(createElement(AppearanceModal, { open: true, setOpen: () => {}, user }))
const root = document.documentElement
window.matchMedia = window.matchMedia ?? ((q: string) => ({ matches: false, media: q, addEventListener() {}, removeEventListener() {} }) as unknown as MediaQueryList)

afterEach(() => { cleanup(); clearAppearance(); calls.setTheme.length = 0; calls.setLook.length = 0; window.localStorage.clear() })

describe("AppearanceModal", () => {
  it("applies a theme at once and saves it", async () => {
    const u = userEvent.setup()
    open()
    await u.click(screen.getByRole("radio", { name: "Onyx, dark" }))
    expect(root.dataset.theme).toBe("onyx")
    expect(root.classList.contains("dark")).toBe(true)
    expect(calls.setTheme).toEqual([{ theme: "onyx" }])
    await u.click(screen.getByRole("radio", { name: "Snow, light" }))
    expect(root.dataset.theme).toBe("snow")
    expect(root.classList.contains("dark")).toBe(false)
    expect(window.localStorage.getItem("wfx-theme")).toBe("snow")
  })

  it("changes accent, density, text size and motion, and saves the whole look", async () => {
    const u = userEvent.setup()
    open()
    await u.click(screen.getByRole("radio", { name: "Ocean" }))
    expect(root.dataset.accent).toBe("ocean")
    expect(calls.setLook.at(-1)).toMatchObject({ accent: "ocean", density: "cozy", fontScale: 100, reducedMotion: false })
    await u.click(screen.getByRole("radio", { name: "Compact" }))
    expect(root.dataset.density).toBe("compact")
    await u.click(screen.getByRole("radio", { name: "Large" }))
    expect(root.style.fontSize).toBe("112%")
    await u.click(screen.getByRole("checkbox", { name: "Reduce motion" }))
    expect(root.dataset.motion).toBe("reduced")
    expect(JSON.parse(window.localStorage.getItem("wfx-look")!)).toEqual({ accent: "ocean", density: "compact", fontScale: 112, reducedMotion: true })
  })

  it("reset goes back to Sync with computer and the default look", async () => {
    const u = userEvent.setup()
    open()
    await u.click(screen.getByRole("radio", { name: "Ocean" }))
    await u.click(screen.getByRole("button", { name: /Reset to defaults/ }))
    expect(calls.setTheme.at(-1)).toEqual({ theme: "system" })
    expect(root.dataset.accent).toBe("ember")
    expect(root.style.fontSize).toBe("")
  })
})
