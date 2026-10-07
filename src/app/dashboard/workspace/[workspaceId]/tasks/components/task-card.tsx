"use client"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { cn } from "@/lib/utils"
import { format } from "date-fns"
import { Trash2, Flag, Star, Calendar, UserPlus } from "lucide-react"
import { Id } from "../../../../../../../convex/_generated/dataModel"
import { Member, Task } from "@/features/tasks/types"
import { PRIORITY_PILL, PRIORITY_TEXT } from "./task-styles"



// Wall-clock read kept outside the render body; evaluated on every render exactly as before.
const getNow = () => Date.now()

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
    const isOverdue = task.dueDate && task.dueDate < getNow() && task.status !== "done"
    const isAssignedToMe = task.assigneeId === currentMemberId

    return (
        <div
            className="bg-white border border-[#381d2a]/12 rounded-xl p-3.5 flex flex-col gap-2.5 group cursor-pointer hover:border-[#ff5018]/40 hover:shadow-sm transition-all"
            onClick={() => onOpen(task)}
        >
            <div className="flex items-start justify-between gap-2">
                <p className="text-sm font-semibold tracking-tight leading-snug text-[#1b1017]">{task.title}</p>
                {isAdmin && (
                    <button aria-label="Delete task" type="button"
                        onClick={(e) => { e.stopPropagation(); onDelete(task._id) }}
                        className="opacity-0 max-md:opacity-100 group-hover:opacity-100 transition-opacity text-[#1b1017]/50 hover:text-destructive shrink-0"
                    >
                        <Trash2 className="size-3.5" />
                    </button>
                )}
            </div>

            {task.description && (
                <p className="text-xs text-[#1b1017]/60 line-clamp-2">{task.description}</p>
            )}

            {task.labels && task.labels.length > 0 && (
                <div className="flex flex-wrap gap-1">
                    {task.labels.map((l, index) => (
                        <span key={index} className="bg-[#f7f2ee] text-[#381d2a] rounded-md px-2 py-0.5 text-[11px] font-medium">{l}</span>
                    ))}
                </div>
            )}

            <div className="flex items-center gap-2 flex-wrap">
                <span className={cn("inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-medium", PRIORITY_PILL[task.priority])}>
                    <Flag className="size-3" />
                    {PRIORITY_TEXT[task.priority]}
                </span>
                {task.storyPoints !== undefined && (
                    <span className="text-[11px] text-[#1b1017]/60 flex items-center gap-1 rounded-md bg-[#f7f2ee] px-2 py-0.5">
                        <Star className="size-3" /> {task.storyPoints}pts
                    </span>
                )}
                {task.dueDate && (
                    <span className={cn("text-[11px] flex items-center gap-1 rounded-md px-2 py-0.5", isOverdue ? "bg-red-50 text-red-700" : "bg-[#f7f2ee] text-[#1b1017]/60")}>
                        <Calendar className="size-3" />
                        {format(task.dueDate, "MMM d")}
                    </span>
                )}
            </div>

            <div className="flex items-center justify-between pt-2.5 border-t border-[#381d2a]/8" onClick={e => e.stopPropagation()}>
                {task.assignee ? (
                    <div className="flex items-center gap-1.5">
                        <Avatar className="size-5 rounded-md">
                            <AvatarImage src={task.assignee.user?.image} />
                            <AvatarFallback className="text-[9px]">{task.assignee.user?.name?.[0] ?? "?"}</AvatarFallback>
                        </Avatar>
                        <span className="text-[11px] text-[#1b1017]/60">{task.assignee.user?.name}</span>
                    </div>
                ) : (
                    <span className="text-[11px] text-[#1b1017]/65">Unassigned</span>
                )}
                {!isAssignedToMe && !isAdmin && (
                    <button
                        onClick={(e) => { e.stopPropagation(); onAssignToMe(task._id) }}
                        className="text-[11px] font-medium text-[#c2370d] hover:text-[#a82d0a] flex items-center gap-0.5"
                    >
                        <UserPlus className="size-3" /> Assign to me
                    </button>
                )}
            </div>
        </div>
    )
}