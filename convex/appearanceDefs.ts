// Shared by the backend validators and the app. Pure data, no imports, so both sides can use it.
// Every id here needs a matching block in src/app/globals.css (tests/appearance.test.ts checks that).

export const THEME_IDS = ["light", "dark", "system", "snow", "ash", "onyx", "midnight", "forest"] as const
export type ThemeId = (typeof THEME_IDS)[number]

export const ACCENT_IDS = ["ember", "ocean", "violet", "emerald", "rose", "teal", "gold", "slate"] as const
export type AccentId = (typeof ACCENT_IDS)[number]

export const DENSITIES = ["cozy", "compact"] as const
export type Density = (typeof DENSITIES)[number]

/** Percent of the browser's base text size. */
export const FONT_SCALES = [90, 100, 112, 125] as const
export type FontScale = (typeof FONT_SCALES)[number]
