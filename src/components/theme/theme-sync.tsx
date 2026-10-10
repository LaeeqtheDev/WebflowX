"use client"
import { useEffect } from "react"
import { useQuery } from "convex/react"
import { api } from "../../../convex/_generated/api"
import {
    applyLook, applyTheme, clearAppearance, DEFAULT_LOOK, isLook, isThemePref, readStoredLook, readStoredTheme, storeLook, storeTheme,
    type ThemePref,
} from "@/lib/theme"

// Mounted inside the signed-in app. Appearance is a per-member setting saved on the account, so it
// follows each person to any device. localStorage only makes the first paint instant.
export const ThemeSync = () => {
    const me = useQuery(api.users.current)
    const saved: ThemePref | undefined = me && isThemePref(me.theme) ? me.theme : undefined
    const savedLook = me && isLook(me.look) ? me.look : undefined

    useEffect(() => {
        if (me === undefined) return // still loading: the boot script already applied the stored look
        const pref = saved ?? readStoredTheme()
        storeTheme(pref)
        applyTheme(pref)
        if (pref !== "system") return
        const mq = window.matchMedia("(prefers-color-scheme: dark)")
        const onChange = () => applyTheme("system")
        mq.addEventListener("change", onChange)
        return () => mq.removeEventListener("change", onChange)
    }, [me, saved])

    useEffect(() => {
        if (me === undefined) return
        const look = savedLook ?? (me ? readStoredLook() : DEFAULT_LOOK)
        storeLook(look)
        applyLook(look)
    }, [me, savedLook])

    // leaving the app (landing page, sign-in) goes back to the plain light look
    useEffect(() => () => clearAppearance(), [])

    return null
}
