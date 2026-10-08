import { useSyncExternalStore } from "react"

const subscribe = (cb: () => void) => {
    const vv = window.visualViewport
    if (!vv) return () => undefined
    // iOS Safari doesn't shrink the page for the keyboard; the visual viewport is the only thing that does
    const onChange = () => { if (vv.offsetTop > 0) window.scrollTo(0, 0); cb() }
    vv.addEventListener("resize", onChange)
    vv.addEventListener("scroll", onChange)
    return () => { vv.removeEventListener("resize", onChange); vv.removeEventListener("scroll", onChange) }
}

// Height of what's actually visible (screen minus the on-screen keyboard), or 0 when unknown.
export const useVisibleHeight = () =>
    useSyncExternalStore(
        subscribe,
        () => Math.round(window.visualViewport?.height ?? 0),
        () => 0,
    )
