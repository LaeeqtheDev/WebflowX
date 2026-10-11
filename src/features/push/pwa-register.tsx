"use client"
import { useEffect } from "react"

// Registers the service worker once the signed-in app loads, which is what makes the app installable.
export const PwaRegister = () => {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return
    // Not needed to show the app, so it waits until the page has loaded and the browser is idle rather than
    // competing with the first screen's scripts and queries.
    const register = () => {
      const run = () => navigator.serviceWorker.register("/sw.js").catch(() => {})
      const ric = (window as Window & { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number }).requestIdleCallback
      if (ric) ric(run, { timeout: 5000 })
      else setTimeout(run, 2000)
    }
    if (document.readyState === "complete") register()
    else { window.addEventListener("load", register, { once: true }); return () => window.removeEventListener("load", register) }
  }, [])
  return null
}
