"use client"
import { useEffect, useState } from "react"
import { useMutation, useQuery } from "convex/react"
import { useRouter } from "next/navigation"
import { FaChevronDown } from "react-icons/fa"
import { Lock, TrashIcon, UserPlus, X } from "lucide-react"
import { toast } from "sonner"
import { DialogClose } from "@radix-ui/react-dialog"
import { api } from "../../../../../../convex/_generated/api"
import { Id } from "../../../../../../convex/_generated/dataModel"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { useUpdateChannel } from "@/features/channels/api/use-update-channel"
import { useRemoveChannel } from "@/features/channels/api/use-remove-channel"
import { useChannelId } from "@/hooks/use-channel-id"
import { useWorkspaceId } from "@/hooks/use-workspace-id"
import { usePermissions } from "@/hooks/use-permissions"
import { errMsg } from "@/lib/errors"
import { ChannelIcon, cleanChannelName } from "./channel-icon"
import { useConfirm } from "../../hooks/use-confirm"

interface HeaderProps {
    title: string;
}

export const Header = ({ title }: HeaderProps) => {
    const router = useRouter()
    const workspaceId = useWorkspaceId()
    const channelId = useChannelId()
    const perms = usePermissions()
    const canManage = perms.can("manageChannels")

    const channel = useQuery(api.channels.getById, { id: channelId })
    const channelMembers = useQuery(api.channels.getMembers, channel?.isPrivate ? { id: channelId } : "skip")
    const workspaceMembers = useQuery(api.members.get, canManage && channel?.isPrivate ? { workspaceId } : "skip")
    const setAccess = useMutation(api.channels.setAccess)
    const setReadOnly = useMutation(api.channels.setReadOnly)

    const [value, setValue] = useState(title)
    const [description, setDescription] = useState("")
    const [editOpen, setEditOpen] = useState(false)
    const [ConfirmDialog, confirm] = useConfirm(
        "Are you sure you want to delete this channel?",
        "This will permanently delete the channel and all its messages. This action can't be undone."
    )

    const { mutate: updateChannel, isPending: updatingChannel } = useUpdateChannel()
    const { mutate: removeChannel } = useRemoveChannel()

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect -- seed the description field from the saved channel
        setDescription(channel?.description ?? "")
    }, [channel?.description])

    const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        updateChannel({ id: channelId, name: value }, {
            onSuccess: () => { toast.success("Channel updated"); setEditOpen(false) },
            onError: (err) => toast.error(errMsg(err, "Failed to update channel")),
        })
    }

    const saveDescription = () => {
        updateChannel({ id: channelId, description }, {
            onSuccess: () => toast.success("Description saved"),
            onError: (err) => toast.error(errMsg(err, "Failed to save description")),
        })
    }

    const handleDelete = async () => {
        const ok = await confirm()
        if (!ok) return
        removeChannel({ id: channelId }, {
            onSuccess: () => { toast.success("Channel deleted"); router.push(`/dashboard/workspace/${workspaceId}`) },
            onError: (err) => toast.error(errMsg(err, "Failed to delete channel")),
        })
    }

    const run = async (fn: () => Promise<unknown>, fallback: string) => {
        try { await fn() } catch (err) { toast.error(errMsg(err, fallback)) }
    }

    const ids = (channelMembers ?? []).map((m) => m._id)
    const addable = (workspaceMembers ?? []).filter((m) => !ids.includes(m._id))

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setValue(e.target.value.replace(/\s+/g, "-").toLowerCase())
    }

    return (
        <div className="bg-white border-b border-[#381d2a]/12 h-14 flex items-center px-4 overflow-hidden">
            <ConfirmDialog />
            <Dialog>
                <DialogTrigger asChild>
                    <Button variant={"ghost"} className="text-lg font-semibold tracking-tight px-2 overflow-hidden w-auto rounded-lg hover:bg-[#f7f2ee] max-md:h-10" size={"sm"}>
                        <span className="flex items-center gap-2 truncate font-semibold tracking-tight">
                            {channel?.isPrivate ? <Lock className="size-5 shrink-0 text-[#ff5018]" /> : <ChannelIcon name={title} className="size-5 shrink-0 text-[#ff5018]" />}{cleanChannelName(title)}
                        </span>
                        <FaChevronDown className="text-[#ff5018] size-2.5 ml-2" />
                    </Button>
                </DialogTrigger>

                <DialogContent className="p-0 bg-[#f7f2ee] overflow-hidden rounded-2xl">
                    <DialogHeader className="px-6 py-5 border-b bg-white ">
                        <DialogTitle className="font-semibold tracking-tight flex items-center gap-2">
                            {channel?.isPrivate && <Lock className="size-4 text-[#ff5018]" />}
                            {cleanChannelName(title)}
                        </DialogTitle>
                    </DialogHeader>

                    <div className="px-6 py-5 flex flex-col gap-y-2 max-h-[65vh] overflow-y-auto">
                        <Dialog open={editOpen} onOpenChange={(v) => canManage && setEditOpen(v)}>
                            <DialogTrigger asChild>
                                <div className="px-5 py-4 bg-white rounded-xl border border-[#381d2a]/12 cursor-pointer hover:bg-[#f7f2ee]/60">
                                    <div className="flex items-center justify-between">
                                        <p className="text-sm font-semibold">Channel Name</p>
                                        {canManage && <p className="text-sm text-[#ff5018] hover:underline hover:underline-offset-4 font-semibold">Edit</p>}
                                    </div>
                                    <p className="text-sm">{cleanChannelName(title)}</p>
                                </div>
                            </DialogTrigger>
                            <DialogContent>
                                <DialogHeader>
                                    <DialogTitle className="font-semibold tracking-tight">Rename this channel</DialogTitle>
                                </DialogHeader>
                                <form onSubmit={handleSubmit} className="space-y-4">
                                    <Input value={value} disabled={updatingChannel} onChange={handleChange} required autoFocus minLength={3} maxLength={80} placeholder="e.g. general, marketing, etc." />
                                    <DialogFooter>
                                        <DialogClose asChild><Button type="button" variant={"outline"} disabled={updatingChannel}>Cancel</Button></DialogClose>
                                        <Button disabled={updatingChannel}>Save</Button>
                                    </DialogFooter>
                                </form>
                            </DialogContent>
                        </Dialog>

                        <div className="px-5 py-4 bg-white rounded-xl border border-[#381d2a]/12">
                            <p className="text-sm font-semibold mb-2">Description</p>
                            {canManage ? (
                                <>
                                    <Textarea value={description} onChange={(e) => setDescription(e.target.value)} maxLength={250} rows={2} placeholder="What is this channel about?" />
                                    <Button size="sm" className="mt-2 bg-[#ff5018] hover:bg-[#e6430f] text-white" disabled={updatingChannel || description === (channel?.description ?? "")} onClick={saveDescription}>Save</Button>
                                </>
                            ) : (
                                <p className="text-sm text-[#1b1017]/65">{channel?.description || "No description yet."}</p>
                            )}
                        </div>

                        {canManage && channel && (
                            <div className="px-5 py-4 bg-white rounded-xl border border-[#381d2a]/12">
                                <label className="flex items-center justify-between gap-3 cursor-pointer">
                                    <span>
                                        <span className="block text-sm font-semibold">Locked channel</span>
                                        <span className="block text-xs text-[#1b1017]/55">Only people you add, plus roles allowed to see locked channels, can open it.</span>
                                    </span>
                                    <input type="checkbox" className="size-4 accent-[#ff5018]" checked={!!channel.isPrivate}
                                        onChange={(e) => run(() => setAccess({ id: channelId, isPrivate: e.target.checked }), "Couldn't change channel access")} />
                                </label>

                                {channel.isPrivate && (
                                    <div className="mt-4 flex flex-col gap-2">
                                        <div className="flex items-center justify-between">
                                            <p className="text-xs font-semibold uppercase tracking-wide text-[#1b1017]/55">In this channel ({ids.length})</p>
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button size="sm" variant="outline" className="rounded-lg" disabled={addable.length === 0}>
                                                        <UserPlus className="size-4 mr-1.5" /> Add
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end" className="max-h-64 overflow-y-auto rounded-xl p-1.5">
                                                    {addable.map((m) => (
                                                        <DropdownMenuItem key={m._id} className="rounded-lg cursor-pointer"
                                                            onClick={() => run(() => setAccess({ id: channelId, isPrivate: true, memberIds: [...ids, m._id as Id<"members">] }), "Couldn't add that person")}>
                                                            {m.user.name}
                                                        </DropdownMenuItem>
                                                    ))}
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </div>
                                        {(channelMembers ?? []).map((m) => (
                                            <div key={m._id} className="flex items-center gap-2.5">
                                                <Avatar className="size-7 rounded-md">
                                                    <AvatarImage className="rounded-md" src={m.user.image} />
                                                    <AvatarFallback className="rounded-md bg-[#381d2a] text-white text-xs">{(m.user.name ?? "?").charAt(0).toUpperCase()}</AvatarFallback>
                                                </Avatar>
                                                <span className="text-sm flex-1 truncate">{m.user.name}</span>
                                                <button aria-label={`Remove ${m.user.name}`} className="text-[#1b1017]/45 hover:text-rose-600"
                                                    onClick={() => run(() => setAccess({ id: channelId, isPrivate: true, memberIds: ids.filter((id) => id !== m._id) }), "Couldn't remove that person")}>
                                                    <X className="size-4" />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}

                        {canManage && channel && (
                            <label className="px-5 py-4 bg-white rounded-xl border border-[#381d2a]/12 flex items-center justify-between gap-3 cursor-pointer">
                                <span>
                                    <span className="block text-sm font-semibold">Announcement channel (read-only)</span>
                                    <span className="block text-xs text-[#1b1017]/55">Everyone can read and reply in threads; only roles allowed to post can start messages.</span>
                                </span>
                                <input type="checkbox" className="size-4 accent-[#ff5018]" checked={!!channel.readOnly}
                                    onChange={(e) => run(() => setReadOnly({ id: channelId, readOnly: e.target.checked }), "Couldn't change channel mode")} />
                            </label>
                        )}

                        {canManage && (
                            <button className="flex items-center gap-x-2 px-5 py-4 bg-white rounded-xl cursor-pointer border border-[#381d2a]/12 hover:bg-rose-50 text-rose-600" onClick={handleDelete}>
                                <TrashIcon className="size-4" />
                                <p className="text-sm font-semibold">Delete Channel</p>
                            </button>
                        )}
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    )
}
