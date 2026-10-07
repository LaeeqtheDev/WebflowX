"use client"

import { useEffect } from "react"
import { toast } from "sonner"
import { useWorkspaceId } from "@/hooks/use-workspace-id"
import { usePermissions } from "@/hooks/use-permissions"
import { useGetUsage } from "@/features/workspaces/api/use-get-usage"

const LABELS: Record<string, string> = {
    members: "members",
    channels: "channels",
    docs: "documents",
    meetings: "meetings this month",
    aiSummaries: "AI summaries this month",
    personalNotes: "personal notes",
    workspaceNotes: "workspace notes",
}

// Warns admins once per session when a plan limit is at 80% (and again at 100%).
export const UsageWarning = () => {
    const workspaceId = useWorkspaceId()
    const perms = usePermissions()
    const { data: usage } = useGetUsage({ workspaceId })

    useEffect(() => {
        if (!usage || !perms.isAdmin) return

        for (const [key, value] of Object.entries(usage.usage)) {
            const label = LABELS[key]
            if (!label || value.limit <= 0) continue

            const pct = value.current / value.limit
            const level = pct >= 1 ? "full" : pct >= 0.8 ? "near" : null
            if (!level) continue

            const storageKey = `usage-warning:${workspaceId}:${key}:${level}`
            try {
                if (sessionStorage.getItem(storageKey)) continue
                sessionStorage.setItem(storageKey, "1")
            } catch {
                // storage unavailable: fall through and warn anyway
            }

            const text = level === "full"
                ? `You've used all ${value.limit} ${label} on your plan.`
                : `You've used ${value.current} of ${value.limit} ${label} on your plan.`
            toast.warning(text, { description: "Open More → Plans to upgrade." })
        }
    }, [usage, perms.isAdmin, workspaceId])

    return null
}
