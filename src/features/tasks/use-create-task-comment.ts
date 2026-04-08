import { useMutation } from "convex/react"
import { api } from "../../../convex/_generated/api"
import { useCallback, useState } from "react"
import { Id } from "../../../convex/_generated/dataModel"

export const useCreateTaskComment = () => {
    const [status, setStatus] = useState<"idle" | "pending" | "success" | "error">("idle")
    const mutation = useMutation(api.taskComments.create)

    const mutate = useCallback(async (values: {
        taskId: Id<"tasks">
        workspaceId: Id<"workspaces">
        body: string
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