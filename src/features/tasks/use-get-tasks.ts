import { useQuery } from "convex/react"
import { api } from "../../../convex/_generated/api"
import { Id } from "../../../convex/_generated/dataModel"

interface UseGetTasksProps {
    workspaceId: Id<"workspaces">
    status?: "backlog" | "todo" | "in_progress" | "in_review" | "done"
    assigneeId?: Id<"members">
}

export const useGetTasks = ({ workspaceId, status, assigneeId }: UseGetTasksProps) => {
    const data = useQuery(api.tasks.get, { workspaceId, status, assigneeId })
    const isLoading = data === undefined
    return { data, isLoading }
}