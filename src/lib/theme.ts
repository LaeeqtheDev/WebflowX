export type ThemePref = "light" | "dark" | "system"
export const THEME_KEY = "wfx-theme"
export const THEMES: ThemePref[] = ["light", "dark", "system"]

export const isThemePref = (v: unknown): v is ThemePref => v === "light" || v === "dark" || v === "system"

export const systemPrefersDark = () =>
    typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: dark)").matches

export const resolveTheme = (pref: ThemePref): "light" | "dark" =>
    pref === "dark" || (pref === "system" && systemPrefersDark()) ? "dark" : "light"

// Adds / removes the `dark` class on <html>. Only the signed-in app ever calls this with "dark".
export const applyTheme = (pref: ThemePref) => {
    const dark = resolveTheme(pref) === "dark"
    document.documentElement.classList.toggle("dark", dark)
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

// The pre-paint dark-mode script lives in public/theme-boot.js (a file, not inline, so the app CSP needs no inline exception).
// Only the app (/dashboard) can be dark; keep that file's key and path check in step with THEME_KEY above.
