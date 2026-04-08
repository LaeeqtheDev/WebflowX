"use client"

import { useState } from "react"
import { useWorkspaceId } from "@/hooks/use-workspace-id"
import { useCurrentMember } from "@/features/members/api/use-current-member"
import { useGetMembers } from "@/features/members/api/use-get-members"

import { STATUSES, STATUS_LABELS, STATUS_HEADER_COLORS, PRIORITY_LABELS, PRIORITY_COLORS, STATUS_COLORS } from "@/features/tasks/constants"
import { Task, Sprint, Member, Status } from "@/features/tasks/types"
import { Id } from "../../../../../../convex/_generated/dataModel"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { format } from "date-fns"
import { Plus, Loader, LayoutGrid, List, Trash2, Calendar, Flag, Star, UserPlus, Zap } from "lucide-react"
import { useAssignToMe } from "@/features/tasks/use-assign-to-me-task"
import { useGetSprints } from "@/features/tasks/use-get-sprints"
import { useGetTasks } from "@/features/tasks/use-get-tasks"
import { useRemoveTask } from "@/features/tasks/use-remove-task"
import { useUpdateTask } from "@/features/tasks/use-update-task"
import { CreateTaskModal } from "./components/create-task-modal"
import { SprintPanel } from "./components/sprint-panel"
import { TaskCard } from "./components/task-card"
import { TaskDetail } from "./components/task-detail"

