"use client"

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { LimitInfo } from "@/features/workspaces/api/use-limit-error"
import { Zap } from "lucide-react"

interface UpgradeModalProps {
    limitInfo: LimitInfo
    onClose: () => void
    onUpgrade: () => void
}

const FEATURE_LABELS: Record<string, string> = {
    channels: "channels",
    members: "members",
    personalNotes: "personal notes",
    workspaceNotes: "workspace notes",
    docs: "documents",
    meetings: "meetings",
    aiSummaries: "AI summaries",
}

const NEXT_PLAN: Record<string, string> = {
    free: "Startup ($19/mo)",
    startup: "Growth ($49/mo)",
    growth: "Enterprise ($149/mo)",
    enterprise: "Enterprise",
}

export const UpgradeModal = ({ limitInfo, onClose, onUpgrade }: UpgradeModalProps) => {
    if (!limitInfo) return null

    const featureLabel = FEATURE_LABELS[limitInfo.feature] ?? limitInfo.feature
    const nextPlan = NEXT_PLAN[limitInfo.plan] ?? "a higher plan"

    return (
        <Dialog open={!!limitInfo} onOpenChange={onClose}>
            <DialogContent className="max-w-sm">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Zap className="size-5 text-[#ff5018]" />
                        Limit Reached
                    </DialogTitle>
                </DialogHeader>
                <div className="flex flex-col gap-4 mt-2">
                    <div className="bg-orange-50 border border-orange-100 rounded-lg p-4 text-center">
                        <p className="text-sm font-semibold">
                            You've reached the {featureLabel} limit
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                            Your <span className="capitalize font-medium">{limitInfo.plan}</span> plan
                            allows {limitInfo.limit} {featureLabel}
                        </p>
                    </div>
                    <p className="text-xs text-center text-muted-foreground">
                        Upgrade to{" "}
                        <span className="font-semibold text-[#ff5018]">{nextPlan}</span>
                        {" "}to get more {featureLabel}
                    </p>
                    <div className="flex gap-2">
                        <Button
                            variant="outline"
                            onClick={onClose}
                            className="flex-1 h-8 text-xs"
                        >
                            Maybe later
                        </Button>
                        <Button
                            onClick={onUpgrade}
                            className="flex-1 h-8 text-xs bg-[#ff5018]/80 hover:bg-[#ff5018] text-white"
                        >
                            <Zap className="size-3.5 mr-1" /> Upgrade Now
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    )
}