import { useMutation } from "convex/react"
import { useCallback, useState } from "react"
import { Id } from "../../../convex/_generated/dataModel"
import { api } from "../../../convex/_generated/api"


export const useUpdateSprintStatus = () => {
    const [status, setStatus] = useState<"idle" | "pending" | "success" | "error">("idle")
    const mutation = useMutation(api.sprints.updateStatus)

    const mutate = useCallback(async (values: {
        id: Id<"sprints">
        status: "planned" | "active" | "completed"
    }, options?: { onSuccess?: () => void; onError?: (e: Error) => void }) => {
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