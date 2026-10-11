"use client"
import { useEffect } from "react"
import dynamic from "next/dynamic"
import { useQuickSwitcher } from "@/features/workspaces/store/use-quick-switcher"
import { useMountOnce } from "@/hooks/use-mount-once"

// The jump-to box and its command-palette library load the first time it is opened (Ctrl/Cmd+K, "New message").
// Only the keyboard shortcut is listened for up front.
const Dialog = dynamic(() => import("./quick-switcher-dialog").then((m) => m.QuickSwitcherDialog), { ssr: false })

export const QuickSwitcher = () => {
    const [{ open }, setState] = useQuickSwitcher()
    const mounted = useMountOnce(open)

    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if (!(e.metaKey || e.ctrlKey) || e.key.toLowerCase() !== "k") return
            // Ctrl+K inserts a link while writing a message, so leave it to the editor
            if ((e.target as HTMLElement | null)?.closest?.(".ql-editor")) return
            e.preventDefault()
            setState((s) => ({ open: !s.open, mode: "all" }))
        }
        window.addEventListener("keydown", onKey)
        return () => window.removeEventListener("keydown", onKey)
    }, [setState])

    return mounted ? <Dialog /> : null
}
