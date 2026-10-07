"use client"
import { useCallback, useEffect, useState } from "react"
import { useMutation, useQuery } from "convex/react"
import { api } from "../../../convex/_generated/api"

type BeforeInstallPromptEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> }

const toBytes = (b64: string) => {
  const pad = "=".repeat((4 - (b64.length % 4)) % 4)
  const raw = atob((b64 + pad).replace(/-/g, "+").replace(/_/g, "/"))
  return Uint8Array.from(raw, (c) => c.charCodeAt(0))
}

const toB64 = (buf: ArrayBuffer | null) => {
  if (!buf) return ""
  let s = ""
  for (const b of new Uint8Array(buf)) s += String.fromCharCode(b)
  return btoa(s)
}

const supportsPush = () =>
  typeof window !== "undefined" && "serviceWorker" in navigator && "PushManager" in window && "Notification" in window

export type PushState = "loading" | "unsupported" | "unconfigured" | "blocked" | "off" | "on"

// Browser notifications for this device: turn on / off, and the "install app" prompt.
export const usePush = () => {
  const cfg = useQuery(api.push.config)
  const subscribe = useMutation(api.push.subscribe)
  const unsubscribe = useMutation(api.push.unsubscribe)
  const [state, setState] = useState<PushState>("loading")
  const [busy, setBusy] = useState(false)
  const [installEvent, setInstallEvent] = useState<BeforeInstallPromptEvent | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const onPrompt = (e: Event) => { e.preventDefault(); setInstallEvent(e as BeforeInstallPromptEvent) }
    window.addEventListener("beforeinstallprompt", onPrompt)
    return () => window.removeEventListener("beforeinstallprompt", onPrompt)
  }, [])

  useEffect(() => {
    if (cfg === undefined) return
    let cancelled = false
    const run = async () => {
      let next: PushState
      if (!supportsPush()) next = "unsupported"
      else if (!cfg.publicKey) next = "unconfigured"
      else if (Notification.permission === "denied") next = "blocked"
      else {
        try {
          const reg = await navigator.serviceWorker.getRegistration()
          const sub = await reg?.pushManager.getSubscription()
          next = sub && Notification.permission === "granted" ? "on" : "off"
        } catch { next = "off" }
      }
      if (!cancelled) setState(next)
    }
    void run()
    return () => { cancelled = true }
  }, [cfg])

  const enable = useCallback(async () => {
    if (!cfg?.publicKey || !supportsPush()) return
    setBusy(true); setError(null)
    try {
      const permission = await Notification.requestPermission()
      if (permission !== "granted") { setState(permission === "denied" ? "blocked" : "off"); return }
      const reg = await navigator.serviceWorker.register("/sw.js")
      await navigator.serviceWorker.ready
      let sub = await reg.pushManager.getSubscription()
      if (!sub) sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: toBytes(cfg.publicKey) as BufferSource })
      await subscribe({ endpoint: sub.endpoint, p256dh: toB64(sub.getKey("p256dh")), authKey: toB64(sub.getKey("auth")) })
      setState("on")
    } catch {
      setError("Couldn't turn notifications on in this browser.")
    } finally { setBusy(false) }
  }, [cfg, subscribe])

  const disable = useCallback(async () => {
    setBusy(true); setError(null)
    try {
      const reg = await navigator.serviceWorker.getRegistration()
      const sub = await reg?.pushManager.getSubscription()
      if (sub) {
        await unsubscribe({ endpoint: sub.endpoint })
        await sub.unsubscribe()
      }
      setState("off")
    } catch {
      setError("Couldn't turn notifications off.")
    } finally { setBusy(false) }
  }, [unsubscribe])

  const install = useCallback(async () => {
    if (!installEvent) return
    await installEvent.prompt()
    setInstallEvent(null)
  }, [installEvent])

  return { state, busy, error, enable, disable, canInstall: !!installEvent, install }
}
