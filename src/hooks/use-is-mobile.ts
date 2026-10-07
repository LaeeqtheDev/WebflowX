import { useSyncExternalStore } from "react"

const QUERY = "(max-width: 767px)"

const subscribe = (cb: () => void) => {
    const mq = window.matchMedia(QUERY)
    mq.addEventListener("change", cb)
    return () => mq.removeEventListener("change", cb)
}

// True below the Tailwind `md` breakpoint. Server render assumes desktop.
export const useIsMobile = () =>
    useSyncExternalStore(subscribe, () => window.matchMedia(QUERY).matches, () => false)
