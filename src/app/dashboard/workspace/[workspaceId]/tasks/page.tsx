"use client"

import { useState } from "react"
import { useWorkspaceId } from "@/hooks/use-workspace-id"
import { useCurrentMember } from "@/features/members/api/use-current-member"
import { useGetMembers } from "@/features/members/api/use-get-members"
import { Id } from "../../../../../../convex/_generated/dataModel"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { format } from "date-fns"
import {
    Plus, Loader, LayoutGrid, List, Trash2,
    Calendar, Flag, Tag, Star, UserPlus, Pencil
} from "lucide-react"
import { useCreateTask } from "@/features/tasks/use-create-task"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { useGetTasks } from "@/features/tasks/use-get-tasks"
import { useRemoveTask } from "@/features/tasks/use-remove-task"
import { useUpdateTask } from "@/features/tasks/use-update-task"
import { useAssignToMe } from "@/features/tasks/use-assign-to-me-task"

// ─── Constants ───────────────────────────────────────────────────────────────

const STATUSES = ["backlog", "todo", "in_progress", "in_review", "done"] as const
const PRIORITIES = ["urgent", "high", "medium", "low"] as const
type Status = typeof STATUSES[number]
type Priority = typeof PRIORITIES[number]

const STATUS_LABELS: Record<Status, string> = {
    backlog: "Backlog",
    todo: "Todo",
    in_progress: "In Progress",
    in_review: "In Review",
    done: "Done",
}

const STATUS_COLORS: Record<Status, string> = {
    backlog: "bg-slate-100 text-slate-700 border-slate-200",
    todo: "bg-blue-50 text-blue-700 border-blue-200",
    in_progress: "bg-yellow-50 text-yellow-700 border-yellow-200",
    in_review: "bg-purple-50 text-purple-700 border-purple-200",
    done: "bg-green-50 text-green-700 border-green-200",
}

const STATUS_HEADER_COLORS: Record<Status, string> = {
    backlog: "bg-slate-200",
    todo: "bg-blue-200",
    in_progress: "bg-yellow-200",
    in_review: "bg-purple-200",
    done: "bg-green-200",
}

const PRIORITY_COLORS: Record<Priority, string> = {
    urgent: "text-red-600",
    high: "text-orange-500",
    medium: "text-yellow-500",
    low: "text-blue-400",
}

const PRIORITY_LABELS: Record<Priority, string> = {
    urgent: "🔴 Urgent",
    high: "🟠 High",
    medium: "🟡 Medium",
    low: "🔵 Low",
}

// ─── Types ────────────────────────────────────────────────────────────────────

type Task = {
    _id: Id<"tasks">
    title: string
    description?: string
    status: Status
    priority: Priority
    workspaceId: Id<"workspaces">
    assigneeId?: Id<"members">
    createdBy: Id<"members">
    dueDate?: number
    labels?: string[]
    storyPoints?: number
    updatedAt?: number
    assignee: { _id: Id<"members">; user: { name?: string; image?: string } | null } | null
    creator: { _id: Id<"members">; user: { name?: string; image?: string } | null } | null
}

// ─── Create Task Modal ────────────────────────────────────────────────────────

interface CreateTaskModalProps {
    open: boolean
    onClose: () => void
    workspaceId: Id<"workspaces">
    members: { _id: Id<"members">; user: { name?: string; image?: string } }[]
}

