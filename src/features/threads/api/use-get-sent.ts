import { useQuery } from "convex/react"
import { api } from "../../../../convex/_generated/api"
import { Id } from "../../../../convex/_generated/dataModel"

export const useGetSent = ({ workspaceId }: { workspaceId: Id<"workspaces"> }) => {
    const data = useQuery(api.sent.get, { workspaceId })
    const isLoading = data === undefined
    return { data, isLoading }
}