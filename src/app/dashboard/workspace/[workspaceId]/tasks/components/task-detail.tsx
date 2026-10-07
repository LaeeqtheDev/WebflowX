"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Separator } from "@/components/ui/separator"
import { Dialog, DialogContent } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { VisuallyHidden } from "@radix-ui/react-visually-hidden"
import { DialogTitle } from "@/components/ui/dialog"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { format } from "date-fns"
import { Trash2, MessageSquare, X, Send, Zap, Star, UserPlus } from "lucide-react"
import { STATUS_LABELS, STATUSES, PRIORITIES } from "@/features/tasks/constants"
import { PRIORITY_TEXT, STATUS_PILL } from "./task-styles"
import { Task, Member, Sprint } from "@/features/tasks/types"
import { useCreateTaskComment } from "@/features/tasks/use-create-task-comment"
import { useGetTaskComments } from "@/features/tasks/use-get-task-comment"
import { useRemoveTaskComment } from "@/features/tasks/use-remove-task-comment"
import { Id } from "../../../../../../../convex/_generated/dataModel"

// Wall-clock read kept outside the render body; evaluated on every render exactly as before.
const getNow = () => Date.now()

interface TaskDetailProps {
    task: Task | null
    onClose: () => void
    isAdmin: boolean
    currentMemberId?: Id<"members">
    members: Member[]
    sprints: Sprint[]
    workspaceId: Id<"workspaces">
    onUpdate: (id: Id<"tasks">, data: Partial<Task>) => void
    onDelete: (id: Id<"tasks">) => void
    onAssignToMe: (id: Id<"tasks">) => void
}

