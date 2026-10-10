"use client"

import { useState } from "react"
import { formatDue } from "@/lib/due"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { formatDistanceToNow } from "date-fns"
import { Trash2, MessageSquare, X, Send, Zap, Star, UserPlus, CircleDot, Flag, User, Calendar, Plus, AlertTriangle } from "lucide-react"
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

const Field = ({ icon: Icon, label, children }: { icon: React.ComponentType<{ className?: string }>; label: string; children: React.ReactNode }) => (
    <div className="grid grid-cols-[6.25rem_minmax(0,1fr)] items-center gap-2 py-1">
        <span className="flex items-center gap-1.5 text-xs text-ink/60"><Icon className="size-3.5 shrink-0" aria-hidden />{label}</span>
        <div className="min-w-0">{children}</div>
    </div>
)

const quiet = "h-8 w-full rounded-lg border-transparent bg-transparent px-2 text-xs shadow-none hover:bg-surface focus:bg-surface"

const Person = ({ name, image }: { name?: string; image?: string }) => (
    <span className="flex items-center gap-1.5 px-2 text-xs text-ink">
        <Avatar className="size-5 rounded-md"><AvatarImage src={image} /><AvatarFallback className="text-[9px]">{name?.[0] ?? "?"}</AvatarFallback></Avatar>
        <span className="truncate">{name ?? "Unknown"}</span>
    </span>
)

