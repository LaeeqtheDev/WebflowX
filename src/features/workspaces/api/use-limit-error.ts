import { useState } from "react"
import { toast } from "sonner"

export type LimitInfo = {
    feature: string
    limit: number
    plan: string
} | null

export const useLimitError = () => {
    const [limitInfo, setLimitInfo] = useState<LimitInfo>(null)

    const handleError = (error: Error): boolean => {
        if (error.message.startsWith("LIMIT_REACHED:")) {
            const parts = error.message.split(":")
            const feature = parts[1]
            const limit = parseInt(parts[2])
            const plan = parts[3]
            setLimitInfo({ feature, limit, plan })
            return true
        }
        toast.error(error.message)
        return false
    }

    return { limitInfo, setLimitInfo, handleError }
}