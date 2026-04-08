"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Loader } from "lucide-react"
import { toast } from "sonner"
import { STATUSES, STATUS_LABELS, PRIORITIES, PRIORITY_LABELS } from "@/features/tasks/constants"
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

export const CreateTaskModal = ({ open, onClose, workspaceId, members, sprints }: CreateTaskModalProps) => {
    const { mutate: createTask, isPending } = useCreateTask()
    const [title, setTitle] = useState("")
    const [description, setDescription] = useState("")
    const [status, setStatus] = useState<Status>("todo")
    const [priority, setPriority] = useState<Priority>("medium")
    const [assigneeId, setAssigneeId] = useState("")
    const [sprintId, setSprintId] = useState("")
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
            sprintId: sprintId && sprintId !== "none" ? sprintId as Id<"sprints"> : undefined,
            dueDate: dueDate ? new Date(dueDate).getTime() : undefined,
            labels: labels.length > 0 ? labels : undefined,
            storyPoints: storyPoints ? parseInt(storyPoints) : undefined,
        }, {
            onSuccess: () => {
                toast.success("Task created")
                onClose()
                setTitle(""); setDescription(""); setStatus("todo")
                setPriority("medium"); setAssigneeId(""); setDueDate("")
                setLabels([]); setStoryPoints(""); setSprintId("")
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
                    <Input placeholder="Task title *" value={title} onChange={e => setTitle(e.target.value)} />
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
                                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    {STATUSES.map(s => <SelectItem key={s} value={s}>{STATUS_LABELS[s]}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                        <div>
                            <label className="text-xs text-muted-foreground mb-1 block">Priority</label>
                            <Select value={priority} onValueChange={v => setPriority(v as Priority)}>
                                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    {PRIORITIES.map(p => <SelectItem key={p} value={p}>{PRIORITY_LABELS[p]}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                        <div>
                            <label className="text-xs text-muted-foreground mb-1 block">Assignee</label>
                            <Select value={assigneeId} onValueChange={setAssigneeId}>
                                <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Unassigned" /></SelectTrigger>
                                <SelectContent>
                                    {members.map(m => <SelectItem key={m._id} value={m._id}>{m.user.name ?? "Unknown"}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                        <div>
                            <label className="text-xs text-muted-foreground mb-1 block">Sprint</label>
                            <Select value={sprintId} onValueChange={setSprintId}>
                                <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="No sprint" /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="none">No Sprint</SelectItem>
                                    {sprints.map(s => <SelectItem key={s._id} value={s._id}>{s.name}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                        <div>
                            <label className="text-xs text-muted-foreground mb-1 block">Due Date</label>
                            <Input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} className="h-8 text-xs" />
                        </div>
                        <div>
                            <label className="text-xs text-muted-foreground mb-1 block">Story Points</label>
                            <Input type="number" placeholder="0" value={storyPoints} onChange={e => setStoryPoints(e.target.value)} className="h-8 text-xs" />
                        </div>
                        <div className="col-span-2">
                            <label className="text-xs text-muted-foreground mb-1 block">Labels (press Enter)</label>
                            <Input placeholder="Add label..." value={labelInput} onChange={e => setLabelInput(e.target.value)} onKeyDown={handleAddLabel} className="h-8 text-xs" />
                        </div>
                    </div>
                    {labels.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                            {labels.map((l, index) => (
                                <Badge key={index} variant="secondary" className="cursor-pointer text-xs"
                                    onClick={() => setLabels(prev => prev.filter((_, i) => i !== index))}>
                                    {l} ×
                                </Badge>
                            ))}
                        </div>
                    )}
                    <Button onClick={handleSubmit} disabled={isPending} className="bg-[#ff5018]/80 hover:bg-[#ff5018] text-white">
                        {isPending ? <Loader className="size-4 animate-spin" /> : "Create Task"}
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    )
}