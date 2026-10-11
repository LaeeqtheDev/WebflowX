"use client"

import { useCallback, useEffect, useSyncExternalStore } from "react"
import { en, type Key } from "./en"

export const LOCALES = [
  { code: "en", label: "English" },
  { code: "es", label: "Español" },
  { code: "fr", label: "Français" },
  { code: "de", label: "Deutsch" },
  { code: "pt", label: "Português" },
  { code: "hi", label: "हिन्दी" },
] as const
export type Locale = (typeof LOCALES)[number]["code"]

type Dict = Record<Key, string>
// Only English ships with the app. The other languages are separate chunks, fetched when that language is in use, so
// nobody downloads five dictionaries they will never read.
const loaded: Partial<Record<Locale, Dict>> = { en }
const loaders: Record<Exclude<Locale, "en">, () => Promise<Dict>> = {
  es: () => import("./es").then((m) => m.es),
  fr: () => import("./fr").then((m) => m.fr),
  de: () => import("./de").then((m) => m.de),
  pt: () => import("./pt").then((m) => m.pt),
  hi: () => import("./hi").then((m) => m.hi),
}
let dictVersion = 0
export function loadLocale(locale: Locale): Promise<void> {
  if (loaded[locale] || locale === "en") return Promise.resolve()
  return loaders[locale]().then((d) => {
    loaded[locale] = d
    dictVersion++
    listeners.forEach((l) => l())
  })
}
const STORAGE_KEY = "wfx:lang"
const isLocale = (v: unknown): v is Locale => LOCALES.some((l) => l.code === v)

/** Look up a string and fill {placeholders}. Falls back to English, then to the key. */
export function translate(locale: Locale, key: Key, vars?: Record<string, string | number>): string {
  let s = loaded[locale]?.[key] ?? en[key] ?? key
  if (vars) for (const [k, v] of Object.entries(vars)) s = s.split(`{${k}}`).join(String(v))
  return s
}

const listeners = new Set<() => void>()
function read(): Locale {
  try {
    const saved = window.localStorage.getItem(STORAGE_KEY)
    if (isLocale(saved)) return saved
    const guess = navigator.language?.slice(0, 2).toLowerCase()
    if (isLocale(guess)) return guess
  } catch { /* storage blocked */ }
  return "en"
}
function subscribe(cb: () => void) {
  listeners.add(cb)
  window.addEventListener("storage", cb)
  return () => { listeners.delete(cb); window.removeEventListener("storage", cb) }
}

export function setLocale(next: Locale) {
  try { window.localStorage.setItem(STORAGE_KEY, next) } catch { /* ignore */ }
  document.documentElement.lang = next
  // switch once the new language has arrived, so the screen never flashes English in between
  void loadLocale(next).catch(() => {}).then(() => listeners.forEach((l) => l()))
}

export function useLocale(): Locale {
  return useSyncExternalStore(subscribe, read, () => "en" as Locale)
}

export function useT() {
  const locale = useLocale()
  const version = useSyncExternalStore(subscribe, () => dictVersion, () => 0)
  useEffect(() => { void loadLocale(locale).catch(() => {}) }, [locale])
  // eslint-disable-next-line react-hooks/exhaustive-deps
  return useCallback((key: Key, vars?: Record<string, string | number>) => translate(locale, key, vars), [locale, version])
}

export function LanguagePicker({ className = "" }: { className?: string }) {
  const locale = useLocale()
  const t = useT()
  return (
    <label className={`inline-flex items-center gap-2 text-sm text-ink/60 ${className}`}>
      <span className="sr-only">{t("lang.label")}</span>
      <select
        value={locale}
        onChange={(e) => setLocale(e.target.value as Locale)}
        className="cursor-pointer rounded-md border border-ink/15 bg-surface px-2 py-1 text-sm text-ink"
        aria-label={t("lang.label")}
      >
        {LOCALES.map((l) => <option key={l.code} value={l.code}>{l.label}</option>)}
      </select>
    </label>
  )
}
