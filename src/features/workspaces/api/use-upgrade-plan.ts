import { useMutation } from "convex/react"
import { useCallback, useState } from "react"
import { api } from "../../../../convex/_generated/api"
import { Id } from "../../../../convex/_generated/dataModel"


export const useUpgradePlan = () => {
    const [status, setStatus] = useState<"idle" | "pending" | "success" | "error">("idle")
    const mutation = useMutation(api.usage.upgradePlan)

    const mutate = useCallback(async (values: {
        workspaceId: Id<"workspaces">
        plan: "free" | "startup" | "growth" | "enterprise"
    }, options?: {
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