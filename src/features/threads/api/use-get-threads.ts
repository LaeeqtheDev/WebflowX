import { useQuery } from "convex/react"
import { api } from "../../../../convex/_generated/api"
import { Id } from "../../../../convex/_generated/dataModel"

export const useGetThreads = ({ workspaceId }: { workspaceId: Id<"workspaces"> }) => {
    const data = useQuery(api.threads.get, { workspaceId })
    const isLoading = data === undefined
    return { data, isLoading }
}