export const TaskDetail = ({
    task, onClose, isAdmin, currentMemberId, members,
    sprints, workspaceId, onUpdate, onDelete, onAssignToMe
}: TaskDetailProps) => {
    const [commentBody, setCommentBody] = useState("")
    const [confirmDelete, setConfirmDelete] = useState(false)
    const [labelInput, setLabelInput] = useState("")
    const { data: comments } = useGetTaskComments({ taskId: task?._id ?? null })
    const { mutate: createComment, isPending: isCommenting } = useCreateTaskComment()
    const { mutate: removeComment } = useRemoveTaskComment()

    if (!task) return null

    const isAssignedToMe = task.assigneeId === currentMemberId
    const isOverdue = !!task.dueDate && task.dueDate < getNow() && task.status !== "done"
    const activeSprint = sprints.find(s => s._id === task.sprintId)
    const canSetStatus = isAdmin || task.assigneeId === currentMemberId || task.createdBy === currentMemberId
    const labels = task.labels ?? []

    const handleComment = () => {
        if (!commentBody.trim()) return
        createComment({ taskId: task._id, workspaceId, body: commentBody }, {
            onSuccess: () => setCommentBody(""),
            onError: (e) => toast.error(e.message)
        })
    }

    const addLabel = () => {
        const l = labelInput.trim().slice(0, 30)
        setLabelInput("")
        if (!l || labels.some((x) => x.toLowerCase() === l.toLowerCase())) return
        if (labels.length >= 10) return toast.error("A task can have up to 10 labels")
        onUpdate(task._id, { labels: [...labels, l] })
    }

    const grow = (el: HTMLTextAreaElement | null) => {
        if (!el) return
        el.style.height = "auto"
        el.style.height = `${Math.min(el.scrollHeight, 420)}px`
    }

    return (
        <Dialog open={!!task} onOpenChange={(o) => { if (!o) { setConfirmDelete(false); onClose() } }}>
            <DialogContent className="flex max-h-[92dvh] w-full max-w-4xl flex-col gap-0 overflow-hidden rounded-2xl border-plum/12 p-0 sm:max-w-4xl">
                <DialogTitle className="sr-only">Task: {task.title}</DialogTitle>
                <DialogDescription className="sr-only">View and edit this task, its details and its comments</DialogDescription>

                {/* Header */}
                <div className="border-b border-plum/10 px-5 pb-4 pt-5 pr-14 md:px-7">
                    <div className="mb-2 flex flex-wrap items-center gap-2 text-[11px] font-medium">
                        <span className={cn("rounded-md px-2 py-0.5", STATUS_PILL[task.status])}>{STATUS_LABELS[task.status]}</span>
                        {activeSprint && <span className="flex items-center gap-1 text-orange-ink"><Zap className="size-3" /> {activeSprint.name}</span>}
                        {isOverdue && <span className="flex items-center gap-1 text-red-600 dark:text-red-400"><AlertTriangle className="size-3" /> Overdue</span>}
                    </div>
                    {isAdmin ? (
                        <input aria-label="Task title" key={`${task._id}:${task.title}`} defaultValue={task.title} maxLength={200}
                            onBlur={(e) => {
                                const t = e.target.value.trim()
                                if (!t) { e.target.value = task.title; return toast.error("A task needs a title") }
                                if (t !== task.title) onUpdate(task._id, { title: t })
                            }}
                            onKeyDown={(e) => { if (e.key === "Enter") (e.target as HTMLInputElement).blur() }}
                            className="-mx-2 w-[calc(100%+1rem)] rounded-lg bg-transparent px-2 py-1 text-2xl font-semibold tracking-tight text-ink outline-none transition-colors hover:bg-cream-soft focus:bg-cream-soft focus:ring-2 focus:ring-brand/40"
                        />
                    ) : (
                        <h2 className="text-2xl font-semibold tracking-tight text-ink">{task.title}</h2>
                    )}
                </div>

                <div className="grid min-h-0 flex-1 overflow-y-auto md:grid-cols-[minmax(0,1fr)_18.5rem]">
                    {/* Left */}
                    <div className="flex min-w-0 flex-col gap-6 px-5 py-5 md:px-7">
                        <section>
                            <h3 className="mb-2 text-[13px] font-semibold tracking-tight text-ink">Description</h3>
                            {isAdmin ? (
                                <textarea aria-label="Task description" ref={(el) => grow(el)}
                                    key={`${task._id}:${task.description ?? ""}`} defaultValue={task.description ?? ""} maxLength={5000}
                                    onInput={(e) => grow(e.currentTarget)}
                                    onBlur={(e) => { const v = e.target.value; if (v !== (task.description ?? "")) onUpdate(task._id, { description: v.trim() === "" ? undefined : v }) }}
                                    placeholder="What needs to happen, and why? Add context, links or acceptance criteria."
                                    className="min-h-[9rem] w-full resize-none rounded-xl border border-plum/12 bg-transparent px-3.5 py-3 text-sm leading-relaxed outline-none transition-colors placeholder:text-ink/40 focus:border-brand focus:ring-2 focus:ring-brand/20"
                                />
                            ) : (
                                <p className="whitespace-pre-wrap text-sm leading-relaxed text-ink/70">{task.description || "No description provided."}</p>
                            )}
                        </section>

                        {(isAdmin || labels.length > 0) && (
                            <section>
                                <h3 className="mb-2 text-[13px] font-semibold tracking-tight text-ink">Labels</h3>
                                <div className="flex flex-wrap items-center gap-1.5">
                                    {labels.map((l) => (
                                        <span key={l} className="inline-flex items-center gap-1 rounded-md bg-cream px-2 py-0.5 text-[11px] font-medium text-plum">
                                            {l}
                                            {isAdmin && (
                                                <button type="button" aria-label={`Remove label ${l}`} onClick={() => onUpdate(task._id, { labels: labels.filter((x) => x !== l) })} className="rounded hover:text-destructive">
                                                    <X className="size-3" />
                                                </button>
                                            )}
                                        </span>
                                    ))}
                                    {isAdmin && (
                                        <span className="inline-flex items-center gap-1">
                                            <Plus className="size-3 text-ink/40" aria-hidden />
                                            <input aria-label="Add a label" value={labelInput} maxLength={30} placeholder="Add label"
                                                onChange={(e) => setLabelInput(e.target.value)} onBlur={addLabel}
                                                onKeyDown={(e) => { if (e.key === "Enter" && !e.nativeEvent.isComposing) { e.preventDefault(); addLabel() } }}
                                                className="h-6 w-24 bg-transparent text-[11px] outline-none placeholder:text-ink/40" />
                                        </span>
                                    )}
                                </div>
                            </section>
                        )}

                        <section className="border-t border-plum/10 pt-5">
                            <h3 className="mb-3 flex items-center gap-1.5 text-[13px] font-semibold tracking-tight text-ink">
                                <MessageSquare className="size-3.5 text-brand" /> Activity
                                {!!comments?.length && <span className="text-xs font-normal text-ink/60">{comments.length}</span>}
                            </h3>
                            <div className="mb-4 flex flex-col gap-4">
                                {comments?.length === 0 && <p className="text-xs text-ink/60">No comments yet. Start the conversation below.</p>}
                                {comments?.map((comment) => (
                                    <div key={comment._id} className="group flex items-start gap-2.5">
                                        <Avatar className="size-7 shrink-0 rounded-md">
                                            <AvatarImage src={comment.member?.user?.image} />
                                            <AvatarFallback className="text-[10px]">{comment.member?.user?.name?.[0] ?? "?"}</AvatarFallback>
                                        </Avatar>
                                        <div className="min-w-0 flex-1">
                                            <p className="flex items-baseline gap-2">
                                                <span className="text-xs font-semibold text-ink">{comment.member?.user?.name ?? "Former member"}</span>
                                                <span className="text-[11px] text-ink/60">{formatDistanceToNow(comment._creationTime, { addSuffix: true })}</span>
                                            </p>
                                            <p className="mt-0.5 whitespace-pre-wrap break-words text-sm leading-relaxed text-ink/80">{comment.body}</p>
                                        </div>
                                        {(comment.memberId === currentMemberId || isAdmin) && (
                                            <button aria-label="Delete comment" type="button"
                                                onClick={() => removeComment(comment._id, { onError: (e) => toast.error(e.message) })}
                                                className="rounded p-1 text-ink/45 opacity-0 transition-opacity hover:text-destructive focus-visible:opacity-100 group-hover:opacity-100 max-md:opacity-100">
                                                <X className="size-3.5" />
                                            </button>
                                        )}
                                    </div>
                                ))}
                            </div>
                            <div className="flex items-center gap-2">
                                <Input aria-label="Add a comment" placeholder="Write a comment…" value={commentBody} maxLength={2000}
                                    onChange={(e) => setCommentBody(e.target.value)}
                                    onKeyDown={(e) => { if (e.key === "Enter" && !e.nativeEvent.isComposing) handleComment() }}
                                    className="h-10 rounded-xl text-sm" />
                                <Button aria-label="Post comment" size="iconSm" onClick={handleComment} disabled={isCommenting || !commentBody.trim()}
                                    className="size-10 shrink-0 rounded-xl bg-brand text-white hover:bg-brand-hover">
                                    <Send className="size-4" />
                                </Button>
                            </div>
                        </section>
                    </div>

                    {/* Right: properties */}
                    <aside className="border-t border-plum/10 bg-cream-soft/60 px-4 py-5 md:border-l md:border-t-0">
                        <h3 className="mb-2 px-2 text-[11px] font-semibold uppercase tracking-wide text-ink/60">Details</h3>

                        <Field icon={CircleDot} label="Status">
                            <Select value={task.status} onValueChange={v => onUpdate(task._id, { status: v as Task["status"] })} disabled={!canSetStatus}>
                                <SelectTrigger aria-label="Status" className={quiet}><SelectValue /></SelectTrigger>
                                <SelectContent>{STATUSES.map(s => <SelectItem key={s} value={s} className="text-xs">{STATUS_LABELS[s]}</SelectItem>)}</SelectContent>
                            </Select>
                        </Field>

                        <Field icon={Flag} label="Priority">
                            <Select value={task.priority} onValueChange={v => isAdmin && onUpdate(task._id, { priority: v as Task["priority"] })} disabled={!isAdmin}>
                                <SelectTrigger aria-label="Priority" className={quiet}><SelectValue /></SelectTrigger>
                                <SelectContent>{PRIORITIES.map(p => <SelectItem key={p} value={p} className="text-xs">{PRIORITY_TEXT[p]}</SelectItem>)}</SelectContent>
                            </Select>
                        </Field>

                        <Field icon={User} label="Assignee">
                            {isAdmin ? (
                                <Select value={task.assigneeId ?? "unassigned"} onValueChange={v => onUpdate(task._id, { assigneeId: v === "unassigned" ? undefined : v as Id<"members"> })}>
                                    <SelectTrigger aria-label="Assignee" className={quiet}><SelectValue placeholder="Unassigned" /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="unassigned" className="text-xs">Unassigned</SelectItem>
                                        {members.map(m => <SelectItem key={m._id} value={m._id} className="text-xs">{m.user.name ?? "Unknown"}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            ) : (
                                <div className="flex flex-col gap-1">
                                    {task.assignee ? <Person name={task.assignee.user?.name} image={task.assignee.user?.image} /> : <span className="px-2 text-xs text-ink/60">Unassigned</span>}
                                    {!isAssignedToMe && (
                                        <button type="button" onClick={() => onAssignToMe(task._id)} className="flex items-center gap-0.5 px-2 text-[11px] font-medium text-orange-ink hover:text-orange-ink-hover">
                                            <UserPlus className="size-3" /> Assign to me
                                        </button>
                                    )}
                                </div>
                            )}
                        </Field>

                        <Field icon={Zap} label="Sprint">
                            {isAdmin ? (
                                <Select value={task.sprintId ?? "none"} onValueChange={v => onUpdate(task._id, { sprintId: v === "none" ? undefined : v as Id<"sprints"> })}>
                                    <SelectTrigger aria-label="Sprint" className={quiet}><SelectValue placeholder="No sprint" /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="none" className="text-xs">No sprint</SelectItem>
                                        {sprints.map(s => <SelectItem key={s._id} value={s._id} className="text-xs">{s.name}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            ) : <span className="px-2 text-xs text-ink">{activeSprint?.name ?? "No sprint"}</span>}
                        </Field>

                        <Field icon={Calendar} label="Due date">
                            {isAdmin ? (
                                <Input aria-label="Due date" type="date" key={`${task._id}:${task.dueDate ?? ""}`}
                                    defaultValue={task.dueDate ? formatDue(task.dueDate, "yyyy-MM-dd") : ""}
                                    onChange={e => onUpdate(task._id, { dueDate: e.target.value ? new Date(e.target.value).getTime() : undefined })}
                                    className={cn(quiet, "px-1.5", isOverdue && "text-red-600 dark:text-red-400")} />
                            ) : (
                                <span className={cn("px-2 text-xs", isOverdue ? "font-medium text-red-600 dark:text-red-400" : "text-ink")}>
                                    {task.dueDate ? formatDue(task.dueDate, "MMM d, yyyy") : "No due date"}
                                </span>
                            )}
                        </Field>

                        <Field icon={Star} label="Story points">
                            {isAdmin ? (
                                <Input aria-label="Story points" type="number" min={0} max={1000} key={`${task._id}:${task.storyPoints ?? ""}`} defaultValue={task.storyPoints ?? ""} placeholder="None"
                                    onBlur={e => {
                                        const n = e.target.value === "" ? undefined : Math.round(Number(e.target.value))
                                        if (n !== undefined && (!Number.isFinite(n) || n < 0 || n > 1000)) { e.target.value = String(task.storyPoints ?? ""); return toast.error("Story points must be between 0 and 1000") }
                                        if (n !== task.storyPoints) onUpdate(task._id, { storyPoints: n })
                                    }}
                                    className={quiet} />
                            ) : <span className="px-2 text-xs text-ink">{task.storyPoints ?? "None"}</span>}
                        </Field>

                        <div className="mt-3 border-t border-plum/10 pt-3">
                            <Field icon={User} label="Created by">
                                <Person name={task.creator?.user?.name} image={task.creator?.user?.image} />
                            </Field>
                            {task.updatedAt && (
                                <p className="px-2 pt-1 text-[11px] text-ink/60">Updated {formatDistanceToNow(task.updatedAt, { addSuffix: true })}</p>
                            )}
                        </div>
                        {isAdmin && (
                            <div className="mt-3 border-t border-plum/10 pt-3">
                                {confirmDelete ? (
                                    <div className="rounded-lg border border-red-200 bg-red-50 p-3 dark:border-red-500/30 dark:bg-red-500/10">
                                        <p className="text-xs font-medium text-red-700 dark:text-red-300">Delete this task and its comments?</p>
                                        <div className="mt-2 flex gap-2">
                                            <Button size="sm" variant="destructive" className="h-8 flex-1 text-xs" onClick={() => { onDelete(task._id); onClose() }}>Delete</Button>
                                            <Button size="sm" variant="outline" className="h-8 flex-1 text-xs" onClick={() => setConfirmDelete(false)}>Cancel</Button>
                                        </div>
                                    </div>
                                ) : (
                                    <button type="button" onClick={() => setConfirmDelete(true)}
                                        className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-xs font-medium text-ink/60 transition-colors hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-500/10 dark:hover:text-red-400">
                                        <Trash2 className="size-3.5" /> Delete task
                                    </button>
                                )}
                            </div>
                        )}
                    </aside>
                </div>
            </DialogContent>
        </Dialog>
    )
}
