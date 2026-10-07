import { useCallback } from "react"
import { useSetAtom } from "jotai"
import { toast } from "sonner"
import { limitModalAtom } from "@/features/workspaces/store/use-limit-modal"
import { errMsg } from "@/lib/errors"
import { errorMessage } from "@/lib/error-message"
import { isStorageError, parseLimitError } from "@/lib/plans"

// Readable text for any thrown value: ConvexError text first, then safe plain Error messages (e.g. from useUploader),
// otherwise the fallback. Hides redacted "Server Error" / request-id noise.
export const friendlyError = (err: unknown, fallback: string): string => {
    const convex = errMsg(err, "")
    if (convex) return convex
    if (err instanceof Error) {
        const m = err.message
        if (m && !/server error|\[CONVEX|request id|uncaught/i.test(m)) return m
    }
    return fallback
}

/**
 * handleLimitError(err, fallback) -> true when it was a plan limit (the upgrade dialog is opened).
 * Storage-cap errors get a friendly toast with a "See plans" action. Anything else becomes an
 * error toast with the real message, so callers never fail silently.
 */
export const useLimitHandler = () => {
    const openLimit = useSetAtom(limitModalAtom)

    const handleLimitError = useCallback((err: unknown, fallback = "Something went wrong. Please try again."): boolean => {
        const raw = errorMessage(err)

        const info = parseLimitError(raw)
        if (info) {
            openLimit(info)
            return true
        }

        if (isStorageError(raw)) {
            toast.error("This workspace is out of storage", {
                description: "An admin can free up space or upgrade the plan.",
                action: { label: "See plans", onClick: () => openLimit({ feature: "storage", limit: 0, plan: "unknown" }) },
            })
            return true
        }

        toast.error(friendlyError(err, fallback))
        return false
    }, [openLimit])

    return { handleLimitError }
}
