"use client"

import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { cn } from "@/lib/utils"
import { format } from "date-fns"
import { Trash2, Flag, Star, Calendar, UserPlus } from "lucide-react"
import { Id } from "../../../../../../../convex/_generated/dataModel"
import { Member, Task } from "@/features/tasks/types"
import { PRIORITY_COLORS, PRIORITY_LABELS } from "@/features/tasks/constants"



interface TaskCardProps {
    task: Task
    isAdmin: boolean
    currentMemberId?: Id<"members">
    members: Member[]
    onDelete: (id: Id<"tasks">) => void
    onUpdate: (id: Id<"tasks">, data: Partial<Task>) => void
    onAssignToMe: (id: Id<"tasks">) => void
    onOpen: (task: Task) => void
}

export const TaskCard = ({
    task, isAdmin, currentMemberId, members,
    onDelete, onUpdate, onAssignToMe, onOpen
}: TaskCardProps) => {
    const isOverdue = task.dueDate && task.dueDate < Date.now() && task.status !== "done"
    const isAssignedToMe = task.assigneeId === currentMemberId

    return (
        <div
            className="bg-white border rounded-lg p-3 shadow-sm flex flex-col gap-2 group cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => onOpen(task)}
        >
            <div className="flex items-start justify-between gap-2">
                <p className="text-sm font-medium leading-tight">{task.title}</p>
                {isAdmin && (
                    <button
                        onClick={(e) => { e.stopPropagation(); onDelete(task._id) }}
                        className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive shrink-0"
                    >
                        <Trash2 className="size-3.5" />
                    </button>
                )}
            </div>

            {task.description && (
                <p className="text-xs text-muted-foreground line-clamp-2">{task.description}</p>
            )}

            {task.labels && task.labels.length > 0 && (
                <div className="flex flex-wrap gap-1">
                    {task.labels.map((l, index) => (
                        <Badge key={index} variant="outline" className="text-[10px] px-1.5 py-0">{l}</Badge>
                    ))}
                </div>
            )}

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

            <div className="flex items-center justify-between mt-1" onClick={e => e.stopPropagation()}>
                {task.assignee ? (
                    <div className="flex items-center gap-1">
                        <Avatar className="size-5">
                            <AvatarImage src={task.assignee.user?.image} />
                            <AvatarFallback className="text-[9px]">{task.assignee.user?.name?.[0] ?? "?"}</AvatarFallback>
                        </Avatar>
                        <span className="text-[10px] text-muted-foreground">{task.assignee.user?.name}</span>
                    </div>
                ) : (
                    <span className="text-[10px] text-muted-foreground">Unassigned</span>
                )}
                {!isAssignedToMe && !isAdmin && (
                    <button
                        onClick={(e) => { e.stopPropagation(); onAssignToMe(task._id) }}
                        className="text-[10px] text-[#ff5018] hover:underline flex items-center gap-0.5"
                    >
                        <UserPlus className="size-3" /> Assign to me
                    </button>
                )}
            </div>
        </div>
    )
}