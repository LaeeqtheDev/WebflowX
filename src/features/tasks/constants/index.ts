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
    backlog: "bg-slate-100 dark:bg-white/10 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-white/15",
    todo: "bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-500/30",
    in_progress: "bg-yellow-50 dark:bg-yellow-500/10 text-yellow-700 dark:text-yellow-300 border-yellow-200 dark:border-yellow-500/30",
    in_review: "bg-purple-50 dark:bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-500/30",
    done: "bg-green-50 dark:bg-green-500/10 text-green-700 dark:text-green-300 border-green-200 dark:border-green-500/30",
}

export const STATUS_HEADER_COLORS: Record<Status, string> = {
    backlog: "bg-slate-200 dark:bg-white/15",
    todo: "bg-blue-200 dark:bg-blue-400",
    in_progress: "bg-yellow-200 dark:bg-yellow-400",
    in_review: "bg-purple-200 dark:bg-purple-400",
    done: "bg-green-200 dark:bg-green-400",
}

export const PRIORITY_COLORS: Record<Priority, string> = {
    urgent: "text-red-600 dark:text-red-400",
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