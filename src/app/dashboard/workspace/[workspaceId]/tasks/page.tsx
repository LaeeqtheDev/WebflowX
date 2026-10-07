"use client"
import { usePermissions } from "@/hooks/use-permissions"
import { formatDue } from "@/lib/due"

import { useState } from "react"
import { useSearchParams } from "next/navigation"
import { useWorkspaceId } from "@/hooks/use-workspace-id"
import { useCurrentMember } from "@/features/members/api/use-current-member"
import { useGetMembers } from "@/features/members/api/use-get-members"

import { STATUSES, STATUS_LABELS } from "@/features/tasks/constants"
import { PRIORITY_PILL, PRIORITY_TEXT, STATUS_DOT, STATUS_PILL } from "./components/task-styles"
import { Task, Sprint, Member, Status } from "@/features/tasks/types"
import { Id } from "../../../../../../convex/_generated/dataModel"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { toast } from "sonner"
import { errorMessage } from "@/lib/error-message"
import { cn } from "@/lib/utils"
import { format } from "date-fns"
import { Plus, Loader, LayoutGrid, List, Trash2, Zap } from "lucide-react"
import { useAssignToMe } from "@/features/tasks/use-assign-to-me-task"
import { useGetSprints } from "@/features/tasks/use-get-sprints"
import { useGetTasks } from "@/features/tasks/use-get-tasks"
import { useRemoveTask } from "@/features/tasks/use-remove-task"
import { useUpdateTask } from "@/features/tasks/use-update-task"
import { CreateTaskModal } from "./components/create-task-modal"
import { SprintPanel } from "./components/sprint-panel"
import { TaskCard } from "./components/task-card"
import { TaskDetail } from "./components/task-detail"

// Wall-clock read kept outside the render body; evaluated on every render exactly as before.
const getNow = () => Date.now()