export default function TasksPage() {
    const workspaceId = useWorkspaceId()
    const { data: currentMember } = useCurrentMember({ workspaceId })
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

    const isAdmin = currentMember?.role === "admin"
    const safeMembers = (members ?? []) as Member[]
    const safeSprints = (sprints ?? []) as Sprint[]
    const activeSprint = safeSprints.find(s => s.status === "active") ?? null

    const handleUpdate = (id: Id<"tasks">, data: Partial<Task>) => {
        updateTask({ id, ...data } as any, { onError: (e) => toast.error(e.message) })
        if (selectedTask?._id === id) setSelectedTask(prev => prev ? { ...prev, ...data } : null)
    }

    const handleDelete = (id: Id<"tasks">) => {
        removeTask(id, {
            onSuccess: () => toast.success("Task deleted"),
            onError: (e) => toast.error(e.message)
        })
    }

    const handleAssignToMe = (id: Id<"tasks">) => {
        assignToMe(id, {
            onSuccess: () => toast.success("Assigned to you"),
            onError: (e) => toast.error(e.message)
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
        <div className="h-full flex overflow-hidden">
            {isAdmin && (
                <div className="w-52 border-r flex flex-col p-3 gap-2 overflow-y-auto shrink-0">
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

            <div className="flex-1 flex flex-col overflow-hidden">
                <div className="flex items-center justify-between px-6 py-3 border-b gap-4 flex-wrap">
                    <div className="flex items-center gap-3">
                        <h1 className="text-lg font-bold">Tasks</h1>
                        {activeSprint && (
                            <Badge className="bg-yellow-100 text-yellow-700 border-yellow-300 text-xs">
                                <Zap className="size-3 mr-1" /> {activeSprint.name}
                            </Badge>
                        )}
                        <div className="flex items-center border rounded-md overflow-hidden">
                            <button onClick={() => setView("board")} className={cn("p-1.5 transition-colors", view === "board" ? "bg-[#ff5018] text-white" : "hover:bg-muted")}>
                                <LayoutGrid className="size-4" />
                            </button>
                            <button onClick={() => setView("list")} className={cn("p-1.5 transition-colors", view === "list" ? "bg-[#ff5018] text-white" : "hover:bg-muted")}>
                                <List className="size-4" />
                            </button>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                        {totalTasks > 0 && (
                            <div className="flex items-center gap-2">
                                <div className="w-24 bg-muted rounded-full h-1.5">
                                    <div className="bg-[#ff5018] h-1.5 rounded-full transition-all" style={{ width: `${overallPct}%` }} />
                                </div>
                                <span className="text-xs text-muted-foreground">{overallPct}%</span>
                            </div>
                        )}
                        <Select value={filterStatus} onValueChange={v => setFilterStatus(v as Status | "all")}>
                            <SelectTrigger className="h-8 text-xs w-36"><SelectValue placeholder="All statuses" /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Statuses</SelectItem>
                                {STATUSES.map(s => <SelectItem key={s} value={s}>{STATUS_LABELS[s]}</SelectItem>)}
                            </SelectContent>
                        </Select>
                        <Select value={filterAssignee} onValueChange={setFilterAssignee}>
                            <SelectTrigger className="h-8 text-xs w-36"><SelectValue placeholder="All members" /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Members</SelectItem>
                                {safeMembers.map(m => <SelectItem key={m._id} value={m._id}>{m.user.name ?? "Unknown"}</SelectItem>)}
                            </SelectContent>
                        </Select>
                        {isAdmin && (
                            <Button onClick={() => setShowCreate(true)} className="bg-[#ff5018]/80 hover:bg-[#ff5018] text-white h-8 text-xs">
                                <Plus className="size-4 mr-1" /> New Task
                            </Button>
                        )}
                    </div>
                </div>

                {isLoading ? (
                    <div className="flex-1 flex items-center justify-center">
                        <Loader className="size-6 animate-spin text-[#ff5018]" />
                    </div>
                ) : view === "board" ? (
                    <div className="flex-1 overflow-x-auto p-4">
                        <div className="flex gap-4 h-full min-w-max">
                            {STATUSES.map(status => {
                                const colTasks = tasksByStatus[status]
                                return (
                                    <div key={status} className="w-64 flex flex-col gap-2">
                                        <div className={cn("rounded-md px-3 py-1.5 flex items-center justify-between", STATUS_HEADER_COLORS[status])}>
                                            <span className="text-xs font-semibold">{STATUS_LABELS[status]}</span>
                                            <span className="text-xs font-bold">{colTasks.length}</span>
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
                                                <div className="text-xs text-muted-foreground text-center py-6 border border-dashed rounded-lg">No tasks</div>
                                            )}
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    </div>
                ) : (
                    <div className="flex-1 overflow-y-auto p-4">
                        <div className="border rounded-lg overflow-hidden">
                            <table className="w-full text-sm">
                                <thead className="bg-muted">
                                    <tr>
                                        <th className="text-left px-4 py-2 text-xs font-semibold">Title</th>
                                        <th className="text-left px-4 py-2 text-xs font-semibold">Status</th>
                                        <th className="text-left px-4 py-2 text-xs font-semibold">Priority</th>
                                        <th className="text-left px-4 py-2 text-xs font-semibold">Assignee</th>
                                        <th className="text-left px-4 py-2 text-xs font-semibold">Sprint</th>
                                        <th className="text-left px-4 py-2 text-xs font-semibold">Due Date</th>
                                        <th className="text-left px-4 py-2 text-xs font-semibold">Points</th>
                                        <th className="text-left px-4 py-2 text-xs font-semibold">Labels</th>
                                        {isAdmin && <th className="px-4 py-2" />}
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredTasks.length === 0 ? (
                                        <tr><td colSpan={9} className="text-center py-8 text-muted-foreground text-xs">No tasks found</td></tr>
                                    ) : filteredTasks.map(task => (
                                        <tr key={task._id} className="border-t hover:bg-muted/30 transition-colors cursor-pointer" onClick={() => setSelectedTask(task)}>
                                            <td className="px-4 py-2.5">
                                                <p className="font-medium text-sm">{task.title}</p>
                                                {task.description && <p className="text-xs text-muted-foreground truncate max-w-48">{task.description}</p>}
                                            </td>
                                            <td className="px-4 py-2.5" onClick={e => e.stopPropagation()}>
                                                <Select value={task.status} onValueChange={v => handleUpdate(task._id, { status: v as Status })}>
                                                    <SelectTrigger className={cn("h-6 text-[10px] border rounded px-2 w-28", STATUS_COLORS[task.status] ?? "")}>
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {STATUSES.map(s => <SelectItem key={s} value={s} className="text-xs">{STATUS_LABELS[s]}</SelectItem>)}
                                                    </SelectContent>
                                                </Select>
                                            </td>
                                            <td className={cn("px-4 py-2.5 text-xs font-medium", PRIORITY_COLORS[task.priority] ?? "")}>
                                                {PRIORITY_LABELS[task.priority]}
                                            </td>
                                            <td className="px-4 py-2.5" onClick={e => e.stopPropagation()}>
                                                <div className="flex items-center gap-1.5">
                                                    {task.assignee ? (
                                                        <>
                                                            <Avatar className="size-5">
                                                                <AvatarImage src={task.assignee.user?.image} />
                                                                <AvatarFallback className="text-[9px]">{task.assignee.user?.name?.[0] ?? "?"}</AvatarFallback>
                                                            </Avatar>
                                                            <span className="text-xs">{task.assignee.user?.name}</span>
                                                        </>
                                                    ) : (
                                                        <span className="text-xs text-muted-foreground">Unassigned</span>
                                                    )}
                                                    {task.assigneeId !== currentMember?._id && (
                                                        <button onClick={(e) => { e.stopPropagation(); handleAssignToMe(task._id) }} className="text-[10px] text-[#ff5018] hover:underline ml-1">+ me</button>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-4 py-2.5 text-xs text-muted-foreground">{safeSprints.find(s => s._id === task.sprintId)?.name ?? "—"}</td>
                                            <td className={cn("px-4 py-2.5 text-xs", task.dueDate && task.dueDate < Date.now() && task.status !== "done" ? "text-red-500" : "text-muted-foreground")}>
                                                {task.dueDate ? format(task.dueDate, "MMM d, yyyy") : "—"}
                                            </td>
                                            <td className="px-4 py-2.5 text-xs text-muted-foreground">{task.storyPoints ?? "—"}</td>
                                            <td className="px-4 py-2.5">
                                                <div className="flex flex-wrap gap-1">
                                                    {task.labels?.map((l, index) => <Badge key={index} variant="outline" className="text-[10px] px-1.5 py-0">{l}</Badge>)}
                                                </div>
                                            </td>
                                            {isAdmin && (
                                                <td className="px-4 py-2.5" onClick={e => e.stopPropagation()}>
                                                    <button onClick={() => handleDelete(task._id)} className="text-muted-foreground hover:text-destructive transition-colors">
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
                task={selectedTask}
                onClose={() => setSelectedTask(null)}
                isAdmin={isAdmin}
                currentMemberId={currentMember?._id}
                members={safeMembers}
                sprints={safeSprints}
                workspaceId={workspaceId}
                onUpdate={handleUpdate}
                onDelete={handleDelete}
                onAssignToMe={handleAssignToMe}
            />

            {isAdmin && (
                <CreateTaskModal
                    open={showCreate}
                    onClose={() => setShowCreate(false)}
                    workspaceId={workspaceId}
                    members={safeMembers}
                    sprints={safeSprints}
                />
            )}
        </div>
    )
}