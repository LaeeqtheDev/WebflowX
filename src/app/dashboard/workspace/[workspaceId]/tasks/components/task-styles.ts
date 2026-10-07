import { Priority, Status } from "@/features/tasks/types"

// Presentational-only maps for the brand restyle (plain labels, soft tinted pills).
export const PRIORITY_TEXT: Record<Priority, string> = {
    urgent: "Urgent",
    high: "High",
    medium: "Medium",
    low: "Low",
}

export const PRIORITY_PILL: Record<Priority, string> = {
    urgent: "bg-red-50 text-red-700",
    high: "bg-orange-50 text-orange-700",
    medium: "bg-amber-50 text-amber-700",
    low: "bg-slate-100 text-slate-600",
}

export const STATUS_PILL: Record<Status, string> = {
    backlog: "bg-slate-100 text-slate-600",
    todo: "bg-[#efe8e3] text-[#381d2a]",
    in_progress: "bg-[#ff5018]/10 text-[#c2370d]",
    in_review: "bg-amber-50 text-amber-700",
    done: "bg-green-50 text-green-700",
}

export const STATUS_DOT: Record<Status, string> = {
    backlog: "bg-slate-400",
    todo: "bg-[#381d2a]/60",
    in_progress: "bg-[#ff5018]",
    in_review: "bg-amber-500",
    done: "bg-green-500",
}
