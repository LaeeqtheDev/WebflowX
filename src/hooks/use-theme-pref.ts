"use client"
import { useCallback, useSyncExternalStore } from "react"
import { useMutation } from "convex/react"
import { api } from "../../convex/_generated/api"
import { applyTheme, storeTheme, type ThemePref } from "@/lib/theme"

// Is the app currently dark? (watches the class on <html>, so charts, emoji picker and toasts can follow it)
export const useIsDark = () =>
    useSyncExternalStore(
        (cb) => {
            const obs = new MutationObserver(cb)
            obs.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] })
            return () => obs.disconnect()
        },
        () => document.documentElement.classList.contains("dark"),
        () => false
    )

// Changes the signed-in member's theme: instantly on screen, then saved to their account.
export const useSetTheme = () => {
    const save = useMutation(api.users.setTheme)
    return useCallback(
        async (pref: ThemePref) => {
            storeTheme(pref)
            applyTheme(pref)
            await save({ theme: pref })
        },
        [save]
    )
}
