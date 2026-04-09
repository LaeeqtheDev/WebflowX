import { useMutation } from "convex/react"

import { useCallback, useState } from "react"
import { api } from "../../../convex/_generated/api"
import { Id } from "../../../convex/_generated/dataModel"


export const useCreateMeeting = () => {
    const [status, setStatus] = useState<"idle" | "pending" | "success" | "error">("idle")
    const mutation = useMutation(api.meetings.create)

    const mutate = useCallback(async (values: {
        workspaceId: Id<"workspaces">
        title: string
        roomName: string
    }, options?: {
        onSuccess?: (id: Id<"meetings">) => void
        onError?: (e: Error) => void
    }) => {
        try {
            setStatus("pending")
            const id = await mutation(values)
            setStatus("success")
            options?.onSuccess?.(id)
            return id
        } catch (e) {
            setStatus("error")
            options?.onError?.(e as Error)
        }
    }, [mutation])

    return { mutate, isPending: status === "pending" }
}