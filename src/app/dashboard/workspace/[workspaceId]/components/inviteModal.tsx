import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { useWorkspaceId } from "@/hooks/use-workspace-id";
import { CopyIcon, RefreshCcw } from "lucide-react";
import { toast } from "sonner";
import { useNewJoinCodde } from "@/features/workspaces/api/use-new-join-code";
import { DialogClose } from "@radix-ui/react-dialog";
import { useConfirm } from "../../hooks/use-confirm";

interface InviteModalProps {
    open: boolean;
    setOpen: (open: boolean) => void;
    name: string;
    joinCode: string;
}

export const InviteModal = ({ open, setOpen, name, joinCode }: InviteModalProps) => {
    const workspaceId = useWorkspaceId();
    const { mutate, isPending } = useNewJoinCodde()
    const [ConfirmDialog, confirm] = useConfirm(
        "Are you sure?",
        "Generating a new join code will invalidate the current one."
    )

    const handleCopy = () => {
        console.log("workspaceId:", workspaceId)
        console.log("joinCode:", joinCode)
        const inviteLink = `${window.location.origin}/join/${workspaceId}`;
        navigator.clipboard.writeText(inviteLink)
            .then(() => toast.success("Invite link copied to clipboard!"))
    }

    const handleNewCode = async () => {
        const ok = await confirm();
        if (!ok) return;

        mutate({ workspaceId }, {
            onSuccess: () => {
                toast.success("New join code generated!")
            },
            onError: () => {
                toast.error("Failed to generate new join code.")
            }
        })
    }

    return (
        <>
            <ConfirmDialog />
            <Dialog open={open} onOpenChange={setOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>
                            Invite People{" "}
                            <span className="font-semibold text-[#ff5018] underline underline-offset-4">
                                {name}
                            </span>
                        </DialogTitle>
                        <DialogDescription>
                            Use the code below to invite people to your Workspace
                        </DialogDescription>
                    </DialogHeader>
                    <div className="flex flex-col gap-y-4 items-center justify-center py-10">
                        <p className="text-4xl font-bold tracking-widest uppercase">
                            {joinCode}
                        </p>
                        <Button variant={"ghost"} size={"sm"} onClick={handleCopy}>
                            Copy Link
                            <CopyIcon className="size-4 ml-2" />
                        </Button>
                    </div>
                    <div className="flex items-center justify-between w-full">
                        <Button disabled={isPending} variant={"outline"} onClick={handleNewCode}>
                            New Code
                            <RefreshCcw className="size-4 ml-2" />
                        </Button>
                        <DialogClose asChild>
                            <Button>Close</Button>
                        </DialogClose>
                    </div>
                </DialogContent>
            </Dialog>
        </>
    )
}