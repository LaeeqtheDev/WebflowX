"use client"

import { useRouter } from "next/navigation"
import { Sparkles } from "lucide-react"
import { useWorkspaceId } from "@/hooks/use-workspace-id"
import { PageHeader } from "@/components/app/page-header"
import { AgentsPanel } from "@/features/agents/agents-panel"

// Agents get their own screen in the sidebar: the product's headline feature shouldn't live only inside Settings.
const AgentsPage = () => {
    const workspaceId = useWorkspaceId()
    const router = useRouter()
    return (
        <div className="flex h-full min-h-0 flex-col bg-cream-soft">
            <PageHeader icon={Sparkles} title="Agents" subtitle="AI teammates that turn meetings and requests into tasks" />
            <div className="min-h-0 flex-1 overflow-y-auto">
                <div className="mx-auto w-full max-w-6xl px-4 py-6 md:px-6">
                    <AgentsPanel wide workspaceId={workspaceId} onSampleReady={(id) => router.push(`/dashboard/workspace/${workspaceId}/meeting?meeting=${id}`)} />
                </div>
            </div>
        </div>
    )
}

export default AgentsPage
