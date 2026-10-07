"use client"

import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { useCreateChannelModal } from "../store/use-create-channel-modal"
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { useCreateChannel } from "../api/use-create-channel";
import { useWorkspaceId } from "@/hooks/use-workspace-id";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Lock } from "lucide-react";
import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Id } from "../../../../convex/_generated/dataModel";
import { errMsg } from "@/lib/errors";

export const CreateChannelModal = () => {
    const router = useRouter()
    const [isOpen, setIsOpen] = useCreateChannelModal();
    const [name, setName] = useState("")
    const workspaceId = useWorkspaceId()
    const { mutate, isPending } = useCreateChannel()
    const [isPrivate, setIsPrivate] = useState(false)
    const [picked, setPicked] = useState<Id<"members">[]>([])
    const members = useQuery(api.members.get, isOpen && isPrivate ? { workspaceId } : "skip")
    const me = useQuery(api.permissions.mine, isOpen && isPrivate ? { workspaceId } : "skip")

    const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        mutate(
            { name, workspaceId, isPrivate, memberIds: isPrivate ? picked : undefined },
            {
                onSuccess: (id) => {
                    toast.success("Channel created successfully!")
                    // use replace to update the page for same route with different param
                    router.replace(`/dashboard/workspace/${workspaceId}/channel/${id}`) 
                    handleClose()
                },
                onError: (err) => {
                    toast.error(errMsg(err, "Failed to create channel. Please try again."))
                }
            }
        )
    }

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value.replace(/\s+/g, "-").toLowerCase();
        setName(value)
    }

    const handleClose = () => {
        setName("")
        setIsPrivate(false)
        setPicked([])
        setIsOpen(false)
    }

    return (
        <Dialog open={isOpen} onOpenChange={handleClose}>
            <DialogContent className="rounded-2xl p-6">
                <DialogHeader>
                    <DialogTitle className="text-xl font-semibold tracking-tight">Add a channel</DialogTitle>
                </DialogHeader>
                <form className="space-y-5" onSubmit={handleSubmit}>
                    <Input
                        value={name}
                        disabled={isPending}
                        onChange={handleChange}
                        required
                        autoFocus
                        minLength={3}
                        maxLength={80}
                        placeholder="e.g. plan-budget"
                    />
                    <label className="flex items-start gap-3 rounded-xl border border-[#381d2a]/12 bg-[#fbf9f7] px-4 py-3 cursor-pointer">
                        <input type="checkbox" className="mt-1 size-4 accent-[#ff5018]" checked={isPrivate} onChange={(e) => setIsPrivate(e.target.checked)} disabled={isPending} />
                        <span>
                            <span className="flex items-center gap-1.5 text-sm font-semibold"><Lock className="size-3.5 text-[#ff5018]" /> Make this channel locked</span>
                            <span className="block text-xs text-[#1b1017]/55">Only people you choose (and roles allowed to see locked channels) can open it.</span>
                        </span>
                    </label>
                    {isPrivate && (
                        <div className="max-h-40 overflow-y-auto rounded-xl border border-[#381d2a]/12 divide-y">
                            {(members ?? []).filter((m) => m._id !== me?.memberId).map((m) => (
                                <label key={m._id} className="flex items-center gap-3 px-3 py-2 text-sm cursor-pointer hover:bg-[#fbf9f7]">
                                    <input type="checkbox" className="size-4 accent-[#ff5018]" checked={picked.includes(m._id)}
                                        onChange={(e) => setPicked((p) => e.target.checked ? [...p, m._id] : p.filter((id) => id !== m._id))} />
                                    <span className="truncate">{m.user.name}</span>
                                </label>
                            ))}
                            {members && members.length <= 1 && <p className="px-3 py-2 text-xs text-[#1b1017]/55">No one else is in this workspace yet.</p>}
                        </div>
                    )}
                    <div className="flex justify-end">
                        <Button disabled={isPending}>
                            Create
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    )
}