"use client"
import { Button } from "@/components/ui/button";
import { FaChevronDown } from "react-icons/fa";

import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger
}
from "@/components/ui/dialog"
import { TrashIcon } from "lucide-react";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { DialogClose } from "@radix-ui/react-dialog";
import { useUpdateChannel } from "@/features/channels/api/use-update-channel";
import { useChannelId } from "@/hooks/use-channel-id";
import { toast } from "sonner";
import { useRemoveChannel } from "@/features/channels/api/use-remove-channel";
import { useConfirm } from "../../hooks/use-confirm";
import { useRouter } from "next/navigation";
import { useWorkspaceId } from "@/hooks/use-workspace-id";
import { useCurrentMember } from "@/features/members/api/use-current-member";


interface HeaderProps {
    title: string;
}

export const Header = ({title}: HeaderProps) => {
    const router = useRouter()
    const workspaceId = useWorkspaceId()
    const [value, setValue] = useState(title);
    const [editOpen, setEditOpen] = useState(false);
    const channelId = useChannelId();
    const [ConfirmDialog, confirm] = useConfirm(
        "Are you sure you want to delete this channel?",
        "This will permanently delete the channel and all its messages.This action can't be undone."
    )

    const {mutate: updateChannel, isPending: updatingChannel} = useUpdateChannel()
    const {mutate: removeChannel, isPending: deletingChannel} = useRemoveChannel()
    const {data: member} = useCurrentMember({workspaceId})

    const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        updateChannel({id: channelId, name: value}, {
            onSuccess: () => {
                toast.success("Channel updated successfully")
                setEditOpen(false)
            },
            onError: () => {
                toast.error("Failed to update channel")
            }
        })   
    }

    const handleDelete = async () => {
        const ok = await confirm();
        if(!ok) return;

        removeChannel({id: channelId}, {
            onSuccess: () => {
                toast.success("Channel deleted successfully")
                router.push(`/dashboard/workspace/${workspaceId}`)
            },
            onError: () => {
                toast.error("Failed to delete channel")
            }
        })

    }

    const handleEditOpen = (value: boolean) => {
        
        if(member?.role !== "admin") return;

        setEditOpen(value)
    }

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value.replace(/\s+/g, "-").toLowerCase();
        setValue(value)
    }


    return(
        <div className="bg-white border-b h-12.25 flex items-center px-4 overflow-hidden">
            <ConfirmDialog/>
        
            <Dialog>
                <DialogTrigger asChild>
                <Button 
            variant={"ghost"}
            className="text-lg font-semibold px-2 overflow-hidden w-auto"
            size={"sm"}
            >
                <span className="truncate">#{title}</span>
                <FaChevronDown className="text-[#ff5018] size-2.5 ml-2"/>
            </Button>

                </DialogTrigger>

                <DialogContent className="p-0 bg-gray-50 overflow-hidden">
                    <DialogHeader className="p-4 border-b bg-white">
                        <DialogTitle>
                            #{title}
                        </DialogTitle>

                    </DialogHeader>

                    <div className="px-4 pb-4 flex flex-col gap-y-2">
                        <Dialog open={editOpen} onOpenChange={handleEditOpen}>
                            <DialogTrigger asChild>
                            <div className="px-5 py-4 bg-white rounded-lg border cursor-pointer hover:bg-gray-50">
                            <div className="flex items-center justify-between">
                                <p className="text-sm font-semibold">Channel Name</p>
                              {   member?.role === "admin" && (
                                  <p className="text-sm text-[#ff5018] hover:underline hover:underline-offset-4 font-semibold">Edit</p>
                              )}
                            </div>
                            <p className="text-sm">#{title}</p>
                        </div> 
                            </DialogTrigger>
                            <DialogContent>
                                <DialogHeader>
                                    <DialogTitle>Rename this channel</DialogTitle>
                                </DialogHeader>
                                <form onSubmit={handleSubmit} className="space-y-4">
                                    <Input
                                    value={value}
                                    disabled={updatingChannel}
                                    onChange={handleChange}
                                    required
                                    autoFocus
                                    minLength={3}
                                    maxLength={80}
                                    placeholder="e.g. general, marketing, etc."
                                    />
                                        <DialogFooter>
                                            <DialogClose asChild>
                                                <Button variant={"outline"} disabled={updatingChannel}>
                                                    Cancel
                                                </Button>
                                            </DialogClose>
                                            <Button disabled={updatingChannel}>
                                                Save
                                            </Button>

                                        </DialogFooter>
                        

                                </form>

                            </DialogContent>
                        </Dialog>
                        {member?.role === "admin" && (
                                                    <button className="flex items-center gap-x-2 px-5 py-4 bg-white rounded-lg cursor-pointer border hover:bg-gray-50 text-rose-600"
                                                    onClick={handleDelete}
                                                    >
                                                        <TrashIcon className="size-4"/>
                                                        <p className="text-sm font-semibold">Delete Channel</p>
                            
                                                    </button>
                        )}

                    </div>

                </DialogContent>
            </Dialog>
        </div>
    )
}