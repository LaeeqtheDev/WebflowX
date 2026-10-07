"use client"
import { useEffect } from "react"

// Registers the service worker once the signed-in app loads, which is what makes the app installable.
export const PwaRegister = () => {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return
    navigator.serviceWorker.register("/sw.js").catch(() => {})
  }, [])
  return null
}
