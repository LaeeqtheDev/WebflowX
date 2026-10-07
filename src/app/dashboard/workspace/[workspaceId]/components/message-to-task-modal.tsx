"use client"
import { usePermissions } from "@/hooks/use-permissions"

import { useState } from "react"
import { usePathname } from "next/navigation"
import { Loader } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useWorkspaceId } from "@/hooks/use-workspace-id"
import { useGetMembers } from "@/features/members/api/use-get-members"
import { useCurrentMember } from "@/features/members/api/use-current-member"
import { useCreateTask } from "@/features/tasks/use-create-task"
import { PRIORITIES } from "@/features/tasks/constants"
import { Priority } from "@/features/tasks/types"
import { quillToText } from "@/features/messages/lib/quill-to-text"
import { errorMessage } from "@/lib/error-message"
import { Id } from "../../../../../../convex/_generated/dataModel"

interface MessageToTaskModalProps {
    open: boolean
    onClose: () => void
    messageId: string
    body: string
    authorName: string
}

// Turns a chat message into a task, keeping a link back to the conversation.
export const MessageToTaskModal = ({ open, onClose, messageId, body, authorName }: MessageToTaskModalProps) => {
    const workspaceId = useWorkspaceId()
    const pathname = usePathname()
    const { data: members } = useGetMembers({ workspaceId })
    const { data: currentMember } = useCurrentMember({ workspaceId })
    const perms = usePermissions()
    const { mutate: createTask, isPending } = useCreateTask()

    const text = quillToText(body).trim()
    // the modal is mounted fresh each time it opens, so initial state is enough
    const firstLine = text.split("\n")[0] ?? ""
    const [title, setTitle] = useState(firstLine.length > 120 ? `${firstLine.slice(0, 117)}...` : firstLine)
    const [notes, setNotes] = useState("")
    const [priority, setPriority] = useState<Priority>("medium")
    const [assigneeId, setAssigneeId] = useState("unassigned")

    const isAdmin = perms.can("manageContent")

    const handleSubmit = () => {
        if (!title.trim()) return toast.error("Title is required")

        const link = typeof window !== "undefined" ? `${window.location.origin}${pathname}?message=${messageId}` : ""
        const description = [
            notes.trim(),
            `From a message by ${authorName}:`,
            `"${text.slice(0, 1500)}"`,
            link && `Open the conversation: ${link}`,
        ].filter(Boolean).join("\n\n")

        createTask({
            workspaceId,
            title: title.trim(),
            description,
            status: "todo",
            priority,
            assigneeId: assigneeId !== "unassigned" ? (assigneeId as Id<"members">) : undefined,
        }, {
            onSuccess: () => {
                toast.success("Task created")
                onClose()
            },
            onError: (e) => toast.error(errorMessage(e) || "Failed to create task"),
        })
    }

    return (
        <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle className="text-[17px] font-semibold tracking-tight">Create task from message</DialogTitle>
                    <DialogDescription>
                        The message text and a link back to this conversation are saved on the task.
                    </DialogDescription>
                </DialogHeader>

                <div className="flex flex-col gap-3">
                    <Input aria-label="Task title"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder="Task title"
                        className="text-sm rounded-lg focus-visible:ring-[#ff5018]/40 focus-visible:border-[#ff5018]"
                    />
                    <div className="bg-cream border border-plum/10 rounded-lg p-3 text-xs text-ink/70 max-h-24 overflow-y-auto whitespace-pre-wrap">
                        <span className="font-semibold text-ink">{authorName}: </span>
                        {text || "Attachment"}
                    </div>
                    <Textarea aria-label="Task notes"
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        placeholder="Add notes (optional)"
                        className="min-h-16 text-sm rounded-lg focus-visible:ring-[#ff5018]/40 focus-visible:border-[#ff5018]"
                    />
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="text-xs font-medium text-ink/60 mb-1 block">Priority</label>
                            <Select value={priority} onValueChange={(v) => setPriority(v as Priority)}>
                                <SelectTrigger aria-label="Priority" className="h-9 text-xs rounded-lg"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    {PRIORITIES.map((p) => (
                                        <SelectItem key={p} value={p} className="text-xs capitalize">{p}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div>
                            <label className="text-xs font-medium text-ink/60 mb-1 block">Assignee</label>
                            <Select value={assigneeId} onValueChange={setAssigneeId}>
                                <SelectTrigger aria-label="Assignee" className="h-9 text-xs rounded-lg"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="unassigned" className="text-xs">Unassigned</SelectItem>
                                    {(members ?? [])
                                        .filter((m) => isAdmin || m._id === currentMember?._id)
                                        .map((m) => (
                                            <SelectItem key={m._id} value={m._id} className="text-xs">
                                                {m.user.name ?? "Member"}{m._id === currentMember?._id ? " (me)" : ""}
                                            </SelectItem>
                                        ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    <Button
                        onClick={handleSubmit}
                        disabled={isPending}
                        className="bg-[#ff5018] hover:bg-[#e6430f] text-white text-sm rounded-lg font-semibold"
                    >
                        {isPending ? <Loader className="size-4 animate-spin" /> : "Create task"}
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    )
}
