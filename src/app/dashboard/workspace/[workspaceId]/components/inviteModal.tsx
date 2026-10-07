import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useWorkspaceId } from "@/hooks/use-workspace-id";
import { CopyIcon, RefreshCcw } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "../../../../../../convex/_generated/api";
import { useNewJoinCodde } from "@/features/workspaces/api/use-new-join-code";
import { DialogClose } from "@radix-ui/react-dialog";
import { useConfirm } from "../../hooks/use-confirm";
import { errorMessage } from "@/lib/error-message";

interface InviteModalProps {
    open: boolean;
    setOpen: (open: boolean) => void;
    name: string;
    joinCode: string;
    joinCodeExpiresAt?: number;
    invitesDisabled?: boolean;
    isAdmin?: boolean;
}

const EXPIRY_OPTIONS = [
    { value: "never", label: "Never expires" },
    { value: "1", label: "Expires in 1 day" },
    { value: "7", label: "Expires in 7 days" },
    { value: "30", label: "Expires in 30 days" },
]

export const InviteModal = ({
    open,
    setOpen,
    name,
    joinCode,
    joinCodeExpiresAt,
    invitesDisabled,
    isAdmin = true,
}: InviteModalProps) => {
    const workspaceId = useWorkspaceId();
    const { mutate, isPending } = useNewJoinCodde()
    const setInvitesDisabled = useMutation(api.workspaces.setInvitesDisabled)
    const [expiry, setExpiry] = useState("never")
    const [toggling, setToggling] = useState(false)
    const [ConfirmDialog, confirm] = useConfirm(
        "Generate a new code?",
        "The current code and invite link will stop working right away."
    )

    const expired = !!joinCodeExpiresAt && joinCodeExpiresAt < Date.now()
    const inviteLink = `${typeof window !== "undefined" ? window.location.origin : ""}/join/${workspaceId}?code=${joinCode}`

    const handleCopyLink = () => {
        navigator.clipboard.writeText(inviteLink)
            .then(() => toast.success("Invite link copied. It already includes the code."))
            .catch(() => toast.error("Couldn't copy. Select the link and copy it manually."))
    }

    const handleCopyCode = () => {
        navigator.clipboard.writeText(joinCode)
            .then(() => toast.success("Code copied"))
            .catch(() => toast.error("Couldn't copy the code"))
    }

    const handleNewCode = async () => {
        const ok = await confirm();
        if (!ok) return;

        mutate({ workspaceId, expiresInDays: expiry === "never" ? undefined : Number(expiry) }, {
            onSuccess: () => {
                toast.success("New invite code generated")
            },
            onError: (e) => {
                toast.error(errorMessage(e) || "Failed to generate new join code.")
            }
        })
    }

    const handleToggleInvites = async () => {
        setToggling(true)
        try {
            await setInvitesDisabled({ workspaceId, disabled: !invitesDisabled })
            toast.success(invitesDisabled ? "Invites turned on" : "Invites turned off")
        } catch (e) {
            toast.error(errorMessage(e) || "Couldn't change invite settings")
        } finally {
            setToggling(false)
        }
    }

    const statusText = invitesDisabled
        ? "Invites are turned off. Nobody can join with the code."
        : expired
            ? "This code has expired. Generate a new one."
            : joinCodeExpiresAt
                ? `Valid until ${format(joinCodeExpiresAt, "MMM d, yyyy h:mm a")}`
                : "This code doesn't expire."

    return (
        <>
            <ConfirmDialog />
            <Dialog open={open} onOpenChange={setOpen}>
                <DialogContent className="rounded-2xl p-6">
                    <DialogHeader>
                        <DialogTitle className="font-semibold tracking-tight">
                            Invite people to{" "}
                            <span className="font-semibold text-orange-ink">
                                {name}
                            </span>
                        </DialogTitle>
                        <DialogDescription>
                            Share the link, or give people the code to enter themselves.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="flex flex-col gap-y-3 items-center justify-center py-6 my-1 rounded-xl bg-cream border border-plum/10">
                        <p className={`text-4xl font-semibold tracking-widest uppercase ${invitesDisabled || expired ? "text-ink/30 line-through" : "text-ink"}`}>
                            {joinCode}
                        </p>
                        <p className={`text-xs ${invitesDisabled || expired ? "text-red-600 dark:text-red-400" : "text-ink/60"}`}>{statusText}</p>
                        <div className="flex items-center gap-1">
                            <Button variant={"ghost"} size={"sm"} onClick={handleCopyLink}>
                                Copy link
                                <CopyIcon className="size-4 ml-2" />
                            </Button>
                            <Button variant={"ghost"} size={"sm"} onClick={handleCopyCode}>
                                Copy code
                            </Button>
                        </div>
                    </div>

                    {isAdmin && (
                        <div className="flex flex-col gap-3">
                            <div className="flex items-center gap-2">
                                <Select value={expiry} onValueChange={setExpiry}>
                                    <SelectTrigger aria-label="Invite expiry" className="h-9 text-xs rounded-lg flex-1">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {EXPIRY_OPTIONS.map(o => (
                                            <SelectItem key={o.value} value={o.value} className="text-xs">{o.label}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <Button disabled={isPending} variant={"outline"} onClick={handleNewCode} className="h-9">
                                    New code
                                    <RefreshCcw className="size-4 ml-2" />
                                </Button>
                            </div>
                            <button
                                onClick={handleToggleInvites}
                                disabled={toggling}
                                className="text-xs font-medium text-left text-ink/70 hover:text-orange-ink-hover transition-colors disabled:opacity-50"
                            >
                                {invitesDisabled ? "Turn invites back on" : "Turn off invites (revoke access for new people)"}
                            </button>
                        </div>
                    )}

                    <div className="flex justify-end w-full">
                        <DialogClose asChild>
                            <Button>Close</Button>
                        </DialogClose>
                    </div>
                </DialogContent>
            </Dialog>
        </>
    )
}
