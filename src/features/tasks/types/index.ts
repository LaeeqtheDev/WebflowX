import { Id } from "../../../../convex/_generated/dataModel"

export type Status = "backlog" | "todo" | "in_progress" | "in_review" | "done"
export type Priority = "urgent" | "high" | "medium" | "low"

export type Task = {
    _id: Id<"tasks">
    title: string
    description?: string
    status: Status
    priority: Priority
    workspaceId: Id<"workspaces">
    assigneeId?: Id<"members">
    createdBy: Id<"members">
    dueDate?: number
    labels?: string[]
    storyPoints?: number
    updatedAt?: number
    sprintId?: Id<"sprints">
    assignee: { _id: Id<"members">; user: { name?: string; image?: string } | null } | null
    creator: { _id: Id<"members">; user: { name?: string; image?: string } | null } | null
}

export type Sprint = {
    _id: Id<"sprints">
    name: string
    status: "planned" | "active" | "completed"
    startDate?: number
    endDate?: number
    workspaceId: Id<"workspaces">
}

export type Member = {
    _id: Id<"members">
    user: { name?: string; image?: string }
}