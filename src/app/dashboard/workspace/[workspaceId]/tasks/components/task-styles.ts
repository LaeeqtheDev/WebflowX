import { Priority, Status } from "@/features/tasks/types"

// Presentational-only maps for the brand restyle (plain labels, soft tinted pills).
export const PRIORITY_TEXT: Record<Priority, string> = {
    urgent: "Urgent",
    high: "High",
    medium: "Medium",
    low: "Low",
}

export const PRIORITY_PILL: Record<Priority, string> = {
    urgent: "bg-red-50 dark:bg-red-500/10 text-red-700 dark:text-red-300",
    high: "bg-orange-50 dark:bg-orange-500/10 text-orange-700 dark:text-orange-300",
    medium: "bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-300",
    low: "bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-slate-300",
}

export const STATUS_PILL: Record<Status, string> = {
    backlog: "bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-slate-300",
    todo: "bg-cream-deep2 text-plum",
    in_progress: "bg-brand/10 text-orange-ink",
    in_review: "bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-300",
    done: "bg-green-50 dark:bg-green-500/10 text-green-700 dark:text-green-300",
}

export const STATUS_DOT: Record<Status, string> = {
    backlog: "bg-slate-400",
    todo: "bg-plum/60",
    in_progress: "bg-brand",
    in_review: "bg-amber-500",
    done: "bg-green-500",
}
