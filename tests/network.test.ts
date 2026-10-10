// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { readFileSync } from "node:fs"
import vm from "node:vm"
import {
  NetworkError, RECONNECT_GRACE_MS, clearAllDrafts, clearDraft, isLowData, linkStatus, loadDraft, postFile, retryDelay, saveDraft, withRetry,
} from "../src/lib/network"

describe("link status", () => {
  const base = { browserOnline: true, socketConnected: true, hasEverConnected: true, socketDownMs: 0 }
  it("is online when everything is connected", () => expect(linkStatus(base)).toBe("online"))
  it("is offline whenever the browser has no network", () => expect(linkStatus({ ...base, browserOnline: false })).toBe("offline"))
  it("ignores short drops of the live link, then reports reconnecting", () => {
    const down = { ...base, socketConnected: false }
    expect(linkStatus({ ...down, socketDownMs: RECONNECT_GRACE_MS - 1 })).toBe("online")
    expect(linkStatus({ ...down, socketDownMs: RECONNECT_GRACE_MS })).toBe("reconnecting")
  })
  it("does not call the first page load a reconnect", () => {
    expect(linkStatus({ ...base, socketConnected: false, hasEverConnected: false, socketDownMs: 60_000 })).toBe("online")
  })
})

describe("low data", () => {
  it("follows the browser's data saver and slow connection types", () => {
    expect(isLowData({ saveData: true })).toBe(true)
    expect(isLowData({ effectiveType: "2g" })).toBe(true)
    expect(isLowData({ effectiveType: "slow-2g" })).toBe(true)
    expect(isLowData({ downlink: 0.4 })).toBe(true)
    expect(isLowData({ effectiveType: "4g", downlink: 10 })).toBe(false)
    expect(isLowData(undefined)).toBe(false)
  })
  it("lets the person's choice win", () => {
    expect(isLowData({ effectiveType: "4g", downlink: 10 }, "on")).toBe(true)
    expect(isLowData({ saveData: true, effectiveType: "2g" }, "off")).toBe(false)
  })
})

describe("retry", () => {
  it("backs off 1s, 2s, 4s and stops growing at 8s", () => {
    expect([0, 1, 2, 3, 4, 9].map(retryDelay)).toEqual([1000, 2000, 4000, 8000, 8000, 8000])
  })
  it("retries network errors, then gives up with the same error", async () => {
    const sleeps: number[] = []
    const fn = vi.fn().mockRejectedValue(new NetworkError("down"))
    await expect(withRetry(fn, 2, async (ms) => { sleeps.push(ms) })).rejects.toThrow("down")
    expect(fn).toHaveBeenCalledTimes(3)
    expect(sleeps).toEqual([1000, 2000])
  })
  it("succeeds on a later try", async () => {
    const fn = vi.fn().mockRejectedValueOnce(new NetworkError("x")).mockResolvedValue("ok")
    expect(await withRetry(fn, 2, async () => {})).toBe("ok")
  })
  it("does not retry a real refusal", async () => {
    const fn = vi.fn().mockRejectedValue(new Error("too big"))
    await expect(withRetry(fn, 2, async () => {})).rejects.toThrow("too big")
    expect(fn).toHaveBeenCalledTimes(1)
  })
})

