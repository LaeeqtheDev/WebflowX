import { useQuery } from "convex/react"
import { api } from "../../../convex/_generated/api"
import { Id } from "../../../convex/_generated/dataModel"


export const useGetUnreadCount = ({ workspaceId }: { workspaceId: Id<"workspaces"> }) => {
    const data = useQuery(api.notifications.getUnreadCount, { workspaceId })
    return { count: data ?? 0 }
}