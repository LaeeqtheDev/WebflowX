"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Loader, X } from "lucide-react"
import { toast } from "sonner"
import { errorMessage } from "@/lib/error-message"
import { STATUSES, STATUS_LABELS, PRIORITIES } from "@/features/tasks/constants"
import { PRIORITY_TEXT } from "./task-styles"
import { Member, Sprint, Status, Priority } from "@/features/tasks/types"
import { useCreateTask } from "@/features/tasks/use-create-task"
import { Id } from "../../../../../../../convex/_generated/dataModel"


interface CreateTaskModalProps {
    open: boolean
    onClose: () => void
    workspaceId: Id<"workspaces">
    members: Member[]
    sprints: Sprint[]
}

const Label = ({ children, htmlFor }: { children: React.ReactNode; htmlFor?: string }) => (
    <label htmlFor={htmlFor} className="mb-1 block text-xs font-medium text-ink/60">{children}</label>
)

export const CreateTaskModal = ({ open, onClose, workspaceId, members, sprints }: CreateTaskModalProps) => {
    const { mutate: createTask, isPending } = useCreateTask()
    const [title, setTitle] = useState("")
    const [description, setDescription] = useState("")
    const [status, setStatus] = useState<Status>("todo")
    const [priority, setPriority] = useState<Priority>("medium")
    const [assigneeId, setAssigneeId] = useState("unassigned")
    const [sprintId, setSprintId] = useState("none")
    const [dueDate, setDueDate] = useState("")
    const [labelInput, setLabelInput] = useState("")
    const [labels, setLabels] = useState<string[]>([])
    const [storyPoints, setStoryPoints] = useState("")

    const addLabel = () => {
        const l = labelInput.trim().slice(0, 30)
        setLabelInput("")
        if (!l || labels.some((x) => x.toLowerCase() === l.toLowerCase())) return
        if (labels.length >= 10) return toast.error("A task can have up to 10 labels")
        setLabels((prev) => [...prev, l])
    }

    const handleSubmit = () => {
        const t = title.trim()
        if (!t) return toast.error("Give the task a title")
        const points = storyPoints === "" ? undefined : Math.round(Number(storyPoints))
        if (points !== undefined && (!Number.isFinite(points) || points < 0 || points > 1000)) return toast.error("Story points must be between 0 and 1000")
        createTask({
            workspaceId,
            title: t,
            description: description.trim() || undefined,
            status,
            priority,
            assigneeId: assigneeId !== "unassigned" ? assigneeId as Id<"members"> : undefined,
            sprintId: sprintId !== "none" ? sprintId as Id<"sprints"> : undefined,
            dueDate: dueDate ? new Date(dueDate).getTime() : undefined,
            labels: labels.length > 0 ? labels : undefined,
            storyPoints: points,
        }, {
            onSuccess: () => {
                toast.success("Task created")
                onClose()
                setTitle(""); setDescription(""); setStatus("todo")
                setPriority("medium"); setAssigneeId("unassigned"); setDueDate("")
                setLabels([]); setStoryPoints(""); setSprintId("none"); setLabelInput("")
            },
            onError: (e) => toast.error(errorMessage(e))
        })
    }

    return (
        <Dialog open={open} onOpenChange={(o) => { if (!o) onClose() }}>
            <DialogContent className="max-h-[92dvh] max-w-xl gap-0 overflow-y-auto rounded-2xl border-plum/12 p-0 sm:max-w-xl"
                onKeyDown={(e) => { if ((e.metaKey || e.ctrlKey) && e.key === "Enter") handleSubmit() }}>
                <DialogHeader className="border-b border-plum/10 px-6 pb-4 pt-5 pr-14 text-left">
                    <DialogTitle className="text-[17px] font-semibold tracking-tight">New task</DialogTitle>
                    <DialogDescription className="text-xs">Press Ctrl or ⌘ + Enter to create it quickly.</DialogDescription>
                </DialogHeader>

                <div className="flex flex-col gap-4 px-6 py-5">
                    <div>
                        <Label htmlFor="new-task-title">Title</Label>
                        <Input id="new-task-title" autoFocus placeholder="What needs to be done?" value={title} maxLength={200}
                            onChange={e => setTitle(e.target.value)}
                            onKeyDown={(e) => { if (e.key === "Enter" && !e.nativeEvent.isComposing) { e.preventDefault(); handleSubmit() } }}
                            className="h-11 rounded-xl text-base font-medium" />
                    </div>
                    <div>
                        <Label htmlFor="new-task-desc">Description</Label>
                        <textarea id="new-task-desc" placeholder="Add context, links or acceptance criteria (optional)" value={description} maxLength={5000}
                            onChange={e => setDescription(e.target.value)}
                            className="h-24 w-full resize-y rounded-xl border border-input bg-transparent px-3 py-2 text-sm outline-none transition-colors placeholder:text-ink/40 focus:border-[#ff5018] focus:ring-2 focus:ring-[#ff5018]/20" />
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2">
                        <div>
                            <Label>Status</Label>
                            <Select value={status} onValueChange={v => setStatus(v as Status)}>
                                <SelectTrigger aria-label="Status" className="h-9 w-full text-sm"><SelectValue /></SelectTrigger>
                                <SelectContent>{STATUSES.map(s => <SelectItem key={s} value={s}>{STATUS_LABELS[s]}</SelectItem>)}</SelectContent>
                            </Select>
                        </div>
                        <div>
                            <Label>Priority</Label>
                            <Select value={priority} onValueChange={v => setPriority(v as Priority)}>
                                <SelectTrigger aria-label="Priority" className="h-9 w-full text-sm"><SelectValue /></SelectTrigger>
                                <SelectContent>{PRIORITIES.map(p => <SelectItem key={p} value={p}>{PRIORITY_TEXT[p]}</SelectItem>)}</SelectContent>
                            </Select>
                        </div>
                        <div>
                            <Label>Assignee</Label>
                            <Select value={assigneeId} onValueChange={setAssigneeId}>
                                <SelectTrigger aria-label="Assignee" className="h-9 w-full text-sm"><SelectValue placeholder="Unassigned" /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="unassigned">Unassigned</SelectItem>
                                    {members.map(m => <SelectItem key={m._id} value={m._id}>{m.user.name ?? "Unknown"}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                        <div>
                            <Label>Sprint</Label>
                            <Select value={sprintId} onValueChange={setSprintId}>
                                <SelectTrigger aria-label="Sprint" className="h-9 w-full text-sm"><SelectValue placeholder="No sprint" /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="none">No sprint</SelectItem>
                                    {sprints.map(s => <SelectItem key={s._id} value={s._id}>{s.name}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                        <div>
                            <Label htmlFor="new-task-due">Due date</Label>
                            <Input id="new-task-due" type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} className="h-9 text-sm" />
                        </div>
                        <div>
                            <Label htmlFor="new-task-points">Story points</Label>
                            <Input id="new-task-points" type="number" min={0} max={1000} placeholder="None" value={storyPoints} onChange={e => setStoryPoints(e.target.value)} className="h-9 text-sm" />
                        </div>
                    </div>

                    <div>
                        <Label htmlFor="new-task-label">Labels</Label>
                        <div className="flex flex-wrap items-center gap-1.5 rounded-xl border border-input px-2.5 py-1.5 focus-within:border-[#ff5018] focus-within:ring-2 focus-within:ring-[#ff5018]/20">
                            {labels.map((l) => (
                                <span key={l} className="inline-flex items-center gap-1 rounded-md bg-cream px-2 py-0.5 text-[11px] font-medium text-plum">
                                    {l}
                                    <button type="button" aria-label={`Remove label ${l}`} onClick={() => setLabels((prev) => prev.filter((x) => x !== l))} className="rounded hover:text-destructive"><X className="size-3" /></button>
                                </span>
                            ))}
                            <input id="new-task-label" value={labelInput} maxLength={30} placeholder={labels.length ? "" : "Type a label and press Enter"}
                                onChange={e => setLabelInput(e.target.value)} onBlur={addLabel}
                                onKeyDown={(e) => { if (e.key === "Enter" && !e.nativeEvent.isComposing) { e.preventDefault(); e.stopPropagation(); addLabel() } }}
                                className="h-6 min-w-[8rem] flex-1 bg-transparent text-sm outline-none placeholder:text-ink/40" />
                        </div>
                    </div>
                </div>

                <DialogFooter className="border-t border-plum/10 bg-cream-soft/50 px-6 py-3 sm:justify-end">
                    <Button type="button" variant="outline" onClick={onClose} className="rounded-lg">Cancel</Button>
                    <Button onClick={handleSubmit} disabled={isPending} className="rounded-lg bg-[#ff5018] font-semibold text-white hover:bg-[#e6430f]">
                        {isPending ? <Loader className="size-4 animate-spin" /> : "Create task"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
