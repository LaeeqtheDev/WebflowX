import { atom, useAtom } from "jotai"

// "all" = jump to anything, "dm" = pick a person to message
export type QuickSwitcherState = { open: boolean; mode: "all" | "dm" }

const state = atom<QuickSwitcherState>({ open: false, mode: "all" })

export const useQuickSwitcher = () => useAtom(state)
