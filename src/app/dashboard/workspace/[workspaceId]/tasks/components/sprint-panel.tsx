"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
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
                <p className="text-xs font-semibold text-muted-foreground">SPRINTS</p>
                <button onClick={() => setShowForm(v => !v)} className="text-[#ff5018] hover:opacity-80">
                    <Plus className="size-3.5" />
                </button>
            </div>

            {showForm && (
                <div className="flex flex-col gap-1.5 p-2 border rounded-md bg-muted/30">
                    <Input placeholder="Sprint name" value={name} onChange={e => setName(e.target.value)} className="h-7 text-xs" />
                    <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="h-7 text-xs" />
                    <Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="h-7 text-xs" />
                    <Button onClick={handleCreate} disabled={isPending} size="sm" className="h-7 text-xs bg-[#ff5018]/80 hover:bg-[#ff5018] text-white">
                        Create
                    </Button>
                </div>
            )}

            <button
                onClick={() => onSprintFilter("all")}
                className={cn("text-xs text-left px-2 py-1.5 rounded transition-colors", sprintFilter === "all" ? "bg-[#ff5018]/10 text-[#ff5018]" : "hover:bg-muted")}
            >
                All Tasks
            </button>
            <button
                onClick={() => onSprintFilter("none")}
                className={cn("text-xs text-left px-2 py-1.5 rounded transition-colors", sprintFilter === "none" ? "bg-[#ff5018]/10 text-[#ff5018]" : "hover:bg-muted")}
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
                                "w-full text-xs text-left px-2 py-1.5 rounded transition-colors flex flex-col gap-1",
                                sprintFilter === sprint._id ? "bg-[#ff5018]/10 text-[#ff5018]" : "hover:bg-muted"
                            )}
                        >
                            <div className="flex items-center justify-between">
                                <span className="font-medium truncate">{sprint.name}</span>
                                <Badge variant="outline" className={cn("text-[9px] px-1 py-0 ml-1", {
                                    "border-yellow-400 text-yellow-600": sprint.status === "active",
                                    "border-green-400 text-green-600": sprint.status === "completed",
                                    "border-slate-400 text-slate-600": sprint.status === "planned",
                                })}>
                                    {sprint.status}
                                </Badge>
                            </div>
                            {total > 0 && (
                                <div className="w-full bg-muted rounded-full h-1">
                                    <div className="bg-[#ff5018] h-1 rounded-full transition-all" style={{ width: `${pct}%` }} />
                                </div>
                            )}
                            <span className="text-[10px] text-muted-foreground">{done}/{total} done</span>
                        </button>
                        <div className="flex gap-1 px-2 mt-0.5">
                            {sprint.status === "planned" && (
                                <button onClick={() => updateStatus({ id: sprint._id, status: "active" })}
                                    className="text-[10px] text-yellow-600 hover:underline">Start</button>
                            )}
                            {sprint.status === "active" && (
                                <button onClick={() => updateStatus({ id: sprint._id, status: "completed" })}
                                    className="text-[10px] text-green-600 hover:underline">Complete</button>
                            )}
                        </div>
                    </div>
                )
            })}
        </div>
    )
}