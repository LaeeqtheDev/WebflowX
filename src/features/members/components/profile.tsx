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
import { useMutation, useQuery } from "convex/react"
import { api } from "../../../../convex/_generated/api"
import { usePermissions } from "@/hooks/use-permissions"
import { errMsg } from "@/lib/errors"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuRadioGroup,
    DropdownMenuRadioItem,
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

    const [TransferDialog, confirmTransfer] = useConfirm(
        "Transfer ownership",
        "This member becomes the workspace owner with full control, and you become an admin. Only they can undo it.",
    )
    const transferOwnership = useMutation(api.workspaces.transferOwnership)
    const perms = usePermissions()
    const rolePerms = useQuery(api.permissions.rolePermissions, perms.isAdmin ? { workspaceId } : "skip")
    const setCustomRole = useMutation(api.members.setCustomRole)
    const { data: currentMember, isLoading: isLoadingCurrentMember } = useCurrentMember({ workspaceId })
    const { data: member, isLoading: isLoadingMember } = useGetMember({ id: memberId })
    const { mutate: updateMember, isPending: isUpdatingMember } = useUpdateMember()
    const { mutate: removeMember, isPending: isRemovingMember } = useRemoveMember()

    const onRemove = async () => {
        const ok = await confirmRemove()
        if (!ok) return
        removeMember({ id: memberId }, {
            onSuccess: () => {
                toast.success("Member removed")
                onClose()
            },
            onError: (e) => {
                toast.error(errMsg(e, "Failed to remove member"))
            }
        })
    }

    const onLeave = async () => {
        const ok = await confirmLeave()
        if (!ok) return
        removeMember({ id: memberId }, {
            onSuccess: () => {
                router.replace("/")
                toast.success("You left the workspace")
                onClose()
            },
            onError: (e) => {
                toast.error(errMsg(e, "Failed to leave workspace"))
            }
        })
    }

    const onTransfer = async () => {
        const ok = await confirmTransfer()
        if (!ok) return
        try {
            await transferOwnership({ workspaceId, memberId })
            toast.success("Ownership transferred")
            onClose()
        } catch (e) {
            toast.error(errMsg(e, "Couldn't transfer ownership"))
        }
    }

    const onUpdate = async (role: "admin" | "moderator" | "member") => {
        const ok = await confirmUpdate()
        if (!ok) return
        updateMember({ id: memberId, role }, {
            onSuccess: () => {
                toast.success("Role updated")
                onClose()
            },
            onError: (e) => {
                toast.error(errMsg(e, "Failed to update role"))
            }
        })
    }

    if (isLoadingMember || isLoadingCurrentMember) {
        return (
            <div className="h-full flex flex-col bg-surface">
                <div className="h-14 flex justify-between items-center px-4 border-b border-plum/12 bg-surface">
                    <p className="text-lg font-semibold tracking-tight text-ink">Profile</p>
                    <Button onClick={onClose} size={"iconSm"} variant={"ghost"} aria-label="Close profile" className="rounded-lg hover:bg-cream max-md:h-10 max-md:w-auto max-md:gap-1 max-md:px-3">
                        <XIcon className="size-5 stroke-[1.5]" />
                        <span className="text-sm font-medium md:hidden">Close</span>
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
            <div className="h-full flex flex-col bg-surface">
                <div className="h-14 flex justify-between items-center px-4 border-b border-plum/12 bg-surface">
                    <p className="text-lg font-semibold tracking-tight text-ink">Profile</p>
                    <Button onClick={onClose} size={"iconSm"} variant={"ghost"} aria-label="Close profile" className="rounded-lg hover:bg-cream max-md:h-10 max-md:w-auto max-md:gap-1 max-md:px-3">
                        <XIcon className="size-5 stroke-[1.5]" />
                        <span className="text-sm font-medium md:hidden">Close</span>
                    </Button>
                </div>
                <div className="flex flex-col gap-y-2 h-full items-center justify-center">
                    <AlertTriangle className="size-5 text-[#ff5018]" />
                    <p className="text-sm text-ink/60">Member not found</p>
                </div>
            </div>
        )
    }

    const avatarFallback = member.user.name?.[0] ?? "M"
    const isSelf = currentMember?._id === memberId
    const isTargetOwner = member.isOwner
    const targetIsAdmin = member.role === "admin"
    const customRoles = rolePerms?.customRoles ?? []
    const customRoleName = customRoles.find((r) => r.id === member.customRoleId)?.name
    // admins/owner manage roles; only the owner touches admins. Removal needs the manageMembers permission.
    const canChangeRole = perms.isAdmin && (perms.isOwner || !targetIsAdmin)
    const canRemove = perms.can("manageMembers") && (perms.isOwner || !targetIsAdmin) && (perms.role !== "moderator" || member.role === "member")

    return (
        <>
            <RemoveDialog />
            <LeaveDialog />
            <UpdateDialog />
            <TransferDialog />
            <div className="h-full flex flex-col overflow-y-auto bg-surface">
                <div className="h-14 flex justify-between items-center px-4 border-b border-plum/12 bg-surface">
                    <p className="text-lg font-semibold tracking-tight text-ink">Profile</p>
                    <Button onClick={onClose} size={"iconSm"} variant={"ghost"} aria-label="Close profile" className="rounded-lg hover:bg-cream max-md:h-10 max-md:w-auto max-md:gap-1 max-md:px-3">
                        <XIcon className="size-5 stroke-[1.5]" />
                        <span className="text-sm font-medium md:hidden">Close</span>
                    </Button>
                </div>

                <div className="flex flex-col items-center justify-center p-6">
                    <Avatar className="w-40 h-40 rounded-2xl">
                        <AvatarImage className="rounded-2xl" src={member.user.image} />
                        <AvatarFallback className="aspect-square text-6xl rounded-2xl bg-[#381d2a] dark:bg-[#4a2838] text-white font-semibold">
                            {avatarFallback}
                        </AvatarFallback>
                    </Avatar>
                </div>

                <div className="flex flex-col px-6 pb-6">
                    <p className="text-2xl font-semibold tracking-tight text-ink">{member.user.name}</p>

                    {member.user.title && <p className="text-sm text-ink/60 mt-0.5">{member.user.title}</p>}
                    <span className="mt-2 w-fit text-[11px] font-semibold uppercase tracking-wide rounded-full px-2 py-0.5 bg-[#ff5018]/10 text-orange-ink">
                        {isTargetOwner ? "Owner" : customRoleName ?? member.role}
                    </span>
                    {member.user.bio && <p className="text-sm text-ink/75 mt-3 whitespace-pre-wrap">{member.user.bio}</p>}

                    {isSelf && (
                        <p className="text-xs text-ink/65 mt-3">Edit your photo, title and bio from your avatar menu.</p>
                    )}

                    {/* Someone with rights over this member → role + remove */}
                    {!isSelf && !isTargetOwner && (canChangeRole || canRemove) && (
                        <div className="flex flex-col gap-2 mt-3">
                            {canChangeRole && (
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button variant={"outline"} className="w-full capitalize rounded-lg border-plum/15">
                                            {member.role} <ChevronDown className="size-4 ml-2 text-[#ff5018]" />
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent className="w-full rounded-xl p-1.5">
                                        <DropdownMenuRadioGroup
                                            value={member.role}
                                            onValueChange={(role) => onUpdate(role as "admin" | "moderator" | "member")}
                                        >
                                            {perms.isOwner && <DropdownMenuRadioItem value="admin">Admin</DropdownMenuRadioItem>}
                                            <DropdownMenuRadioItem value="moderator">Moderator</DropdownMenuRadioItem>
                                            <DropdownMenuRadioItem value="member">Member</DropdownMenuRadioItem>
                                        </DropdownMenuRadioGroup>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            )}
                            {canChangeRole && !targetIsAdmin && customRoles.length > 0 && (
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button variant={"outline"} className="w-full rounded-lg border-plum/15">
                                            {customRoleName ?? "Custom role: none"} <ChevronDown className="size-4 ml-2 text-[#ff5018]" />
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent className="w-full rounded-xl p-1.5">
                                        <DropdownMenuRadioGroup
                                            value={member.customRoleId ?? "none"}
                                            onValueChange={(id) =>
                                                setCustomRole({ id: memberId, customRoleId: id === "none" ? null : id })
                                                    .then(() => toast.success("Role updated"))
                                                    .catch((e) => toast.error(errMsg(e, "Failed to update role")))
                                            }
                                        >
                                            <DropdownMenuRadioItem value="none">No custom role</DropdownMenuRadioItem>
                                            {customRoles.map((r) => (
                                                <DropdownMenuRadioItem key={r.id} value={r.id}>{r.name}</DropdownMenuRadioItem>
                                            ))}
                                        </DropdownMenuRadioGroup>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            )}
                            {perms.isOwner && (
                                <Button onClick={onTransfer} variant={"outline"} className="w-full rounded-lg border-plum/15">
                                    Make owner
                                </Button>
                            )}
                            {canRemove && (
                                <Button onClick={onRemove} variant={"outline"} className="w-full rounded-lg border-rose-200 dark:border-rose-500/30 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10">
                                    Remove from workspace
                                </Button>
                            )}
                        </div>
                    )}

                    {/* Everyone except the owner can leave */}
                    {isSelf && !isTargetOwner && (
                        <div className="mt-3">
                            <Button onClick={onLeave} variant={"outline"} className="w-full rounded-lg border-plum/15">
                                Leave
                            </Button>
                        </div>
                    )}
                </div>

                <Separator />

                <div className="flex flex-col p-6">
                    <p className="text-sm font-semibold tracking-tight text-ink mb-4">Contact Information</p>
                    <div className="flex items-center gap-2">
                        <div className="size-9 rounded-lg bg-[#ff5018]/10 flex items-center justify-center">
                            <MailIcon className="size-4 text-[#ff5018]" />
                        </div>
                        <div className="flex flex-col">
                            <p className="text-[13px] font-semibold text-ink/60">
                                Email Address
                            </p>
                            <Link
                                href={`mailto:${member.user.email}`}
                                className="text-sm text-orange-ink hover:underline"
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