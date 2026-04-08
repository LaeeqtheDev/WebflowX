import { useQuery } from "convex/react"
import { api } from "../../../../convex/_generated/api"
import { Id } from "../../../../convex/_generated/dataModel"

interface UseSearchMessagesProps {
    workspaceId: Id<"workspaces">
    query: string
}

export const useSearchMessages = ({ workspaceId, query }: UseSearchMessagesProps) => {
    const data = useQuery(
        api.messages.search,
        query.length > 0 ? { workspaceId, query } : "skip"
    )

    return { data }
}