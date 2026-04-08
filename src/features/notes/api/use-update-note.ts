import { useMutation } from "convex/react"
import { api } from "../../../../convex/_generated/api"
import { useCallback, useState } from "react"
import { Id } from "../../../../convex/_generated/dataModel"

type RequestType = {
    id: Id<"notes">
    title: string
    body: string
}

export const useUpdateNote = () => {
    const [status, setStatus] = useState<"idle" | "pending" | "success" | "error">("idle")
    const mutation = useMutation(api.notes.update)

    const mutate = useCallback(async (values: RequestType, options?: {
        onSuccess?: () => void
        onError?: (e: Error) => void
    }) => {
        try {
            setStatus("pending")
            await mutation(values)
            setStatus("success")
            options?.onSuccess?.()
        } catch (e) {
            setStatus("error")
            options?.onError?.(e as Error)
        }
    }, [mutation])

    return { mutate, isPending: status === "pending" }
}