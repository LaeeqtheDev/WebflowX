import { useQuery } from "convex/react"
import { api } from "../../../../convex/_generated/api"
import { Id } from "../../../../convex/_generated/dataModel"

export const useGetUsage = ({ workspaceId, enabled = true }: { workspaceId: Id<"workspaces">; enabled?: boolean }) => {
    const data = useQuery(api.usage.get, enabled ? { workspaceId } : "skip")
    const isLoading = data === undefined
    return { data, isLoading }
}