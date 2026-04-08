import { useMutation } from "convex/react"
import { api } from "../../../../convex/_generated/api"
import { useCallback, useState } from "react"
import { Id } from "../../../../convex/_generated/dataModel"

export const useRemoveNote = () => {
    const [status, setStatus] = useState<"idle" | "pending" | "success" | "error">("idle")
    const mutation = useMutation(api.notes.remove)

    const mutate = useCallback(async (id: Id<"notes">, options?: {
        onSuccess?: () => void
        onError?: (e: Error) => void
    }) => {
        try {
            setStatus("pending")
            await mutation({ id })
            setStatus("success")
            options?.onSuccess?.()
        } catch (e) {
            setStatus("error")
            options?.onError?.(e as Error)
        }
    }, [mutation])

    return { mutate, isPending: status === "pending" }
}