const CreateTaskModal = ({ open, onClose, workspaceId, members }: CreateTaskModalProps) => {
    const { mutate: createTask, isPending } = useCreateTask()
    const [title, setTitle] = useState("")
    const [description, setDescription] = useState("")
    const [status, setStatus] = useState<Status>("todo")
    const [priority, setPriority] = useState<Priority>("medium")
    const [assigneeId, setAssigneeId] = useState<string>("")
    const [dueDate, setDueDate] = useState("")
    const [labelInput, setLabelInput] = useState("")
    const [labels, setLabels] = useState<string[]>([])
    const [storyPoints, setStoryPoints] = useState("")

    const handleAddLabel = (e: React.KeyboardEvent) => {
        if (e.key === "Enter" && labelInput.trim()) {
            setLabels(prev => [...prev, labelInput.trim()])
            setLabelInput("")
        }
    }

    const handleSubmit = () => {
        if (!title.trim()) return toast.error("Title is required")
        createTask({
            workspaceId,
            title,
            description: description || undefined,
            status,
            priority,
            assigneeId: assigneeId ? assigneeId as Id<"members"> : undefined,
            dueDate: dueDate ? new Date(dueDate).getTime() : undefined,
            labels: labels.length > 0 ? labels : undefined,
            storyPoints: storyPoints ? parseInt(storyPoints) : undefined,
        }, {
            onSuccess: () => {
                toast.success("Task created")
                onClose()
                setTitle(""); setDescription(""); setStatus("todo")
                setPriority("medium"); setAssigneeId(""); setDueDate("")
                setLabels([]); setStoryPoints("")
            },
            onError: (e) => toast.error(e.message)
        })
    }

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="max-w-lg">
                <DialogHeader>
                    <DialogTitle>Create New Task</DialogTitle>
                </DialogHeader>
                <div className="flex flex-col gap-3 mt-2">
                    <Input
                        placeholder="Task title *"
                        value={title}
                        onChange={e => setTitle(e.target.value)}
                    />
                    <textarea
                        placeholder="Description..."
                        value={description}
                        onChange={e => setDescription(e.target.value)}
                        className="border rounded-md p-2 text-sm resize-none h-20 outline-none focus:border-[#ff5018]"
                    />
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="text-xs text-muted-foreground mb-1 block">Status</label>
                            <Select value={status} onValueChange={v => setStatus(v as Status)}>
                                <SelectTrigger className="h-8 text-xs">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {STATUSES.map(s => (
                                        <SelectItem key={s} value={s}>{STATUS_LABELS[s]}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div>
                            <label className="text-xs text-muted-foreground mb-1 block">Priority</label>
                            <Select value={priority} onValueChange={v => setPriority(v as Priority)}>
                                <SelectTrigger className="h-8 text-xs">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {PRIORITIES.map(p => (
                                        <SelectItem key={p} value={p}>{PRIORITY_LABELS[p]}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div>
                            <label className="text-xs text-muted-foreground mb-1 block">Assignee</label>
                            <Select value={assigneeId} onValueChange={setAssigneeId}>
                                <SelectTrigger className="h-8 text-xs">
                                    <SelectValue placeholder="Unassigned" />
                                </SelectTrigger>
                                <SelectContent>
                                    {members.map(m => (
                                        <SelectItem key={m._id} value={m._id}>
                                            {m.user.name ?? "Unknown"}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div>
                            <label className="text-xs text-muted-foreground mb-1 block">Due Date</label>
                            <Input
                                type="date"
                                value={dueDate}
                                onChange={e => setDueDate(e.target.value)}
                                className="h-8 text-xs"
                            />
                        </div>
                        <div>
                            <label className="text-xs text-muted-foreground mb-1 block">Story Points</label>
                            <Input
                                type="number"
                                placeholder="0"
                                value={storyPoints}
                                onChange={e => setStoryPoints(e.target.value)}
                                className="h-8 text-xs"
                            />
                        </div>
                        <div>
                            <label className="text-xs text-muted-foreground mb-1 block">Labels (Enter to add)</label>
                            <Input
                                placeholder="Add label..."
                                value={labelInput}
                                onChange={e => setLabelInput(e.target.value)}
                                onKeyDown={handleAddLabel}
                                className="h-8 text-xs"
                            />
                        </div>
                    </div>
                    {labels.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                            {labels.map(l => (
                                <Badge
                                    key={l}
                                    variant="secondary"
                                    className="cursor-pointer text-xs"
                                    onClick={() => setLabels(prev => prev.filter(x => x !== l))}
                                >
                                    {l} ×
                                </Badge>
                            ))}
                        </div>
                    )}
                    <Button
                        onClick={handleSubmit}
                        disabled={isPending}
                        className="bg-[#ff5018]/80 hover:bg-[#ff5018] text-white"
                    >
                        {isPending ? <Loader className="size-4 animate-spin" /> : "Create Task"}
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    )
}

// ─── Task Card ────────────────────────────────────────────────────────────────

interface TaskCardProps {
    task: Task
    isAdmin: boolean
    currentMemberId?: Id<"members">
    members: { _id: Id<"members">; user: { name?: string; image?: string } }[]
    onDelete: (id: Id<"tasks">) => void
    onUpdate: (id: Id<"tasks">, data: Partial<Task>) => void
    onAssignToMe: (id: Id<"tasks">) => void
}

const TaskCard = ({ task, isAdmin, currentMemberId, members, onDelete, onUpdate, onAssignToMe }: TaskCardProps) => {
    const isAssignedToMe = task.assigneeId === currentMemberId
    const isOverdue = task.dueDate && task.dueDate < Date.now() && task.status !== "done"

    return (
        <div className="bg-white border rounded-lg p-3 shadow-sm flex flex-col gap-2 group">
            {/* Header */}
            <div className="flex items-start justify-between gap-2">
                <p className="text-sm font-medium leading-tight">{task.title}</p>
                {isAdmin && (
                    <button
                        onClick={() => onDelete(task._id)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive shrink-0"
                    >
                        <Trash2 className="size-3.5" />
                    </button>
                )}
            </div>

            {/* Description */}
            {task.description && (
                <p className="text-xs text-muted-foreground line-clamp-2">{task.description}</p>
            )}

            {/* Labels */}
            {task.labels && task.labels.length > 0 && (
                <div className="flex flex-wrap gap-1">
                    {task.labels.map(l => (
                        <Badge key={l} variant="outline" className="text-[10px] px-1.5 py-0">
                            {l}
                        </Badge>
                    ))}
                </div>
            )}

            {/* Meta */}
            <div className="flex items-center gap-2 flex-wrap">
                <span className={cn("text-xs font-medium", PRIORITY_COLORS[task.priority])}>
                    <Flag className="size-3 inline mr-0.5" />
                    {PRIORITY_LABELS[task.priority].split(" ")[1]}
                </span>

                {task.storyPoints !== undefined && (
                    <span className="text-xs text-muted-foreground flex items-center gap-0.5">
                        <Star className="size-3" /> {task.storyPoints}pts
                    </span>
                )}

                {task.dueDate && (
                    <span className={cn("text-xs flex items-center gap-0.5", isOverdue ? "text-red-500" : "text-muted-foreground")}>
                        <Calendar className="size-3" />
                        {format(task.dueDate, "MMM d")}
                    </span>
                )}
            </div>

            {/* Status selector for members */}
            {!isAdmin && (
                <Select
                    value={task.status}
                    onValueChange={(v) => onUpdate(task._id, { status: v as Status })}
                >
                    <SelectTrigger className={cn("h-6 text-[10px] border rounded px-2", STATUS_COLORS[task.status])}>
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        {STATUSES.map(s => (
                            <SelectItem key={s} value={s} className="text-xs">{STATUS_LABELS[s]}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            )}

            {/* Admin: reassign */}
            {isAdmin && (
                <Select
                    value={task.assigneeId ?? "unassigned"}
                    onValueChange={(v) => onUpdate(task._id, {
                        assigneeId: v === "unassigned" ? undefined : v as Id<"members">
                    })}
                >
                    <SelectTrigger className="h-6 text-[10px] border rounded px-2">
                        <SelectValue placeholder="Unassigned" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="unassigned" className="text-xs">Unassigned</SelectItem>
                        {members.map(m => (
                            <SelectItem key={m._id} value={m._id} className="text-xs">
                                {m.user.name ?? "Unknown"}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            )}

            {/* Footer */}
            <div className="flex items-center justify-between mt-1">
                {task.assignee ? (
                    <div className="flex items-center gap-1">
                        <Avatar className="size-5">
                            <AvatarImage src={task.assignee.user?.image} />
                            <AvatarFallback className="text-[9px]">
                                {task.assignee.user?.name?.[0] ?? "?"}
                            </AvatarFallback>
                        </Avatar>
                        <span className="text-[10px] text-muted-foreground">
                            {task.assignee.user?.name ?? "Unknown"}
                        </span>
                    </div>
                ) : (
                    <span className="text-[10px] text-muted-foreground">Unassigned</span>
                )}

                {!isAssignedToMe && !isAdmin && (
                    <button
                        onClick={() => onAssignToMe(task._id)}
                        className="text-[10px] text-[#ff5018] hover:underline flex items-center gap-0.5"
                    >
                        <UserPlus className="size-3" /> Assign to me
                    </button>
                )}
            </div>
        </div>
    )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function TasksPage() {
    const workspaceId = useWorkspaceId()
    const { data: currentMember } = useCurrentMember({ workspaceId })
    const { data: tasks, isLoading } = useGetTasks({ workspaceId })
    const { data: members } = useGetMembers({ workspaceId })
    const { mutate: updateTask } = useUpdateTask()
    const { mutate: removeTask } = useRemoveTask()
    const { mutate: assignToMe } = useAssignToMe()

    const [view, setView] = useState<"board" | "list">("board")
    const [showCreate, setShowCreate] = useState(false)
    const [filterStatus, setFilterStatus] = useState<Status | "all">("all")
    const [filterAssignee, setFilterAssignee] = useState<string>("all")

    const isAdmin = currentMember?.role === "admin"

    const handleUpdate = (id: Id<"tasks">, data: Partial<Task>) => {
        updateTask({ id, ...data } as any, {
            onError: (e) => toast.error(e.message)
        })
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
        return true
    }) as Task[]

    const tasksByStatus = STATUSES.reduce((acc, status) => {
        acc[status] = filteredTasks.filter(t => t.status === status)
        return acc
    }, {} as Record<Status, Task[]>)

    const safeMembers = (members ?? []) as { _id: Id<"members">; user: { name?: string; image?: string } }[]

    return (
        <div className="h-full flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b">
                <div className="flex items-center gap-3">
                    <h1 className="text-lg font-bold">Tasks</h1>
                    <div className="flex items-center border rounded-md overflow-hidden">
                        <button
                            onClick={() => setView("board")}
                            className={cn("p-1.5 transition-colors", view === "board" ? "bg-[#ff5018] text-white" : "hover:bg-muted")}
                        >
                            <LayoutGrid className="size-4" />
                        </button>
                        <button
                            onClick={() => setView("list")}
                            className={cn("p-1.5 transition-colors", view === "list" ? "bg-[#ff5018] text-white" : "hover:bg-muted")}
                        >
                            <List className="size-4" />
                        </button>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    {/* Filter by status */}
                    <Select value={filterStatus} onValueChange={v => setFilterStatus(v as Status | "all")}>
                        <SelectTrigger className="h-8 text-xs w-36">
                            <SelectValue placeholder="All statuses" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Statuses</SelectItem>
                            {STATUSES.map(s => (
                                <SelectItem key={s} value={s}>{STATUS_LABELS[s]}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>

                    {/* Filter by assignee */}
                    <Select value={filterAssignee} onValueChange={setFilterAssignee}>
                        <SelectTrigger className="h-8 text-xs w-36">
                            <SelectValue placeholder="All members" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Members</SelectItem>
                            {safeMembers.map(m => (
                                <SelectItem key={m._id} value={m._id}>
                                    {m.user.name ?? "Unknown"}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>

                    {isAdmin && (
                        <Button
                            onClick={() => setShowCreate(true)}
                            className="bg-[#ff5018]/80 hover:bg-[#ff5018] text-white h-8 text-xs"
                        >
                            <Plus className="size-4 mr-1" /> New Task
                        </Button>
                    )}
                </div>
            </div>

            {/* Content */}
            {isLoading ? (
                <div className="flex-1 flex items-center justify-center">
                    <Loader className="size-6 animate-spin text-[#ff5018]" />
                </div>
            ) : view === "board" ? (
                // ── Kanban Board ──
                <div className="flex-1 overflow-x-auto p-4">
                    <div className="flex gap-4 h-full min-w-max">
                        {STATUSES.map(status => (
                            <div key={status} className="w-64 flex flex-col gap-2">
                                <div className={cn("rounded-md px-3 py-1.5 flex items-center justify-between", STATUS_HEADER_COLORS[status])}>
                                    <span className="text-xs font-semibold">{STATUS_LABELS[status]}</span>
                                    <span className="text-xs font-bold">{tasksByStatus[status].length}</span>
                                </div>
                                <div className="flex flex-col gap-2 overflow-y-auto flex-1">
                                    {tasksByStatus[status].map(task => (
                                        <TaskCard
                                            key={task._id}
                                            task={task}
                                            isAdmin={isAdmin}
                                            currentMemberId={currentMember?._id}
                                            members={safeMembers}
                                            onDelete={handleDelete}
                                            onUpdate={handleUpdate}
                                            onAssignToMe={handleAssignToMe}
                                        />
                                    ))}
                                    {tasksByStatus[status].length === 0 && (
                                        <div className="text-xs text-muted-foreground text-center py-6 border border-dashed rounded-lg">
                                            No tasks
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            ) : (
                // ── List View ──
                <div className="flex-1 overflow-y-auto p-4">
                    <div className="border rounded-lg overflow-hidden">
                        <table className="w-full text-sm">
                            <thead className="bg-muted">
                                <tr>
                                    <th className="text-left px-4 py-2 text-xs font-semibold">Title</th>
                                    <th className="text-left px-4 py-2 text-xs font-semibold">Status</th>
                                    <th className="text-left px-4 py-2 text-xs font-semibold">Priority</th>
                                    <th className="text-left px-4 py-2 text-xs font-semibold">Assignee</th>
                                    <th className="text-left px-4 py-2 text-xs font-semibold">Due Date</th>
                                    <th className="text-left px-4 py-2 text-xs font-semibold">Points</th>
                                    <th className="text-left px-4 py-2 text-xs font-semibold">Labels</th>
                                    {isAdmin && <th className="px-4 py-2" />}
                                </tr>
                            </thead>
                            <tbody>
                                {filteredTasks.length === 0 ? (
                                    <tr>
                                        <td colSpan={8} className="text-center py-8 text-muted-foreground text-xs">
                                            No tasks found
                                        </td>
                                    </tr>
                                ) : filteredTasks.map(task => (
                                    <tr key={task._id} className="border-t hover:bg-muted/30 transition-colors">
                                        <td className="px-4 py-2.5">
                                            <p className="font-medium text-sm">{task.title}</p>
                                            {task.description && (
                                                <p className="text-xs text-muted-foreground truncate max-w-48">{task.description}</p>
                                            )}
                                        </td>
                                        <td className="px-4 py-2.5">
                                            {isAdmin ? (
                                                <Select
                                                    value={task.status}
                                                    onValueChange={v => handleUpdate(task._id, { status: v as Status })}
                                                >
                                                    <SelectTrigger className={cn("h-6 text-[10px] border rounded px-2 w-28", STATUS_COLORS[task.status])}>
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {STATUSES.map(s => (
                                                            <SelectItem key={s} value={s} className="text-xs">{STATUS_LABELS[s]}</SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            ) : (
                                                <Badge className={cn("text-[10px]", STATUS_COLORS[task.status])}>
                                                    {STATUS_LABELS[task.status]}
                                                </Badge>
                                            )}
                                        </td>
                                        <td className={cn("px-4 py-2.5 text-xs font-medium", PRIORITY_COLORS[task.priority])}>
                                            {PRIORITY_LABELS[task.priority]}
                                        </td>
                                        <td className="px-4 py-2.5">
                                            <div className="flex items-center gap-1.5">
                                                {task.assignee ? (
                                                    <>
                                                        <Avatar className="size-5">
                                                            <AvatarImage src={task.assignee.user?.image} />
                                                            <AvatarFallback className="text-[9px]">
                                                                {task.assignee.user?.name?.[0] ?? "?"}
                                                            </AvatarFallback>
                                                        </Avatar>
                                                        <span className="text-xs">{task.assignee.user?.name}</span>
                                                    </>
                                                ) : (
                                                    <span className="text-xs text-muted-foreground">Unassigned</span>
                                                )}
                                                {task.assigneeId !== currentMember?._id && !isAdmin && (
                                                    <button
                                                        onClick={() => handleAssignToMe(task._id)}
                                                        className="text-[10px] text-[#ff5018] hover:underline ml-1"
                                                    >
                                                        + me
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                        <td className={cn("px-4 py-2.5 text-xs", task.dueDate && task.dueDate < Date.now() && task.status !== "done" ? "text-red-500" : "text-muted-foreground")}>
                                            {task.dueDate ? format(task.dueDate, "MMM d, yyyy") : "—"}
                                        </td>
                                        <td className="px-4 py-2.5 text-xs text-muted-foreground">
                                            {task.storyPoints ?? "—"}
                                        </td>
                                        <td className="px-4 py-2.5">
                                            <div className="flex flex-wrap gap-1">
                                                {task.labels?.map(l => (
                                                    <Badge key={l} variant="outline" className="text-[10px] px-1.5 py-0">{l}</Badge>
                                                ))}
                                            </div>
                                        </td>
                                        {isAdmin && (
                                            <td className="px-4 py-2.5">
                                                <button
                                                    onClick={() => handleDelete(task._id)}
                                                    className="text-muted-foreground hover:text-destructive transition-colors"
                                                >
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

            {/* Create Modal */}
            {isAdmin && (
                <CreateTaskModal
                    open={showCreate}
                    onClose={() => setShowCreate(false)}
                    workspaceId={workspaceId}
                    members={safeMembers}
                />
            )}
        </div>
    )
}