import { Status, Priority } from "../types"

export const STATUSES = ["backlog", "todo", "in_progress", "in_review", "done"] as const
export const PRIORITIES = ["urgent", "high", "medium", "low"] as const

export const STATUS_LABELS: Record<Status, string> = {
    backlog: "Backlog",
    todo: "Todo",
    in_progress: "In Progress",
    in_review: "In Review",
    done: "Done",
}

export const STATUS_COLORS: Record<Status, string> = {
    backlog: "bg-slate-100 text-slate-700 border-slate-200",
    todo: "bg-blue-50 text-blue-700 border-blue-200",
    in_progress: "bg-yellow-50 text-yellow-700 border-yellow-200",
    in_review: "bg-purple-50 text-purple-700 border-purple-200",
    done: "bg-green-50 text-green-700 border-green-200",
}

export const STATUS_HEADER_COLORS: Record<Status, string> = {
    backlog: "bg-slate-200",
    todo: "bg-blue-200",
    in_progress: "bg-yellow-200",
    in_review: "bg-purple-200",
    done: "bg-green-200",
}

export const PRIORITY_COLORS: Record<Priority, string> = {
    urgent: "text-red-600",
    high: "text-orange-500",
    medium: "text-yellow-500",
    low: "text-blue-400",
}

export const PRIORITY_LABELS: Record<Priority, string> = {
    urgent: "🔴 Urgent",
    high: "🟠 High",
    medium: "🟡 Medium",
    low: "🔵 Low",
}