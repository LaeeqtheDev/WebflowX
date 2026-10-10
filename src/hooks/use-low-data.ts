"use client"
import { useEffect, useSyncExternalStore } from "react"
import { DATA_SAVER_KEY, isDataSaverPref, isLowData, type DataSaverPref } from "@/lib/network"

// A tiny store so every component (avatars, images, the settings screen) reads the same answer.
let pref: DataSaverPref = "auto"
let low = false
const listeners = new Set<() => void>()

type NavConn = { saveData?: boolean; effectiveType?: string; downlink?: number; addEventListener?: (t: string, cb: () => void) => void; removeEventListener?: (t: string, cb: () => void) => void }
const connection = (): NavConn | undefined => (typeof navigator === "undefined" ? undefined : (navigator as Navigator & { connection?: NavConn }).connection)

const readPref = (): DataSaverPref => {
  try {
    const v = window.localStorage.getItem(DATA_SAVER_KEY)
    return isDataSaverPref(v) ? v : "auto"
  } catch { return "auto" }
}

const recompute = () => {
  const next = isLowData(connection(), pref)
  if (typeof document !== "undefined") document.documentElement.dataset.lowdata = next ? "1" : "0"
  if (next !== low) { low = next; listeners.forEach((l) => l()) }
}

export const setDataSaverPref = (p: DataSaverPref) => {
  pref = p
  try { window.localStorage.setItem(DATA_SAVER_KEY, p) } catch { /* private mode */ }
  recompute()
  listeners.forEach((l) => l())
}

const subscribe = (cb: () => void) => { listeners.add(cb); return () => { listeners.delete(cb) } }

/** True when the app should load less: the browser's data saver is on, the connection is very slow, or the person chose it. */
export const useLowData = () => useSyncExternalStore(subscribe, () => low, () => false)
export const useDataSaverPref = () => useSyncExternalStore(subscribe, () => pref, () => "auto" as DataSaverPref)

/** Mount once in the signed-in app: reads the setting and follows the connection as it changes. */
export const useLowDataSync = () => {
  useEffect(() => {
    pref = readPref()
    recompute()
    const c = connection()
    c?.addEventListener?.("change", recompute)
    return () => c?.removeEventListener?.("change", recompute)
  }, [])
}
