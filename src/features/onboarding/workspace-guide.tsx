"use client"

import { useCallback, useSyncExternalStore } from "react"
import { usePathname, useRouter } from "next/navigation"
import { X } from "lucide-react"
import { useT } from "@/lib/i18n"
import type { Key } from "@/lib/i18n/en"
import { useWorkspaceId } from "@/hooks/use-workspace-id"

/**
 * The welcome guide. It floats over the person's real workspace and walks them through it, opening the real
 * tasks, pages and meetings screens. Nothing is a practice copy: whatever they try is theirs.
 * Progress lives in localStorage so a refresh keeps the place; finishing or skipping clears it.
 */

const STEPS = 11
const EVENT = "wfx:guide"
const key = (workspaceId: string) => `wfx:guide:${workspaceId}`

/** Screen to show for each step; "" is the channel the person lands on. */
const PATH: Record<number, string> = { 1: "", 2: "", 3: "/threads", 4: "/dms", 5: "/tasks", 6: "/docs", 7: "/notes", 8: "/meeting", 9: "/calendar", 10: "/files", 11: "" }

export const startGuide = (workspaceId: string) => {
  try { window.localStorage.setItem(key(workspaceId), "1") } catch { /* private mode */ }
}

const read = (workspaceId: string): number => {
  try {
    const n = Number(window.localStorage.getItem(key(workspaceId)))
    return Number.isInteger(n) && n >= 1 && n <= STEPS ? n : 0
  } catch { return 0 }
}

const subscribe = (cb: () => void) => {
  window.addEventListener(EVENT, cb)
  window.addEventListener("storage", cb)
  return () => { window.removeEventListener(EVENT, cb); window.removeEventListener("storage", cb) }
}

export function WorkspaceGuide() {
  const t = useT()
  const router = useRouter()
  const pathname = usePathname()
  const workspaceId = useWorkspaceId()
  const step = useSyncExternalStore(subscribe, () => read(workspaceId), () => 0)

  const write = useCallback((n: number) => {
    try {
      if (n) window.localStorage.setItem(key(workspaceId), String(n))
      else window.localStorage.removeItem(key(workspaceId))
    } catch { /* private mode */ }
    window.dispatchEvent(new Event(EVENT))
  }, [workspaceId])

  const go = (n: number) => {
    const base = `/dashboard/workspace/${workspaceId}`
    const target = PATH[n]
    const onSpecial = /\/(threads|dms|tasks|docs|notes|meeting|calendar|files)(\/|$)/.test(pathname)
    if (target) router.push(`${base}${target}`)
    else if (onSpecial) router.push(base)
    write(n)
  }

  if (!step) return null
  const last = step === STEPS

  return (
    <aside
      role="dialog"
      aria-label={t(`guide.s${step}.t` as Key)}
      className="fixed inset-x-3 bottom-3 z-50 rounded-2xl border border-brand/30 bg-surface p-4 text-ink shadow-2xl sm:inset-x-auto sm:bottom-28 sm:right-5 sm:w-[22rem]"
    >
      <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-ink/60">
        <span>{t("guide.step", { n: step, total: STEPS })}</span>
        {!last && (
          <button type="button" onClick={() => write(0)} aria-label={t("guide.skip")} className="-m-1 flex cursor-pointer items-center gap-1 rounded p-1 normal-case tracking-normal hover:text-ink">
            {t("guide.skip")} <X className="size-3.5" />
          </button>
        )}
      </div>
      <div className="mt-2 flex gap-1" aria-hidden>
        {Array.from({ length: STEPS }).map((_, i) => <span key={i} className={`h-1 flex-1 rounded-full ${i < step ? "bg-brand" : "bg-ink/10"}`} />)}
      </div>
      <h2 className="mt-3 text-base font-semibold tracking-tight">{t(`guide.s${step}.t` as Key)}</h2>
      <p className="mt-1 text-sm leading-relaxed text-ink/70">{t(`guide.s${step}.b` as Key)}</p>
      <div className="mt-4 flex items-center justify-end gap-2">
        {step > 1 && <button type="button" onClick={() => go(step - 1)} className="h-9 cursor-pointer rounded-lg border border-ink/15 px-3 text-sm font-medium hover:bg-ink/5">{t("guide.back")}</button>}
        {last
          ? <button type="button" onClick={() => write(0)} className="h-9 cursor-pointer rounded-lg bg-brand px-4 text-sm font-semibold text-white hover:bg-brand-hover">{t("guide.done")}</button>
          : <button type="button" onClick={() => go(step + 1)} className="h-9 cursor-pointer rounded-lg bg-brand px-4 text-sm font-semibold text-white hover:bg-brand-hover">{t("guide.next")}</button>}
      </div>
    </aside>
  )
}