export const TaskDetail = ({
    task, onClose, isAdmin, currentMemberId, members,
    sprints, workspaceId, onUpdate, onDelete, onAssignToMe
}: TaskDetailProps) => {
    const [commentBody, setCommentBody] = useState("")
    const { data: comments } = useGetTaskComments({ taskId: task?._id ?? null })
    const { mutate: createComment, isPending: isCommenting } = useCreateTaskComment()
    const { mutate: removeComment } = useRemoveTaskComment()

    if (!task) return null

    const isAssignedToMe = task.assigneeId === currentMemberId
    const isOverdue = task.dueDate && task.dueDate < getNow() && task.status !== "done"
    const activeSprint = sprints.find(s => s._id === task.sprintId)

    const handleComment = () => {
        if (!commentBody.trim()) return
        createComment({ taskId: task._id, workspaceId, body: commentBody }, {
            onSuccess: () => setCommentBody(""),
            onError: (e) => toast.error(e.message)
        })
    }

    return (
        <Dialog open={!!task} onOpenChange={onClose}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-0 rounded-2xl border-plum/12">
                <VisuallyHidden><DialogTitle>Task Detail</DialogTitle></VisuallyHidden>

                {/* Header */}
                <div className="flex items-start justify-between px-4 md:px-6 pt-6 pb-4 border-b border-plum/10">
                    <div className="flex flex-col gap-2 flex-1">
                        <div className="flex items-center gap-2 text-xs text-ink/60">
                            <span className={cn("px-2 py-0.5 rounded-md text-[11px] font-medium", STATUS_PILL[task.status])}>
                                {STATUS_LABELS[task.status]}
                            </span>
                            {activeSprint && (
                                <span className="flex items-center gap-1 text-[11px] font-medium text-orange-ink">
                                    <Zap className="size-3" /> {activeSprint.name}
                                </span>
                            )}
                        </div>
                        {isAdmin ? (
                            <input aria-label="Task title"
                                defaultValue={task.title}
                                onBlur={(e) => onUpdate(task._id, { title: e.target.value })}
                                className="text-xl font-semibold tracking-tight text-ink outline-none border-b border-transparent focus:border-[#ff5018] transition-colors bg-transparent"
                            />
                        ) : (
                            <h2 className="text-xl font-semibold tracking-tight text-ink">{task.title}</h2>
                        )}
                    </div>
                    {isAdmin && (
                        <Button aria-label="Delete task" variant="ghost" size="iconSm"
                            onClick={() => { onDelete(task._id); onClose() }}
                            className="text-ink/50 hover:text-destructive hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg ml-4 shrink-0">
                            <Trash2 className="size-4" />
                        </Button>
                    )}
                </div>

                <div className="flex gap-0 p-4 md:p-6 max-md:flex-col max-md:gap-5">
                    {/* Left */}
                    <div className="flex-1 flex flex-col gap-5 min-w-0 md:pr-6">
                        <div>
                            <p className="text-[13px] font-semibold tracking-tight text-ink mb-1.5">Description</p>
                            {isAdmin ? (
                                <textarea aria-label="Task description"
                                    defaultValue={task.description ?? ""}
                                    onBlur={(e) => onUpdate(task._id, { description: e.target.value })}
                                    placeholder="Add a description..."
                                    className="w-full text-sm outline-none border border-input rounded-lg px-3 py-2 resize-none h-24 focus:border-[#ff5018] focus:ring-2 focus:ring-[#ff5018]/20 transition-colors bg-transparent"
                                />
                            ) : (
                                <p className="text-sm text-ink/60 leading-relaxed">
                                    {task.description || "No description provided."}
                                </p>
                            )}
                        </div>

                        {task.labels && task.labels.length > 0 && (
                            <div>
                                <p className="text-[13px] font-semibold tracking-tight text-ink mb-1.5">Labels</p>
                                <div className="flex flex-wrap gap-1">
                                    {task.labels.map((l, index) => (
                                        <span key={index} className="bg-cream text-plum rounded-md px-2 py-0.5 text-[11px] font-medium">{l}</span>
                                    ))}
                                </div>
                            </div>
                        )}

                        <Separator className="bg-plum/10" />

                        <div>
                            <p className="text-[13px] font-semibold tracking-tight text-ink mb-3 flex items-center gap-1.5">
                                <MessageSquare className="size-3.5 text-[#ff5018]" /> Activity
                            </p>
                            <div className="flex flex-col gap-3 mb-3">
                                {comments?.length === 0 && (
                                    <p className="text-xs text-ink/65">No comments yet.</p>
                                )}
                                {comments?.map(comment => (
                                    <div key={comment._id} className="flex items-start gap-2 group">
                                        <Avatar className="size-6 rounded-md shrink-0">
                                            <AvatarImage src={comment.member?.user?.image} />
                                            <AvatarFallback className="text-[9px]">
                                                {comment.member?.user?.name?.[0] ?? "?"}
                                            </AvatarFallback>
                                        </Avatar>
                                        <div className="flex-1 min-w-0">
                                            <span className="text-xs font-semibold text-ink">{comment.member?.user?.name ?? "Unknown"}</span>
                                            <p className="text-xs text-ink/70 mt-0.5 leading-relaxed">{comment.body}</p>
                                        </div>
                                        {(comment.memberId === currentMemberId || isAdmin) && (
                                            <button aria-label="Delete comment" type="button"
                                                onClick={() => removeComment(comment._id, { onError: (e) => toast.error(e.message) })}
                                                className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-all"
                                            >
                                                <X className="size-3" />
                                            </button>
                                        )}
                                    </div>
                                ))}
                            </div>
                            <div className="flex items-center gap-2">
                                <Input aria-label="Add a comment"
                                    placeholder="Add a comment..."
                                    value={commentBody}
                                    onChange={e => setCommentBody(e.target.value)}
                                    onKeyDown={e => e.key === "Enter" && handleComment()}
                                    className="text-xs h-9 rounded-lg"
                                />
                                <Button aria-label="Post comment" size="iconSm" onClick={handleComment}
                                    disabled={isCommenting || !commentBody.trim()}
                                    className="bg-[#ff5018] hover:bg-[#e6430f] text-white rounded-lg shrink-0">
                                    <Send className="size-3.5" />
                                </Button>
                            </div>
                        </div>
                    </div>

                    {/* Right */}
                    <div className="w-52 max-md:w-full shrink-0 flex flex-col gap-4 md:border-l max-md:border-t border-plum/10 md:pl-6 max-md:pt-4">
                        <div>
                            <p className="text-[11px] font-medium text-ink/65 mb-1.5">Status</p>
                            <Select value={task.status} onValueChange={v => onUpdate(task._id, { status: v as Task["status"] })}
                                disabled={!isAdmin && task.assigneeId !== currentMemberId && task.createdBy !== currentMemberId}>
                                <SelectTrigger aria-label="Status" className={cn("h-8 text-xs rounded-lg border-transparent font-medium", STATUS_PILL[task.status])}>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {STATUSES.map(s => <SelectItem key={s} value={s} className="text-xs">{STATUS_LABELS[s]}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>

                        <div>
                            <p className="text-[11px] font-medium text-ink/65 mb-1.5">Priority</p>
                            <Select value={task.priority} onValueChange={v => isAdmin && onUpdate(task._id, { priority: v as Task["priority"] })} disabled={!isAdmin}>
                                <SelectTrigger aria-label="Priority" className="h-8 text-xs rounded-lg"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    {PRIORITIES.map(p => <SelectItem key={p} value={p} className="text-xs">{PRIORITY_TEXT[p]}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>

                        <div>
                            <p className="text-[11px] font-medium text-ink/65 mb-1.5">Assignee</p>
                            {isAdmin ? (
                                <Select value={task.assigneeId ?? "unassigned"}
                                    onValueChange={v => onUpdate(task._id, { assigneeId: v === "unassigned" ? undefined : v as Id<"members"> })}>
                                    <SelectTrigger aria-label="Assignee" className="h-8 text-xs rounded-lg"><SelectValue placeholder="Unassigned" /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="unassigned" className="text-xs">Unassigned</SelectItem>
                                        {members.map(m => <SelectItem key={m._id} value={m._id} className="text-xs">{m.user.name ?? "Unknown"}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            ) : (
                                <div className="flex flex-col gap-1">
                                    {task.assignee ? (
                                        <div className="flex items-center gap-1.5">
                                            <Avatar className="size-5 rounded-md">
                                                <AvatarImage src={task.assignee.user?.image} />
                                                <AvatarFallback className="text-[9px]">{task.assignee.user?.name?.[0] ?? "?"}</AvatarFallback>
                                            </Avatar>
                                            <span className="text-xs">{task.assignee.user?.name}</span>
                                        </div>
                                    ) : (
                                        <span className="text-xs text-ink/60">Unassigned</span>
                                    )}
                                    {!isAssignedToMe && (
                                        <button onClick={() => onAssignToMe(task._id)}
                                            className="text-[11px] font-medium text-orange-ink hover:text-orange-ink-hover flex items-center gap-0.5 mt-1">
                                            <UserPlus className="size-3" /> Assign to me
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>

                        <div>
                            <p className="text-[11px] font-medium text-ink/65 mb-1.5">Sprint</p>
                            {isAdmin ? (
                                <Select value={task.sprintId ?? "none"}
                                    onValueChange={v => onUpdate(task._id, { sprintId: v === "none" ? undefined : v as Id<"sprints"> })}>
                                    <SelectTrigger aria-label="Sprint" className="h-8 text-xs rounded-lg"><SelectValue placeholder="No sprint" /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="none" className="text-xs">No Sprint</SelectItem>
                                        {sprints.map(s => <SelectItem key={s._id} value={s._id} className="text-xs">{s.name}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            ) : (
                                <span className="text-xs text-ink/60">{activeSprint?.name ?? "No sprint"}</span>
                            )}
                        </div>

                        <div>
                            <p className="text-[11px] font-medium text-ink/65 mb-1.5">Due date</p>
                            {isAdmin ? (
                                <Input aria-label="Due date" type="date"
                                    defaultValue={task.dueDate ? format(task.dueDate, "yyyy-MM-dd") : ""}
                                    onChange={e => onUpdate(task._id, { dueDate: e.target.value ? new Date(e.target.value).getTime() : undefined })}
                                    className="h-8 text-xs rounded-lg" />
                            ) : (
                                <span className={cn("text-xs", isOverdue ? "text-red-600 dark:text-red-400 font-medium" : "text-ink/60")}>
                                    {task.dueDate ? format(task.dueDate, "MMM d, yyyy") : "No due date"}
                                </span>
                            )}
                        </div>

                        <div>
                            <p className="text-[11px] font-medium text-ink/65 mb-1.5">Story points</p>
                            {isAdmin ? (
                                <Input aria-label="Story points" type="number" defaultValue={task.storyPoints ?? ""}
                                    onBlur={e => onUpdate(task._id, { storyPoints: e.target.value ? parseInt(e.target.value) : undefined })}
                                    className="h-8 text-xs rounded-lg" />
                            ) : (
                                <span className="text-xs text-ink/60 flex items-center gap-1">
                                    <Star className="size-3" /> {task.storyPoints ?? "—"} pts
                                </span>
                            )}
                        </div>

                        <div>
                            <p className="text-[11px] font-medium text-ink/65 mb-1.5">Created by</p>
                            <div className="flex items-center gap-1.5">
                                <Avatar className="size-5 rounded-md">
                                    <AvatarImage src={task.creator?.user?.image} />
                                    <AvatarFallback className="text-[9px]">{task.creator?.user?.name?.[0] ?? "?"}</AvatarFallback>
                                </Avatar>
                                <span className="text-xs text-ink/60">{task.creator?.user?.name ?? "Unknown"}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    )
}