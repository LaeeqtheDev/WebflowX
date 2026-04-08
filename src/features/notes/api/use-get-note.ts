import { useQuery } from "convex/react"
import { api } from "../../../../convex/_generated/api"
import { Id } from "../../../../convex/_generated/dataModel"

interface UseGetNotesProps {
    workspaceId: Id<"workspaces">
    type: "personal" | "workspace"
}

export const useGetNotes = ({ workspaceId, type }: UseGetNotesProps) => {
    const data = useQuery(api.notes.get, { workspaceId, type })
    const isLoading = data === undefined
    return { data, isLoading }
}