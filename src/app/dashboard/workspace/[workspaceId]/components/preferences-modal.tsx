"use client"
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input";
import { useRemoveWorkspace } from "@/features/workspaces/api/use-delete-workspace";
import { useUpdateWorkspace } from "@/features/workspaces/api/use-update-workspace";
import { useWorkspaceId } from "@/hooks/use-workspace-id";
import { DialogClose } from "@radix-ui/react-dialog";
import { TrashIcon } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

interface PreferencesModalProps {
    open: boolean;
    setOpen: ( open: boolean ) => void;
    initialValue: string;
}

export const PreferencesModal = ({open, setOpen, initialValue}: PreferencesModalProps) => {
    const workspaceId= useWorkspaceId()
     const [value, setValue] = useState(initialValue);
     const [editOpen, setEditOpen] = useState(false)
     const router = useRouter()

     const handleRemove=()=>{
        removeWorkspace({
            id: workspaceId
        },{
            onSuccess: () => {
               toast.success("Workspace Removed")
               router.replace("/dashboard")
            },
            onError: (err) => {
                toast.error("Failed to delete workspace. Please try again.")
            }
        })
     }

     const handleEdit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        updateWorkspace({
            id: workspaceId,
            name: value
        },{
            onSuccess: () => {
               toast.success("Workspace name updated successfully")
               setEditOpen(false)
            },
            onError: (err) => {
                toast.error("Failed to update workspace name. Please try again.")
            }
        })

       
     }


     const {mutate: updateWorkspace, isPending: isUpdatingWorkspace} = useUpdateWorkspace()
     const {mutate: removeWorkspace, isPending: isRemovingWorkspace} = useRemoveWorkspace()
    return(
    <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="bg-gray-50 p-0 overflow-hidden">
            <DialogHeader className="p-4 border-b bg-white">
                <DialogTitle>
                    {value}
                </DialogTitle>
            </DialogHeader>
            <div className="px-4 pb-4 flex flex-col gap-y-2">
                <Dialog open={editOpen} onOpenChange={setEditOpen}>
                <DialogTrigger asChild>
                <div className="px-5 py-4 bg-white rounded-lg border cursor-pointer hover:bg-gray-50">
    
                <div className="flex items-center justify-between">
                <p className="text-sm font-semibold">
                    Workspace Name
                </p>

                <p className="text-sm text-[#ff5018] hover:underline hover:underline-offset-2 font-semibold cursor-pointer">
                Edit
                </p>
                </div>

                <p className="text-sm mt-2 text-muted-foreground">
                {value}
                </p>

                </div>
            
                </DialogTrigger>    
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>
                            Rename this workspace
                        </DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleEdit}>
                        <Input
                        value={value}
                        disabled={isUpdatingWorkspace}
                        onChange={(e)=>setValue(e.target.value)}
                        required
                        autoFocus
                        minLength={3}
                        max={80}
                        placeholder="Workspace name e.g. 'Work', 'Personal', 'Project X' etc."
                        />
                    </form>
                    <DialogFooter>
                    <DialogClose asChild>
                        <Button disabled={isUpdatingWorkspace} variant={"outline"}>
                            Cancel
                        </Button>
                    </DialogClose>
                    <Button disabled={isUpdatingWorkspace}>Save</Button>
                </DialogFooter>  
                </DialogContent>       
                </Dialog>
                
                <button 
                disabled={isRemovingWorkspace}
                onClick={handleRemove}
                className="flex items-center gap-x-2 px-5 py-4 bg-white rounded-lg border cursor-pointer hover:bg-gray-50 text-rose-600 "
                >
                    <TrashIcon className="size-4" />
                    <p className="text-sm font-semibold">
                    Delete Workspace
                    </p>

                </button>


            </div>
        </DialogContent>
    </Dialog>
    )
}