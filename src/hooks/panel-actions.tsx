"use client"
import { createContext, useContext, useEffect, useMemo, useRef } from "react"
import { usePanel } from "@/hooks/use-panel"

// Open/close the thread and profile panels without subscribing to which one is open.
//
// usePanel() reads two URL query values, so every component that calls it re-renders whenever either changes. Each
// message in a long channel called it just to have an "open thread" click handler, which meant opening a thread (or
// any URL change) re-rendered every message on screen. The provider reads the panel once, and hands out functions
// whose identity never changes, so messages only re-render when their own data does.
type Actions = {
  openMessage: (id: string) => void
  openProfile: (id: string) => void
  /** Close the panel only if it is currently showing this message's thread (used after deleting it). */
  closeIfOpen: (messageId: string) => void
}
const Ctx = createContext<Actions | null>(null)

export const PanelActionsProvider = ({ children }: { children: React.ReactNode }) => {
  const panel = usePanel()
  const latest = useRef(panel)
  useEffect(() => { latest.current = panel })
  const actions = useMemo<Actions>(() => ({
    openMessage: (id) => latest.current.onOpenMessage(id),
    openProfile: (id) => latest.current.onOpenProfile(id),
    closeIfOpen: (id) => { if (latest.current.parentMessageId === id) latest.current.onClose() },
  }), [])
  return <Ctx.Provider value={actions}>{children}</Ctx.Provider>
}

export const usePanelActions = (): Actions => {
  const a = useContext(Ctx)
  if (!a) throw new Error("usePanelActions must be used inside <PanelActionsProvider>")
  return a
}
