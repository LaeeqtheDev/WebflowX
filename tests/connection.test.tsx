// @vitest-environment jsdom
/// <reference types="vite/client" />
import { act, cleanup, render, screen } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { ConvexProvider, type ConvexReactClient } from "convex/react"
import { ConnectionBanner } from "../src/components/connection-banner"
import { SendStatus } from "../src/components/send-status"

type State = { isWebSocketConnected: boolean; hasEverConnected: boolean }
const makeClient = (initial: State) => {
  let state = initial
  const subs = new Set<() => void>()
  const client = {
    connectionState: () => state,
    subscribeToConnectionState: (cb: () => void) => { subs.add(cb); return () => subs.delete(cb) },
  }
  return { client: client as unknown as ConvexReactClient, set: (s: State) => { state = s; subs.forEach((cb) => cb()) } }
}
const setOnline = (v: boolean) => Object.defineProperty(navigator, "onLine", { configurable: true, get: () => v })

describe("ConnectionBanner", () => {
  beforeEach(() => { vi.useFakeTimers(); setOnline(true); Object.defineProperty(window, "matchMedia", { value: () => ({ matches: false, addEventListener() {}, removeEventListener() {} }), configurable: true }) })
  afterEach(() => { cleanup(); vi.useRealTimers() })

  it("says nothing while connected", () => {
    const { client } = makeClient({ isWebSocketConnected: true, hasEverConnected: true })
    render(<ConvexProvider client={client}><ConnectionBanner /></ConvexProvider>)
    expect(screen.queryByRole("status")).toBeNull()
  })

  it("ignores a short drop, then shows Reconnecting, then Back online, then goes away", () => {
    const c = makeClient({ isWebSocketConnected: true, hasEverConnected: true })
    render(<ConvexProvider client={c.client}><ConnectionBanner /></ConvexProvider>)
    act(() => c.set({ isWebSocketConnected: false, hasEverConnected: true }))
    act(() => { vi.advanceTimersByTime(1500) })
    expect(screen.queryByRole("status")).toBeNull()
    act(() => { vi.advanceTimersByTime(2000) })
    expect(screen.getByRole("status").textContent).toMatch(/Reconnecting/)
    act(() => c.set({ isWebSocketConnected: true, hasEverConnected: true }))
    expect(screen.getByRole("status").textContent).toMatch(/Back online/)
    act(() => { vi.advanceTimersByTime(3000) })
    expect(screen.queryByRole("status")).toBeNull()
  })

  it("shows the offline message at once when the browser loses its network", () => {
    const c = makeClient({ isWebSocketConnected: true, hasEverConnected: true })
    render(<ConvexProvider client={c.client}><ConnectionBanner /></ConvexProvider>)
    act(() => { setOnline(false); window.dispatchEvent(new Event("offline")) })
    expect(screen.getByRole("status").textContent).toMatch(/You're offline/)
  })
})

describe("SendStatus", () => {
  beforeEach(() => { vi.useFakeTimers(); setOnline(true) })
  afterEach(() => { cleanup(); vi.useRealTimers() })
  const wrap = (ui: React.ReactNode, connected = true) => {
    const { client } = makeClient({ isWebSocketConnected: connected, hasEverConnected: true })
    return render(<ConvexProvider client={client}>{ui}</ConvexProvider>)
  }

  it("stays quiet for a quick send", () => {
    wrap(<SendStatus pending upload={null} />)
    act(() => { vi.advanceTimersByTime(800) })
    expect(screen.queryByRole("status")).toBeNull()
  })
  it("says Sending after a moment, and that it is slow after twelve seconds", () => {
    wrap(<SendStatus pending upload={null} />)
    act(() => { vi.advanceTimersByTime(1300) })
    expect(screen.getByRole("status").textContent).toBe("Sending…")
    act(() => { vi.advanceTimersByTime(11_000) })
    expect(screen.getByRole("status").textContent).toMatch(/longer than usual/)
  })
  it("shows upload progress", () => {
    wrap(<SendStatus pending upload={{ name: "photo.png", progress: { loaded: 40, total: 100 } }} />)
    act(() => { vi.advanceTimersByTime(1300) })
    expect(screen.getByRole("status").textContent).toMatch(/Uploading photo\.png 40%/)
  })
  it("explains the wait when offline and promises the text is saved", () => {
    setOnline(false)
    wrap(<SendStatus pending upload={null} />)
    act(() => { vi.advanceTimersByTime(1300) })
    expect(screen.getByRole("status").textContent).toMatch(/Waiting for your connection/)
  })
  it("shows nothing when not sending", () => {
    wrap(<SendStatus pending={false} upload={null} />)
    act(() => { vi.advanceTimersByTime(5000) })
    expect(screen.queryByRole("status")).toBeNull()
  })
})
