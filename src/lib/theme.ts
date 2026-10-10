import { ACCENT_IDS, DENSITIES, FONT_SCALES, THEME_IDS, type AccentId, type Density, type FontScale, type ThemeId } from "../../convex/appearanceDefs"

export type ThemePref = ThemeId
export type ConcreteTheme = Exclude<ThemePref, "system">
export const THEME_KEY = "wfx-theme"
export const LOOK_KEY = "wfx-look"
export const THEMES: readonly ThemePref[] = THEME_IDS

export const isThemePref = (v: unknown): v is ThemePref => typeof v === "string" && (THEME_IDS as readonly string[]).includes(v)

/** What each theme looks like in the picker: label, whether it is dark, and three swatch colours (page, panel, sidebar). */
export const THEME_META: Record<ConcreteTheme, { label: string; scheme: "light" | "dark"; swatch: [string, string, string] }> = {
    light: { label: "Sand", scheme: "light", swatch: ["#f7f2ee", "#ffffff", "#402633"] },
    snow: { label: "Snow", scheme: "light", swatch: ["#f4f6f9", "#ffffff", "#1e293b"] },
    dark: { label: "Plum", scheme: "dark", swatch: ["#1a0f15", "#241620", "#2a1722"] },
    ash: { label: "Ash", scheme: "dark", swatch: ["#232428", "#2b2d31", "#1e1f22"] },
    midnight: { label: "Midnight", scheme: "dark", swatch: ["#0b1020", "#121a2e", "#0a0f1d"] },
    forest: { label: "Forest", scheme: "dark", swatch: ["#0e1a14", "#14261e", "#0b1510"] },
    onyx: { label: "Onyx", scheme: "dark", swatch: ["#000000", "#0f0f0f", "#000000"] },
}

export const ACCENT_META: Record<AccentId, { label: string; color: string }> = {
    ember: { label: "Ember", color: "#ff5018" },
    ocean: { label: "Ocean", color: "#2563eb" },
    violet: { label: "Violet", color: "#7c3aed" },
    emerald: { label: "Emerald", color: "#047857" },
    rose: { label: "Rose", color: "#e11d48" },
    teal: { label: "Teal", color: "#0f766e" },
    gold: { label: "Gold", color: "#b45309" },
    slate: { label: "Slate", color: "#475569" },
}

export const systemPrefersDark = () =>
    typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: dark)").matches

/** The theme that is actually shown. "system" follows the computer: Sand in light mode, Plum in dark mode. */
export const resolveThemeId = (pref: ThemePref): ConcreteTheme =>
    pref === "system" ? (systemPrefersDark() ? "dark" : "light") : pref

export const resolveTheme = (pref: ThemePref): "light" | "dark" => THEME_META[resolveThemeId(pref)].scheme

// Sets the `dark` class and data-theme on <html>. Only the signed-in app ever calls this.
export const applyTheme = (pref: ThemePref) => {
    const id = resolveThemeId(pref)
    const root = document.documentElement
    root.classList.toggle("dark", THEME_META[id].scheme === "dark")
    root.dataset.theme = id
}

export const readStoredTheme = (): ThemePref => {
    try {
        const v = localStorage.getItem(THEME_KEY)
        return isThemePref(v) ? v : "system"
    } catch {
        return "system"
    }
}

export const storeTheme = (pref: ThemePref) => {
    try { localStorage.setItem(THEME_KEY, pref) } catch { /* private mode: the saved account setting still wins */ }
}

/* ---------- accent, density, text size, motion ---------- */

export type Look = { accent: AccentId; density: Density; fontScale: FontScale; reducedMotion: boolean }
export const DEFAULT_LOOK: Look = { accent: "ember", density: "cozy", fontScale: 100, reducedMotion: false }

export const isLook = (v: unknown): v is Look => {
    if (!v || typeof v !== "object") return false
    const l = v as Record<string, unknown>
    return (ACCENT_IDS as readonly unknown[]).includes(l.accent)
        && (DENSITIES as readonly unknown[]).includes(l.density)
        && (FONT_SCALES as readonly unknown[]).includes(l.fontScale)
        && typeof l.reducedMotion === "boolean"
}

export const applyLook = (look: Look) => {
    const root = document.documentElement
    root.dataset.accent = look.accent
    root.dataset.density = look.density
    root.dataset.motion = look.reducedMotion ? "reduced" : "full"
    root.style.fontSize = look.fontScale === 100 ? "" : `${look.fontScale}%`
}

/** Back to the plain look; used when leaving the signed-in app. */
export const clearAppearance = () => {
    // Signing out keeps the page up behind a cover until the sign-in page loads; keep its look until then.
    if (document.getElementById("wfx-signing-out")) return
    const root = document.documentElement
    root.classList.remove("dark")
    for (const k of ["theme", "accent", "density", "motion"]) delete root.dataset[k]
    root.style.fontSize = ""
}

export const readStoredLook = (): Look => {
    try {
        const raw = localStorage.getItem(LOOK_KEY)
        const parsed = raw ? JSON.parse(raw) : null
        return isLook(parsed) ? parsed : DEFAULT_LOOK
    } catch {
        return DEFAULT_LOOK
    }
}

export const storeLook = (look: Look) => {
    try { localStorage.setItem(LOOK_KEY, JSON.stringify(look)) } catch { /* ignore */ }
}

// The pre-paint script lives in public/theme-boot.js (a file, not inline, so the app CSP needs no inline exception).
// Only the app (/dashboard) is themed; keep that file's keys, ids and path check in step with this one.
