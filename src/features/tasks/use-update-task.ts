import { api } from "../../../convex/_generated/api"
import { Id } from "../../../convex/_generated/dataModel"
import { useMutation } from "convex/react"
import { useCallback, useState } from "react"

type RequestType = {
    id: Id<"tasks">
    title?: string
    description?: string
    status?: "backlog" | "todo" | "in_progress" | "in_review" | "done"
    priority?: "urgent" | "high" | "medium" | "low"
    assigneeId?: Id<"members">
    dueDate?: number
    labels?: string[]
    storyPoints?: number
}

export const useUpdateTask = () => {
    const [status, setStatus] = useState<"idle" | "pending" | "success" | "error">("idle")
    const mutation = useMutation(api.tasks.update)

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