"use client"

import { useEffect, useState } from "react"
import dynamic from "next/dynamic"
import { useParams } from "next/navigation"
import { useQuery } from "convex/react"
import { api } from "../../convex/_generated/api"
import { Id } from "../../convex/_generated/dataModel"
import { UpgradeModal } from "@/components/upgrade-modal"
import { useLimitModal } from "@/features/workspaces/store/use-limit-modal"
import { takePlanIntent } from "@/lib/plan-intent"

const MoreModal = dynamic(
    () => import("@/app/dashboard/workspace/[workspaceId]/components/more-modal").then((m) => m.MoreModal),
    { ssr: false },
)

// Mounted once at the app root. Anything that hits a plan limit calls useLimitHandler().handleLimitError(err).
export const LimitModalHost = () => {
    const [info, setInfo] = useLimitModal()
    const [plansOpen, setPlansOpen] = useState(false)
    const params = useParams()
    const urlWorkspaceId = params?.workspaceId as Id<"workspaces"> | undefined

    // Outside a workspace (e.g. creating one) fall back to the user's first workspace for the plans view.
    const workspaces = useQuery(api.workspaces.get, info && !urlWorkspaceId ? {} : "skip")
    const workspaceId = urlWorkspaceId ?? workspaces?.[0]?._id
    const usage = useQuery(api.usage.get, info?.plan === "unknown" && workspaceId ? { workspaceId } : "skip")

    // Picked a paid plan on the pricing page before signing up: open the plans screen once the first workspace is open.
    useEffect(() => {
        if (!urlWorkspaceId) return
        // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time handoff from localStorage
        if (takePlanIntent()) setPlansOpen(true)
    }, [urlWorkspaceId])

    return (
        <>
            <UpgradeModal
                info={info}
                fallbackPlan={usage?.plan ?? "free"}
                onClose={() => setInfo(null)}
                onViewPlans={workspaceId ? () => { setInfo(null); setPlansOpen(true) } : undefined}
            />
            {plansOpen && workspaceId && (
                <MoreModal open workspaceId={workspaceId} initialTab="plans" onClose={() => setPlansOpen(false)} />
            )}
        </>
    )
}
