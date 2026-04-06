import { Button } from "@/components/ui/button"
import { Id } from "../../../../convex/_generated/dataModel"
import { useGetMember } from "../api/use-get-member"
import { AlertTriangle, ChevronDown, Loader, MailIcon, XIcon } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Separator } from "@/components/ui/separator"
import Link from "next/link"
import { useUpdateMember } from "../api/use-update-member"
import { useRemoveMember } from "../api/use-remove-member"
import { useCurrentMember } from "../api/use-current-member"
import { useWorkspaceId } from "@/hooks/use-workspace-id"
import { toast } from "sonner"
import { useConfirm } from "@/app/dashboard/workspace/hooks/use-confirm"
import { useRouter } from "next/navigation"
import {
        DropdownMenu,
        DropdownMenuContent,
        DropdownMenuItem,
        DropdownMenuRadioGroup,
        DropdownMenuTrigger
} from "@/components/ui/dropdown-menu"

interface ProfileProps {
    memberId: Id<"members">
    onClose: () => void
}

export const Profile = ({ memberId, onClose }: ProfileProps) => {
    const router = useRouter()
    const workspaceId = useWorkspaceId()

    const [LeaveDialog, confirmLeave] = useConfirm(
        "Leave Workspace",
        "Are you sure you want to leave this workspace? You will lose access to all of its projects and resources.",
    )

    const [RemoveDialog, confirmRemove] = useConfirm(
        "Remove Member",
        "Are you sure you want to remove this member? They will lose access to all of the workspace's projects and resources.",
    )

        const [UpdateDialog, confirmUpdate] = useConfirm(
        "Change Role",
        "Are you sure you want to change this member's role?",
    )

    const { data: currentMember, isLoading: isLoadingCurrentMember } = useCurrentMember({ workspaceId })
    const { data: member, isLoading: isLoadingMember } = useGetMember({ id: memberId })
    const { mutate: updateMember, isPending: isUpdatingMember } = useUpdateMember()
    const { mutate: removeMember, isPending: isRemovingMember } = useRemoveMember()

    const onRemove =async() => {
        const ok = await confirmRemove()
        if (!ok) return
        removeMember({ id: memberId }, {
            onSuccess: () => {
                toast.success("Member removed")
                onClose()
            },
            onError: () => {
                toast.error("Failed to remove member")
            }
        })
    }

    const onLeave = async() => {
        const ok = await confirmLeave()
        if (!ok) return
        removeMember({ id: memberId }, {
            onSuccess: () => {
                router.replace("/")
                toast.success("You left the workspace")
                onClose()
            },
            onError: () => {
                toast.error("Failed to leave workspace")
            }
        })
    }

    const onUpdate =async(role: "admin" | "member") => {
        const ok = await confirmUpdate()
        if (!ok) return
        updateMember({ id: memberId, role }, {
            onSuccess: () => {
                toast.success("Role updated")
                onClose()
            },
            onError: () => {
                toast.error("Failed to update role")
            }
        })
    }

    if (isLoadingMember || isLoadingCurrentMember) {
        return (
            <div className="h-full flex flex-col">
                <div className="h-12.25 flex justify-between items-center px-4 border-b">
                    <p className="text-lg font-bold">Profile</p>
                    <Button onClick={onClose} size={"iconSm"} variant={"ghost"}>
                        <XIcon className="size-5 stroke-[1.5]" />
                    </Button>
                </div>
                <div className="flex flex-col gap-y-2 h-full items-center justify-center">
                    <Loader className="size-5 animate-spin text-[#ff5018]" />
                </div>
            </div>
        )
    }

    if (!member) {
        return (
            <div className="h-full flex flex-col">
                <div className="h-12.25 flex justify-between items-center px-4 border-b">
                    <p className="text-lg font-bold">Profile</p>
                    <Button onClick={onClose} size={"iconSm"} variant={"ghost"}>
                        <XIcon className="size-5 stroke-[1.5]" />
                    </Button>
                </div>
                <div className="flex flex-col gap-y-2 h-full items-center justify-center">
                    <AlertTriangle className="size-5 text-[#ff5018]" />
                    <p className="text-sm text-muted-foreground">Member not found</p>
                </div>
            </div>
        )
    }

    const avatarFallback = member.user.name?.[0] ?? "M"

    return (
      <>
      <RemoveDialog/>
      <LeaveDialog/>
      <UpdateDialog/>
        <div className="h-full flex flex-col overflow-y-auto">
            <div className="h-12.25 flex justify-between items-center px-4 border-b">
                <p className="text-lg font-bold">Profile</p>
                <Button onClick={onClose} size={"iconSm"} variant={"ghost"}>
                    <XIcon className="size-5 stroke-[1.5]" />
                </Button>
            </div>

            <div className="flex flex-col items-center justify-center p-4">
                <Avatar className="w-40 h-40">
                    <AvatarImage src={member.user.image} />
                    <AvatarFallback className="aspect-square text-6xl">
                        {avatarFallback}
                    </AvatarFallback>
                </Avatar>
            </div>

            <div className="flex flex-col p-4">
                <p className="text-xl font-bold">{member.user.name}</p>

                {/* Admin viewing someone else → show role change + remove */}
                {currentMember?.role === "admin" && currentMember?._id !== memberId && (
                    <div className="flex flex-col gap-2 mt-2">
                       <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                            <Button variant={"outline"} className="w-full capitalize">
                            {member.role} <ChevronDown className="size-4 ml-2 text-[#ff5018]" />
                        </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuRadioGroup value={member.role}
                            onValueChange={(role) => onUpdate(role as "admin" | "member")}
                            >
                                <DropdownMenuItem defaultValue={"admin"} >
                                    Admin
                                </DropdownMenuItem>

                                <DropdownMenuItem defaultValue={"member"} >
                                    Member
                                </DropdownMenuItem>

                            </DropdownMenuRadioGroup>
                       </DropdownMenu>
                        <Button onClick={onRemove} variant={"outline"} className="w-full capitalize">
                            Remove
                        </Button>
                    </div>
                )}

                {/* Non-admin viewing their own profile → show leave */}
                {currentMember?._id === memberId && currentMember?.role !== "admin" && (
                    <div className="mt-2">
                        <Button onClick={onLeave} variant={"outline"} className="w-full">
                            Leave
                        </Button>
                    </div>
                )}
            </div>

            <Separator />

            <div className="flex flex-col p-4">
                <p className="text-sm font-bold mb-4">Contact Information</p>
                <div className="flex items-center gap-2">
                    <div className="size-9 rounded-md bg-muted flex items-center justify-center">
                        <MailIcon className="size-4 text-[#ff5018]" />
                    </div>
                    <div className="flex flex-col">
                        <p className="text-[13px] font-semibold text-muted-foreground">
                            Email Address
                        </p>
                        <Link
                            href={`mailto:${member.user.email}`}
                            className="text-sm text-[#ff5018] hover:underline"
                        >
                            {member.user.email}
                        </Link>
                    </div>
                </div>
            </div>
        </div>
      </>
    )
}