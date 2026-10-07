"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Plus } from "lucide-react"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import { useCreateSprint } from "@/features/tasks/use-create-sprint"
import { Sprint, Task } from "@/features/tasks/types"
import { useUpdateSprintStatus } from "@/features/tasks/use-update-sprint"
import { Id } from "../../../../../../../convex/_generated/dataModel"

interface SprintPanelProps {
    sprints: Sprint[]
    workspaceId: Id<"workspaces">
    tasks: Task[]
    activeSprint: Sprint | null
    onSprintFilter: (id: string) => void
    sprintFilter: string
}

export const SprintPanel = ({
    sprints, workspaceId, tasks, activeSprint, onSprintFilter, sprintFilter
}: SprintPanelProps) => {
    const { mutate: createSprint, isPending } = useCreateSprint()
    const { mutate: updateStatus } = useUpdateSprintStatus()
    const [name, setName] = useState("")
    const [startDate, setStartDate] = useState("")
    const [endDate, setEndDate] = useState("")
    const [showForm, setShowForm] = useState(false)

    const handleCreate = () => {
        if (!name.trim()) return
        createSprint({
            workspaceId,
            name,
            startDate: startDate ? new Date(startDate).getTime() : undefined,
            endDate: endDate ? new Date(endDate).getTime() : undefined,
        }, {
            onSuccess: () => { setName(""); setStartDate(""); setEndDate(""); setShowForm(false) },
            onError: (e) => toast.error(e.message)
        })
    }

    const sprintTaskCount = (sprintId: Id<"sprints">) =>
        tasks.filter(t => t.sprintId === sprintId).length

    const sprintDoneCount = (sprintId: Id<"sprints">) =>
        tasks.filter(t => t.sprintId === sprintId && t.status === "done").length

    return (
        <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between mb-1">
                <p className="text-[13px] font-semibold tracking-tight text-ink">Sprints</p>
                <button aria-label="Add sprint" type="button" onClick={() => setShowForm(v => !v)} className="size-6 rounded-md flex items-center justify-center text-[#ff5018] hover:bg-[#ff5018]/10 transition-colors">
                    <Plus className="size-3.5" />
                </button>
            </div>

            {showForm && (
                <div className="flex flex-col gap-1.5 p-2.5 border border-plum/12 rounded-xl bg-cream">
                    <Input aria-label="Sprint name" placeholder="Sprint name" value={name} onChange={e => setName(e.target.value)} className="h-8 text-xs rounded-lg bg-surface" />
                    <Input aria-label="Sprint start date" type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="h-8 text-xs rounded-lg bg-surface" />
                    <Input aria-label="Sprint end date" type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="h-8 text-xs rounded-lg bg-surface" />
                    <Button onClick={handleCreate} disabled={isPending} size="sm" className="h-8 text-xs rounded-lg font-semibold bg-[#ff5018] hover:bg-[#e6430f] text-white">
                        Create
                    </Button>
                </div>
            )}

            <button
                onClick={() => onSprintFilter("all")}
                className={cn("text-[13px] text-left px-2.5 py-1.5 rounded-lg transition-colors", sprintFilter === "all" ? "bg-[#ff5018]/10 text-orange-ink font-semibold" : "text-ink/70 hover:bg-cream-deep")}
            >
                All Tasks
            </button>
            <button
                onClick={() => onSprintFilter("none")}
                className={cn("text-[13px] text-left px-2.5 py-1.5 rounded-lg transition-colors", sprintFilter === "none" ? "bg-[#ff5018]/10 text-orange-ink font-semibold" : "text-ink/70 hover:bg-cream-deep")}
            >
                No Sprint
            </button>

            {sprints.map(sprint => {
                const total = sprintTaskCount(sprint._id)
                const done = sprintDoneCount(sprint._id)
                const pct = total > 0 ? Math.round((done / total) * 100) : 0

                return (
                    <div key={sprint._id}>
                        <button
                            onClick={() => onSprintFilter(sprint._id)}
                            className={cn(
                                "w-full text-xs text-left px-2.5 py-2 rounded-lg border-l-2 transition-colors flex flex-col gap-1.5",
                                sprint.status === "active" ? "border-l-[#ff5018]" : "border-l-transparent",
                                sprintFilter === sprint._id ? "bg-[#ff5018]/10 text-orange-ink" : "text-ink hover:bg-cream-deep"
                            )}
                        >
                            <div className="flex items-center justify-between">
                                <span className="font-semibold tracking-tight truncate">{sprint.name}</span>
                                <span className={cn("rounded-md px-1.5 py-0.5 text-[10px] font-medium ml-1 shrink-0", {
                                    "bg-[#ff5018]/10 text-orange-ink": sprint.status === "active",
                                    "bg-green-50 dark:bg-green-500/10 text-green-700 dark:text-green-300": sprint.status === "completed",
                                    "bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-slate-300": sprint.status === "planned",
                                })}>
                                    {sprint.status}
                                </span>
                            </div>
                            {total > 0 && (
                                <div className="w-full bg-plum/10 rounded-full h-1">
                                    <div className="bg-[#ff5018] h-1 rounded-full transition-all" style={{ width: `${pct}%` }} />
                                </div>
                            )}
                            <span className="text-[11px] text-ink/60">{done}/{total} done</span>
                        </button>
                        <div className="flex gap-2 px-2.5 mt-0.5">
                            {sprint.status === "planned" && (
                                <button onClick={() => updateStatus({ id: sprint._id, status: "active" })}
                                    className="text-[11px] font-medium text-orange-ink hover:text-orange-ink-hover">Start</button>
                            )}
                            {sprint.status === "active" && (
                                <button onClick={() => updateStatus({ id: sprint._id, status: "completed" })}
                                    className="text-[11px] font-medium text-green-700 dark:text-green-300 hover:underline">Complete</button>
                            )}
                        </div>
                    </div>
                )
            })}
        </div>
    )
}