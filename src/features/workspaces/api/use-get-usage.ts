import { useQuery } from "convex/react"
import { api } from "../../../../convex/_generated/api"
import { Id } from "../../../../convex/_generated/dataModel"

export const useGetUsage = ({ workspaceId }: { workspaceId: Id<"workspaces"> }) => {
    const data = useQuery(api.usage.get, { workspaceId })
    const isLoading = data === undefined
    return { data, isLoading }
}