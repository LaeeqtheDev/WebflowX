"use client"

import { useCallback, useSyncExternalStore } from "react"
import { en, type Key } from "./en"
import { es } from "./es"
import { fr } from "./fr"
import { de } from "./de"
import { pt } from "./pt"
import { hi } from "./hi"

export const LOCALES = [
  { code: "en", label: "English" },
  { code: "es", label: "Español" },
  { code: "fr", label: "Français" },
  { code: "de", label: "Deutsch" },
  { code: "pt", label: "Português" },
  { code: "hi", label: "हिन्दी" },
] as const
export type Locale = (typeof LOCALES)[number]["code"]

export const DICTS: Record<Locale, Record<Key, string>> = { en, es, fr, de, pt, hi }
const STORAGE_KEY = "wfx:lang"
const isLocale = (v: unknown): v is Locale => LOCALES.some((l) => l.code === v)

/** Look up a string and fill {placeholders}. Falls back to English, then to the key. */
export function translate(locale: Locale, key: Key, vars?: Record<string, string | number>): string {
  let s = DICTS[locale]?.[key] ?? en[key] ?? key
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
  listeners.forEach((l) => l())
}

export function useLocale(): Locale {
  return useSyncExternalStore(subscribe, read, () => "en" as Locale)
}

export function useT() {
  const locale = useLocale()
  return useCallback((key: Key, vars?: Record<string, string | number>) => translate(locale, key, vars), [locale])
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
