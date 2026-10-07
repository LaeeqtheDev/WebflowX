import { atom, useAtom } from "jotai"
import type { LimitInfo } from "@/lib/plans"

// The plan-limit dialog is mounted once (components/Modals.tsx); anything can open it by setting this.
export const limitModalAtom = atom<LimitInfo | null>(null)

export const useLimitModal = () => useAtom(limitModalAtom)
