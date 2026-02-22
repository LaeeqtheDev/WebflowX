import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"

import { useCreateChannelModal } from "../store/use-create-channel-modal"
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { useCreateChannel } from "../api/use-create-channel";
import { useWorkspaceId } from "@/hooks/use-workspace-id";

export const CreateChannelModal = () => {
    const [isOpen, setIsOpen] = useCreateChannelModal();
    const [name, setName] = useState("")
    const workspaceId = useWorkspaceId()
    const {mutate, isPending} = useCreateChannel()

    const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        mutate({name, workspaceId},
            {
                onSuccess: (id) => {
                    handleClose()
                }
            })
    }



    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value.replace(/\s+/g,"-").toLowerCase();
        setName(value)
    }

    const handleClose = () => {
        setName("")
        setIsOpen(false)
    }

    return(
        <Dialog open={isOpen} onOpenChange={handleClose}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Add a channel</DialogTitle>
                </DialogHeader>
                <form className="space-y-4" onSubmit={handleSubmit}>
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
                    <div className="flex justify-end">
                        <Button disabled={false}>
                            Create
                        </Button>
                    </div>
                </form>
            </DialogContent>


        </Dialog>
    )
}