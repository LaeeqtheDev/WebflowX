import { useQuery } from "convex/react"
import { api } from "../../../convex/_generated/api"
import { Id } from "../../../convex/_generated/dataModel"

export const useGetTaskComments = ({ taskId }: { taskId: Id<"tasks"> | null }) => {
    const data = useQuery(api.taskComments.get, taskId ? { taskId } : "skip")
    const isLoading = data === undefined
    return { data, isLoading }
}