describe("upload", () => {
  type Handler = ((e?: unknown) => void) | null
  class FakeXHR {
    static last: FakeXHR
    status = 0
    responseText = ""
    upload: { onprogress: ((e: { lengthComputable: boolean; loaded: number; total: number }) => void) | null } = { onprogress: null }
    onload: Handler = null
    onerror: Handler = null
    onabort: Handler = null
    aborted = false
    constructor() { FakeXHR.last = this }
    open() {}
    setRequestHeader() {}
    send() {}
    abort() { this.aborted = true; this.onabort?.() }
  }
  beforeEach(() => { vi.useFakeTimers(); vi.stubGlobal("XMLHttpRequest", FakeXHR) })
  afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals() })
  const file = new File(["abc"], "a.png", { type: "image/png" })

  it("reports progress and resolves with the storage id", async () => {
    const seen: number[] = []
    const p = postFile("https://x", file, { onProgress: (g) => seen.push(Math.round((g.loaded / g.total) * 100)) })
    FakeXHR.last.upload.onprogress?.({ lengthComputable: true, loaded: 50, total: 100 })
    FakeXHR.last.status = 200
    FakeXHR.last.responseText = JSON.stringify({ storageId: "abc" })
    FakeXHR.last.onload?.()
    expect(await p).toEqual({ storageId: "abc" })
    expect(seen).toEqual([50])
  })
  it("gives up when nothing moves for the stall time, and says to retry", async () => {
    const p = postFile("https://x", file, { stallMs: 5000 })
    const assertion = expect(p).rejects.toBeInstanceOf(NetworkError)
    await vi.advanceTimersByTimeAsync(5001)
    await assertion
    expect(FakeXHR.last.aborted).toBe(true)
  })
  it("a slow but moving upload is not cut off", async () => {
    const p = postFile("https://x", file, { stallMs: 5000 })
    for (let i = 0; i < 4; i++) {
      await vi.advanceTimersByTimeAsync(4000)
      FakeXHR.last.upload.onprogress?.({ lengthComputable: true, loaded: i, total: 10 })
    }
    FakeXHR.last.status = 200
    FakeXHR.last.responseText = JSON.stringify({ storageId: "z" })
    FakeXHR.last.onload?.()
    expect(await p).toEqual({ storageId: "z" })
  })
  it("treats a network failure and a server error as retryable, a 4xx as a refusal", async () => {
    const a = postFile("https://x", file)
    FakeXHR.last.onerror?.()
    await expect(a).rejects.toBeInstanceOf(NetworkError)
    const b = postFile("https://x", file)
    FakeXHR.last.status = 503
    FakeXHR.last.onload?.()
    await expect(b).rejects.toBeInstanceOf(NetworkError)
    const c = postFile("https://x", file)
    FakeXHR.last.status = 413
    FakeXHR.last.onload?.()
    await expect(c).rejects.not.toBeInstanceOf(NetworkError)
  })
})

describe("saved drafts", () => {
  beforeEach(() => localStorage.clear())
  const delta = { ops: [{ insert: "hello\n" }] }
  it("round-trips and clears", () => {
    saveDraft("a", delta, false)
    expect(loadDraft("a")).toEqual(delta.ops)
    clearDraft("a")
    expect(loadDraft("a")).toBeNull()
  })
  it("removes the draft when the box is emptied", () => {
    saveDraft("a", delta, false)
    saveDraft("a", { ops: [{ insert: "\n" }] }, true)
    expect(loadDraft("a")).toBeNull()
  })
  it("ignores damaged data", () => {
    localStorage.setItem("wfx:draft:a", "{not json")
    expect(loadDraft("a")).toBeNull()
  })
  it("sign-out removes every draft and nothing else", () => {
    saveDraft("a", delta, false)
    saveDraft("b", delta, false)
    localStorage.setItem("wfx-theme", "onyx")
    clearAllDrafts()
    expect(loadDraft("a")).toBeNull()
    expect(loadDraft("b")).toBeNull()
    expect(localStorage.getItem("wfx-theme")).toBe("onyx")
  })
})

describe("service worker", () => {
  const src = readFileSync("public/sw.js", "utf8")
  const run = async (fetchImpl: () => Promise<Response>, cached: Response | undefined, request: { mode: string; method: string }) => {
    const listeners: Record<string, (e: unknown) => void> = {}
    const self = { addEventListener: (t: string, cb: (e: unknown) => void) => { listeners[t] = cb }, skipWaiting: () => Promise.resolve(), clients: { claim: () => Promise.resolve() }, registration: {}, location: { origin: "https://x" } }
    const ctx = vm.createContext({ self, fetch: fetchImpl, caches: { match: async () => cached, open: async () => ({ add: async () => {} }), keys: async () => [], delete: async () => true }, Request, Response, URL, Promise })
    vm.runInContext(src, ctx)
    let responded: Promise<Response> | undefined
    listeners.fetch({ request, respondWith: (p: Promise<Response>) => { responded = p } })
    return responded ? await responded : undefined
  }
  it("shows the offline page when a page navigation fails", async () => {
    const page = new Response("offline page")
    const r = await run(() => Promise.reject(new TypeError("net")), page, { mode: "navigate", method: "GET" })
    expect(await r?.text()).toBe("offline page")
  })
  it("passes a working page through untouched", async () => {
    const r = await run(async () => new Response("real"), undefined, { mode: "navigate", method: "GET" })
    expect(await r?.text()).toBe("real")
  })
  it("never touches scripts, data or non-GET requests", async () => {
    expect(await run(() => Promise.reject(new Error("x")), undefined, { mode: "cors", method: "GET" })).toBeUndefined()
    expect(await run(() => Promise.reject(new Error("x")), undefined, { mode: "navigate", method: "POST" })).toBeUndefined()
  })
  it("the offline page is self-contained and has no script", () => {
    const html = readFileSync("public/offline.html", "utf8")
    expect(html).not.toMatch(/<script/i)
    expect(html).not.toMatch(/src=|href="https?:/i)
  })
})