export default function TasksPage() {
    const workspaceId = useWorkspaceId()
    const { data: currentMember } = useCurrentMember({ workspaceId })
    const perms = usePermissions()
    const { data: tasks, isLoading } = useGetTasks({ workspaceId })
    const { data: members } = useGetMembers({ workspaceId })
    const { data: sprints } = useGetSprints({ workspaceId })
    const { mutate: updateTask } = useUpdateTask()
    const { mutate: removeTask } = useRemoveTask()
    const { mutate: assignToMe } = useAssignToMe()

    const [view, setView] = useState<"board" | "list">("board")
    const [showCreate, setShowCreate] = useState(false)
    const [selectedTask, setSelectedTask] = useState<Task | null>(null)
    const [filterStatus, setFilterStatus] = useState<Status | "all">("all")
    const [filterAssignee, setFilterAssignee] = useState("all")
    const [sprintFilter, setSprintFilter] = useState("all")

    const isAdmin = perms.can("manageContent")
    const safeMembers = (members ?? []) as Member[]
    const safeSprints = (sprints ?? []) as Sprint[]
    const activeSprint = safeSprints.find(s => s.status === "active") ?? null

    // Deep link: /tasks?task=<id> opens that task (used by notifications)
    const searchParams = useSearchParams()
    const targetTaskId = searchParams.get("task")
    const [closedTargetId, setClosedTargetId] = useState<string | null>(null)
    const deepLinkedTask =
        targetTaskId && closedTargetId !== targetTaskId
            ? ((tasks as Task[] | undefined)?.find(x => x._id === targetTaskId) ?? null)
            : null
    const openTask = selectedTask ?? deepLinkedTask

    const handleUpdate = (id: Id<"tasks">, data: Partial<Task>) => {
        const unassign = "assigneeId" in data && data.assigneeId === undefined
        updateTask({ id, ...data, ...(unassign ? { unassign: true } : {}) } as Parameters<typeof updateTask>[0], { onError: (e) => toast.error(errorMessage(e)) })
        if (selectedTask?._id === id) setSelectedTask(prev => prev ? { ...prev, ...data } : null)
    }

    const handleDelete = (id: Id<"tasks">) => {
        removeTask(id, {
            onSuccess: () => toast.success("Task deleted"),
            onError: (e) => toast.error(errorMessage(e))
        })
    }

    const handleAssignToMe = (id: Id<"tasks">) => {
        assignToMe(id, {
            onSuccess: () => toast.success("Assigned to you"),
            onError: (e) => toast.error(errorMessage(e))
        })
    }

    const filteredTasks = (tasks ?? []).filter(t => {
        if (filterStatus !== "all" && t.status !== filterStatus) return false
        if (filterAssignee !== "all" && t.assigneeId !== filterAssignee) return false
        if (sprintFilter === "none" && t.sprintId) return false
        if (sprintFilter !== "all" && sprintFilter !== "none" && t.sprintId !== sprintFilter) return false
        return true
    }) as Task[]

    const tasksByStatus = STATUSES.reduce((acc, status) => {
        acc[status] = filteredTasks.filter(t => t.status === status)
        return acc
    }, {} as Record<Status, Task[]>)

    const totalTasks = filteredTasks.length
    const doneTasks = filteredTasks.filter(t => t.status === "done").length
    const overallPct = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0

    return (
        <div className="h-full flex max-md:flex-col overflow-hidden">
            {isAdmin && (
                <div className="w-56 max-md:w-full max-md:max-h-44 max-md:border-b border-r max-md:border-r-0 border-plum/12 bg-cream-soft flex flex-col px-3 py-5 max-md:py-3 gap-2 overflow-y-auto shrink-0">
                    <SprintPanel
                        sprints={safeSprints}
                        workspaceId={workspaceId}
                        tasks={filteredTasks}
                        activeSprint={activeSprint}
                        onSprintFilter={setSprintFilter}
                        sprintFilter={sprintFilter}
                    />
                </div>
            )}

            <div className="flex-1 min-h-0 min-w-0 flex flex-col overflow-hidden">
                <div className="flex items-center justify-between px-4 md:px-6 min-h-14 py-2 border-b border-plum/12 bg-surface gap-4 flex-wrap">
                    <div className="flex items-center gap-3">
                        <h1 className="tracking-tight text-[17px] font-semibold text-ink">Tasks</h1>
                        {activeSprint && (
                            <span className="inline-flex items-center rounded-md bg-[#ff5018]/10 text-orange-ink px-2 py-0.5 text-[11px] font-medium">
                                <Zap className="size-3 mr-1" /> {activeSprint.name}
                            </span>
                        )}
                        <div className="flex items-center border border-plum/15 rounded-lg overflow-hidden bg-surface">
                            <button aria-label="Board view" type="button" aria-pressed={view === "board"} onClick={() => setView("board")} className={cn("p-1.5 transition-colors", view === "board" ? "bg-[#ff5018] text-white" : "text-ink/60 hover:bg-cream-deep")}>
                                <LayoutGrid className="size-4" />
                            </button>
                            <button aria-label="List view" type="button" aria-pressed={view === "list"} onClick={() => setView("list")} className={cn("p-1.5 transition-colors", view === "list" ? "bg-[#ff5018] text-white" : "text-ink/60 hover:bg-cream-deep")}>
                                <List className="size-4" />
                            </button>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                        {totalTasks > 0 && (
                            <div className="flex items-center gap-2">
                                <div className="w-24 bg-plum/10 rounded-full h-1.5">
                                    <div className="bg-[#ff5018] h-1.5 rounded-full transition-all" style={{ width: `${overallPct}%` }} />
                                </div>
                                <span className="text-xs font-medium text-ink/60">{overallPct}%</span>
                            </div>
                        )}
                        <Select value={filterStatus} onValueChange={v => setFilterStatus(v as Status | "all")}>
                            <SelectTrigger aria-label="Filter by status" className="h-8 text-xs w-36 rounded-lg border-plum/15"><SelectValue placeholder="All statuses" /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Statuses</SelectItem>
                                {STATUSES.map(s => <SelectItem key={s} value={s}>{STATUS_LABELS[s]}</SelectItem>)}
                            </SelectContent>
                        </Select>
                        <Select value={filterAssignee} onValueChange={setFilterAssignee}>
                            <SelectTrigger aria-label="Filter by assignee" className="h-8 text-xs w-36 rounded-lg border-plum/15"><SelectValue placeholder="All members" /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Members</SelectItem>
                                {safeMembers.map(m => <SelectItem key={m._id} value={m._id}>{m.user.name ?? "Unknown"}</SelectItem>)}
                            </SelectContent>
                        </Select>
                        <Button onClick={() => setShowCreate(true)} className="bg-[#ff5018] hover:bg-[#e6430f] text-white h-8 max-md:h-10 text-xs rounded-lg font-semibold">
                            <Plus className="size-4 mr-1" /> New Task
                        </Button>
                    </div>
                </div>

                {isLoading ? (
                    <div className="flex-1 flex items-center justify-center">
                        <Loader className="size-6 animate-spin text-[#ff5018]" />
                    </div>
                ) : view === "board" ? (
                    <div className="flex-1 overflow-x-auto px-4 md:px-6 py-5 bg-cream-soft">
                        <div className="flex gap-4 h-full min-w-max">
                            {STATUSES.map(status => {
                                const colTasks = tasksByStatus[status]
                                return (
                                    <div key={status} className="w-72 flex flex-col gap-3 bg-cream rounded-xl p-3">
                                        <div className="px-1 flex items-center justify-between">
                                            <span className="flex items-center gap-2 text-[13px] font-semibold tracking-tight text-ink">
                                                <span className={cn("size-2 rounded-full", STATUS_DOT[status])} />
                                                {STATUS_LABELS[status]}
                                            </span>
                                            <span className="rounded-md bg-surface px-1.5 py-0.5 text-[11px] font-medium text-ink/60 border border-plum/10">{colTasks.length}</span>
                                        </div>
                                        <div className="flex flex-col gap-2 overflow-y-auto flex-1 pb-2">
                                            {colTasks.map(task => (
                                                <TaskCard
                                                    key={task._id}
                                                    task={task}
                                                    isAdmin={isAdmin}
                                                    currentMemberId={currentMember?._id}
                                                    members={safeMembers}
                                                    onDelete={handleDelete}
                                                    onUpdate={handleUpdate}
                                                    onAssignToMe={handleAssignToMe}
                                                    onOpen={setSelectedTask}
                                                />
                                            ))}
                                            {colTasks.length === 0 && (
                                                <div className="text-xs text-ink/65 text-center py-6 border border-dashed border-plum/15 rounded-lg">No tasks</div>
                                            )}
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    </div>
                ) : (
                    <div className="flex-1 overflow-y-auto px-4 md:px-6 py-5 bg-cream-soft">
                        <div className="border border-plum/12 rounded-xl overflow-hidden bg-surface">
                            <table className="w-full text-sm">
                                <thead className="bg-cream">
                                    <tr>
                                        <th className="text-left px-4 py-2.5 text-xs font-semibold text-ink/70">Title</th>
                                        <th className="text-left px-4 py-2.5 text-xs font-semibold text-ink/70">Status</th>
                                        <th className="text-left px-4 py-2.5 text-xs font-semibold text-ink/70">Priority</th>
                                        <th className="text-left px-4 py-2.5 text-xs font-semibold text-ink/70">Assignee</th>
                                        <th className="text-left px-4 py-2.5 text-xs font-semibold text-ink/70">Sprint</th>
                                        <th className="text-left px-4 py-2.5 text-xs font-semibold text-ink/70">Due Date</th>
                                        <th className="text-left px-4 py-2.5 text-xs font-semibold text-ink/70">Points</th>
                                        <th className="text-left px-4 py-2.5 text-xs font-semibold text-ink/70">Labels</th>
                                        {isAdmin && <th className="px-4 py-2.5" />}
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredTasks.length === 0 ? (
                                        <tr><td colSpan={9} className="text-center py-10 text-ink/65 text-xs">No tasks found</td></tr>
                                    ) : filteredTasks.map(task => (
                                        <tr key={task._id} className="border-t border-plum/8 hover:bg-cream-soft transition-colors cursor-pointer" onClick={() => setSelectedTask(task)}>
                                            <td className="px-4 py-2.5">
                                                <p className="font-semibold tracking-tight text-sm text-ink">{task.title}</p>
                                                {task.description && <p className="text-xs text-ink/60 truncate max-w-48">{task.description}</p>}
                                            </td>
                                            <td className="px-4 py-2.5" onClick={e => e.stopPropagation()}>
                                                <Select value={task.status} onValueChange={v => handleUpdate(task._id, { status: v as Status })}>
                                                    <SelectTrigger aria-label="Task status" className={cn("h-6 text-[11px] border-transparent rounded-md px-2 w-28 font-medium", STATUS_PILL[task.status] ?? "")}>
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {STATUSES.map(s => <SelectItem key={s} value={s} className="text-xs">{STATUS_LABELS[s]}</SelectItem>)}
                                                    </SelectContent>
                                                </Select>
                                            </td>
                                            <td className="px-4 py-2.5">
                                                <span className={cn("rounded-md px-2 py-0.5 text-[11px] font-medium", PRIORITY_PILL[task.priority] ?? "")}>
                                                    {PRIORITY_TEXT[task.priority]}
                                                </span>
                                            </td>
                                            <td className="px-4 py-2.5" onClick={e => e.stopPropagation()}>
                                                <div className="flex items-center gap-1.5">
                                                    {task.assignee ? (
                                                        <>
                                                            <Avatar className="size-5 rounded-md">
                                                                <AvatarImage src={task.assignee.user?.image} />
                                                                <AvatarFallback className="text-[9px]">{task.assignee.user?.name?.[0] ?? "?"}</AvatarFallback>
                                                            </Avatar>
                                                            <span className="text-xs">{task.assignee.user?.name}</span>
                                                        </>
                                                    ) : (
                                                        <span className="text-xs text-ink/65">Unassigned</span>
                                                    )}
                                                    {task.assigneeId !== currentMember?._id && (
                                                        <button aria-label="Assign task to me" type="button" onClick={(e) => { e.stopPropagation(); handleAssignToMe(task._id) }} className="text-[11px] font-medium text-orange-ink hover:text-orange-ink-hover ml-1">+ me</button>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-4 py-2.5 text-xs text-ink/60">{safeSprints.find(s => s._id === task.sprintId)?.name ?? "—"}</td>
                                            <td className={cn("px-4 py-2.5 text-xs", task.dueDate && task.dueDate < getNow() && task.status !== "done" ? "text-red-600 dark:text-red-400 font-medium" : "text-ink/60")}>
                                                {task.dueDate ? formatDue(task.dueDate, "MMM d, yyyy") : "—"}
                                            </td>
                                            <td className="px-4 py-2.5 text-xs text-ink/60">{task.storyPoints ?? "—"}</td>
                                            <td className="px-4 py-2.5">
                                                <div className="flex flex-wrap gap-1">
                                                    {task.labels?.map((l, index) => <span key={index} className="bg-cream text-plum rounded-md px-2 py-0.5 text-[11px] font-medium">{l}</span>)}
                                                </div>
                                            </td>
                                            {isAdmin && (
                                                <td className="px-4 py-2.5" onClick={e => e.stopPropagation()}>
                                                    <button aria-label="Delete task" type="button" onClick={() => handleDelete(task._id)} className="text-ink/40 hover:text-destructive transition-colors">
                                                        <Trash2 className="size-3.5" />
                                                    </button>
                                                </td>
                                            )}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>

            <TaskDetail
                task={openTask}
                onClose={() => { setSelectedTask(null); setClosedTargetId(targetTaskId) }}
                isAdmin={isAdmin}
                currentMemberId={currentMember?._id}
                members={safeMembers}
                sprints={safeSprints}
                workspaceId={workspaceId}
                onUpdate={handleUpdate}
                onDelete={handleDelete}
                onAssignToMe={handleAssignToMe}
            />

            <CreateTaskModal
                open={showCreate}
                onClose={() => setShowCreate(false)}
                workspaceId={workspaceId}
                members={isAdmin ? safeMembers : safeMembers.filter(m => m._id === currentMember?._id)}
                sprints={safeSprints}
            />
        </div>
    )
}