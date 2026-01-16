"use client"
import {Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle} from '@/components/ui/dialog'
import { useCreateWorkspaceModal } from '../store/use-create-workspace-modal'


export const CreateWorkspaceModal = ()=> {
    const [open, setOpen]= useCreateWorkspaceModal();

    const handleClose =() =>{
        setOpen(false);
    }

    return(
        <Dialog open={open} onOpenChange={handleClose}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Create your workspace</DialogTitle>
                </DialogHeader>
            </DialogContent>
        </Dialog>
    )
}