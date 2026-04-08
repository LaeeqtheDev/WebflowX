"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
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
import { STATUS_COLORS, STATUS_LABELS, STATUSES, PRIORITIES, PRIORITY_LABELS } from "@/features/tasks/constants"
import { Task, Member, Sprint } from "@/features/tasks/types"
import { useCreateTaskComment } from "@/features/tasks/use-create-task-comment"
import { useGetTaskComments } from "@/features/tasks/use-get-task-comment"
import { useRemoveTaskComment } from "@/features/tasks/use-remove-task-comment"
import { Id } from "../../../../../../../convex/_generated/dataModel"

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
    const isOverdue = task.dueDate && task.dueDate < Date.now() && task.status !== "done"
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
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-0">
                <VisuallyHidden><DialogTitle>Task Detail</DialogTitle></VisuallyHidden>

                {/* Header */}
                <div className="flex items-start justify-between p-6 pb-0">
                    <div className="flex flex-col gap-1 flex-1">
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <span className={cn("px-2 py-0.5 rounded text-[10px] font-medium border", STATUS_COLORS[task.status])}>
                                {STATUS_LABELS[task.status]}
                            </span>
                            {activeSprint && (
                                <span className="flex items-center gap-1 text-purple-600">
                                    <Zap className="size-3" /> {activeSprint.name}
                                </span>
                            )}
                        </div>
                        {isAdmin ? (
                            <input
                                defaultValue={task.title}
                                onBlur={(e) => onUpdate(task._id, { title: e.target.value })}
                                className="text-xl font-bold outline-none border-b border-transparent focus:border-[#ff5018] transition-colors bg-transparent"
                            />
                        ) : (
                            <h2 className="text-xl font-bold">{task.title}</h2>
                        )}
                    </div>
                    {isAdmin && (
                        <Button variant="ghost" size="iconSm"
                            onClick={() => { onDelete(task._id); onClose() }}
                            className="text-muted-foreground hover:text-destructive ml-4 shrink-0">
                            <Trash2 className="size-4" />
                        </Button>
                    )}
                </div>

                <div className="flex gap-0 p-6 pt-4">
                    {/* Left */}
                    <div className="flex-1 flex flex-col gap-4 min-w-0 pr-6">
                        <div>
                            <p className="text-xs font-semibold text-muted-foreground mb-1">Description</p>
                            {isAdmin ? (
                                <textarea
                                    defaultValue={task.description ?? ""}
                                    onBlur={(e) => onUpdate(task._id, { description: e.target.value })}
                                    placeholder="Add a description..."
                                    className="w-full text-sm outline-none border rounded-md p-2 resize-none h-24 focus:border-[#ff5018] transition-colors bg-transparent"
                                />
                            ) : (
                                <p className="text-sm text-muted-foreground">
                                    {task.description || "No description provided."}
                                </p>
                            )}
                        </div>

                        {task.labels && task.labels.length > 0 && (
                            <div>
                                <p className="text-xs font-semibold text-muted-foreground mb-1">Labels</p>
                                <div className="flex flex-wrap gap-1">
                                    {task.labels.map((l, index) => (
                                        <Badge key={index} variant="outline" className="text-xs">{l}</Badge>
                                    ))}
                                </div>
                            </div>
                        )}

                        <Separator />

                        <div>
                            <p className="text-xs font-semibold text-muted-foreground mb-3 flex items-center gap-1">
                                <MessageSquare className="size-3" /> Activity
                            </p>
                            <div className="flex flex-col gap-3 mb-3">
                                {comments?.length === 0 && (
                                    <p className="text-xs text-muted-foreground">No comments yet.</p>
                                )}
                                {comments?.map(comment => (
                                    <div key={comment._id} className="flex items-start gap-2 group">
                                        <Avatar className="size-6 shrink-0">
                                            <AvatarImage src={comment.member?.user?.image} />
                                            <AvatarFallback className="text-[9px]">
                                                {comment.member?.user?.name?.[0] ?? "?"}
                                            </AvatarFallback>
                                        </Avatar>
                                        <div className="flex-1 min-w-0">
                                            <span className="text-xs font-medium">{comment.member?.user?.name ?? "Unknown"}</span>
                                            <p className="text-xs text-muted-foreground mt-0.5">{comment.body}</p>
                                        </div>
                                        {(comment.memberId === currentMemberId || isAdmin) && (
                                            <button
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
                                <Input
                                    placeholder="Add a comment..."
                                    value={commentBody}
                                    onChange={e => setCommentBody(e.target.value)}
                                    onKeyDown={e => e.key === "Enter" && handleComment()}
                                    className="text-xs h-8"
                                />
                                <Button size="iconSm" onClick={handleComment}
                                    disabled={isCommenting || !commentBody.trim()}
                                    className="bg-[#ff5018]/80 hover:bg-[#ff5018] text-white shrink-0">
                                    <Send className="size-3.5" />
                                </Button>
                            </div>
                        </div>
                    </div>

                    {/* Right */}
                    <div className="w-48 shrink-0 flex flex-col gap-3 border-l pl-6">
                        <div>
                            <p className="text-[10px] font-semibold text-muted-foreground mb-1">STATUS</p>
                            <Select value={task.status} onValueChange={v => onUpdate(task._id, { status: v as any })}
                                disabled={!isAdmin && task.assigneeId !== currentMemberId}>
                                <SelectTrigger className={cn("h-7 text-xs border", STATUS_COLORS[task.status])}>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {STATUSES.map(s => <SelectItem key={s} value={s} className="text-xs">{STATUS_LABELS[s]}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>

                        <div>
                            <p className="text-[10px] font-semibold text-muted-foreground mb-1">PRIORITY</p>
                            <Select value={task.priority} onValueChange={v => isAdmin && onUpdate(task._id, { priority: v as any })} disabled={!isAdmin}>
                                <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    {PRIORITIES.map(p => <SelectItem key={p} value={p} className="text-xs">{PRIORITY_LABELS[p]}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>

                        <div>
                            <p className="text-[10px] font-semibold text-muted-foreground mb-1">ASSIGNEE</p>
                            {isAdmin ? (
                                <Select value={task.assigneeId ?? "unassigned"}
                                    onValueChange={v => onUpdate(task._id, { assigneeId: v === "unassigned" ? undefined : v as Id<"members"> })}>
                                    <SelectTrigger className="h-7 text-xs"><SelectValue placeholder="Unassigned" /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="unassigned" className="text-xs">Unassigned</SelectItem>
                                        {members.map(m => <SelectItem key={m._id} value={m._id} className="text-xs">{m.user.name ?? "Unknown"}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            ) : (
                                <div className="flex flex-col gap-1">
                                    {task.assignee ? (
                                        <div className="flex items-center gap-1.5">
                                            <Avatar className="size-5">
                                                <AvatarImage src={task.assignee.user?.image} />
                                                <AvatarFallback className="text-[9px]">{task.assignee.user?.name?.[0] ?? "?"}</AvatarFallback>
                                            </Avatar>
                                            <span className="text-xs">{task.assignee.user?.name}</span>
                                        </div>
                                    ) : (
                                        <span className="text-xs text-muted-foreground">Unassigned</span>
                                    )}
                                    {!isAssignedToMe && (
                                        <button onClick={() => onAssignToMe(task._id)}
                                            className="text-[10px] text-[#ff5018] hover:underline flex items-center gap-0.5 mt-1">
                                            <UserPlus className="size-3" /> Assign to me
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>

                        <div>
                            <p className="text-[10px] font-semibold text-muted-foreground mb-1">SPRINT</p>
                            {isAdmin ? (
                                <Select value={task.sprintId ?? "none"}
                                    onValueChange={v => onUpdate(task._id, { sprintId: v === "none" ? undefined : v as Id<"sprints"> })}>
                                    <SelectTrigger className="h-7 text-xs"><SelectValue placeholder="No sprint" /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="none" className="text-xs">No Sprint</SelectItem>
                                        {sprints.map(s => <SelectItem key={s._id} value={s._id} className="text-xs">{s.name}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            ) : (
                                <span className="text-xs text-muted-foreground">{activeSprint?.name ?? "No sprint"}</span>
                            )}
                        </div>

                        <div>
                            <p className="text-[10px] font-semibold text-muted-foreground mb-1">DUE DATE</p>
                            {isAdmin ? (
                                <Input type="date"
                                    defaultValue={task.dueDate ? format(task.dueDate, "yyyy-MM-dd") : ""}
                                    onChange={e => onUpdate(task._id, { dueDate: e.target.value ? new Date(e.target.value).getTime() : undefined })}
                                    className="h-7 text-xs" />
                            ) : (
                                <span className={cn("text-xs", isOverdue ? "text-red-500" : "text-muted-foreground")}>
                                    {task.dueDate ? format(task.dueDate, "MMM d, yyyy") : "No due date"}
                                </span>
                            )}
                        </div>

                        <div>
                            <p className="text-[10px] font-semibold text-muted-foreground mb-1">STORY POINTS</p>
                            {isAdmin ? (
                                <Input type="number" defaultValue={task.storyPoints ?? ""}
                                    onBlur={e => onUpdate(task._id, { storyPoints: e.target.value ? parseInt(e.target.value) : undefined })}
                                    className="h-7 text-xs" />
                            ) : (
                                <span className="text-xs text-muted-foreground flex items-center gap-1">
                                    <Star className="size-3" /> {task.storyPoints ?? "—"} pts
                                </span>
                            )}
                        </div>

                        <div>
                            <p className="text-[10px] font-semibold text-muted-foreground mb-1">CREATED BY</p>
                            <div className="flex items-center gap-1.5">
                                <Avatar className="size-5">
                                    <AvatarImage src={task.creator?.user?.image} />
                                    <AvatarFallback className="text-[9px]">{task.creator?.user?.name?.[0] ?? "?"}</AvatarFallback>
                                </Avatar>
                                <span className="text-xs text-muted-foreground">{task.creator?.user?.name ?? "Unknown"}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    )
}