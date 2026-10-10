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
import { PinnedMessages } from "@/features/marks/pinned-messages"

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
    const workspaceMembers = useQuery(api.members.get, canManage ? { workspaceId } : "skip")
    const setAccess = useMutation(api.channels.setAccess)
    const setReadOnly = useMutation(api.channels.setReadOnly)
    const setGuests = useMutation(api.channels.setGuests)

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
    const addable = (workspaceMembers ?? []).filter((m) => !ids.includes(m._id) && m.role !== "guest")
    const guestList = (workspaceMembers ?? []).filter((m) => m.role === "guest")
    const guestIds = (channel?.guestIds ?? []) as Id<"members">[]

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setValue(e.target.value.replace(/\s+/g, "-").toLowerCase())
    }

    return (
        <div className="bg-surface border-b border-plum/12 h-14 flex items-center px-4 overflow-hidden">
            <ConfirmDialog />
            <Dialog>
                <DialogTrigger asChild>
                    <Button variant={"ghost"} className="text-lg font-semibold tracking-tight px-2 overflow-hidden w-auto rounded-lg hover:bg-cream max-md:h-10" size={"sm"}>
                        <span className="flex items-center gap-2 truncate font-semibold tracking-tight">
                            {channel?.isPrivate ? <Lock className="size-5 shrink-0 text-brand" /> : <ChannelIcon name={title} className="size-5 shrink-0 text-brand" />}{cleanChannelName(title)}
                        </span>
                        <FaChevronDown className="text-brand size-2.5 ml-2" />
                    </Button>
                </DialogTrigger>

                <DialogContent className="p-0 bg-cream overflow-hidden rounded-2xl">
                    <DialogHeader className="px-6 py-5 border-b bg-surface ">
                        <DialogTitle className="font-semibold tracking-tight flex items-center gap-2">
                            {channel?.isPrivate && <Lock className="size-4 text-brand" />}
                            {cleanChannelName(title)}
                        </DialogTitle>
                    </DialogHeader>

                    <div className="px-6 py-5 flex flex-col gap-y-2 max-h-[65vh] overflow-y-auto">
                        <Dialog open={editOpen} onOpenChange={(v) => canManage && setEditOpen(v)}>
                            <DialogTrigger asChild>
                                <div className="px-5 py-4 bg-surface rounded-xl border border-plum/12 cursor-pointer hover:bg-cream/60">
                                    <div className="flex items-center justify-between">
                                        <p className="text-sm font-semibold">Channel Name</p>
                                        {canManage && <p className="text-sm text-brand hover:underline hover:underline-offset-4 font-semibold">Edit</p>}
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

                        <div className="px-5 py-4 bg-surface rounded-xl border border-plum/12">
                            <p className="text-sm font-semibold mb-2">Description</p>
                            {canManage ? (
                                <>
                                    <Textarea value={description} onChange={(e) => setDescription(e.target.value)} maxLength={250} rows={2} placeholder="What is this channel about?" />
                                    <Button size="sm" className="mt-2 bg-brand hover:bg-brand-hover text-white" disabled={updatingChannel || description === (channel?.description ?? "")} onClick={saveDescription}>Save</Button>
                                </>
                            ) : (
                                <p className="text-sm text-ink/65">{channel?.description || "No description yet."}</p>
                            )}
                        </div>

                        {canManage && channel && (
                            <div className="px-5 py-4 bg-surface rounded-xl border border-plum/12">
                                <label className="flex items-center justify-between gap-3 cursor-pointer">
                                    <span>
                                        <span className="block text-sm font-semibold">Locked channel</span>
                                        <span className="block text-xs text-ink/55">Only people you add, plus roles allowed to see locked channels, can open it.</span>
                                    </span>
                                    <input type="checkbox" className="size-4 accent-brand" checked={!!channel.isPrivate}
                                        onChange={(e) => run(() => setAccess({ id: channelId, isPrivate: e.target.checked }), "Couldn't change channel access")} />
                                </label>

                                {channel.isPrivate && (
                                    <div className="mt-4 flex flex-col gap-2">
                                        <div className="flex items-center justify-between">
                                            <p className="text-xs font-semibold uppercase tracking-wide text-ink/55">In this channel ({ids.length})</p>
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
                                                    <AvatarFallback className="rounded-md bg-avatar text-white text-xs">{(m.user.name ?? "?").charAt(0).toUpperCase()}</AvatarFallback>
                                                </Avatar>
                                                <span className="text-sm flex-1 truncate">{m.user.name}</span>
                                                <button aria-label={`Remove ${m.user.name}`} className="text-ink/45 hover:text-rose-600 dark:hover:text-rose-400"
                                                    onClick={() => run(() => setAccess({ id: channelId, isPrivate: true, memberIds: ids.filter((id) => id !== m._id) }), "Couldn't remove that person")}>
                                                    <X className="size-4" />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}

                        {canManage && channel && guestList.length > 0 && (
                            <div className="px-5 py-4 bg-surface rounded-xl border border-plum/12">
                                <p className="text-sm font-semibold">Guests in this channel</p>
                                <p className="text-xs text-ink/55 mb-2">Guests can only open channels you tick here.</p>
                                <div className="flex flex-col gap-1.5">
                                    {guestList.map((g) => (
                                        <label key={g._id} className="flex items-center gap-2.5 cursor-pointer">
                                            <input type="checkbox" className="size-4 accent-brand" checked={guestIds.includes(g._id as Id<"members">)}
                                                onChange={(e) => run(() => setGuests({
                                                    id: channelId,
                                                    guestIds: e.target.checked ? [...guestIds, g._id as Id<"members">] : guestIds.filter((id) => id !== g._id),
                                                }), "Couldn't change guest access")} />
                                            <span className="text-sm truncate">{g.user.name}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>
                        )}

                        {canManage && channel && (
                            <label className="px-5 py-4 bg-surface rounded-xl border border-plum/12 flex items-center justify-between gap-3 cursor-pointer">
                                <span>
                                    <span className="block text-sm font-semibold">Announcement channel (read-only)</span>
                                    <span className="block text-xs text-ink/55">Everyone can read and reply in threads; only roles allowed to post can start messages.</span>
                                </span>
                                <input type="checkbox" className="size-4 accent-brand" checked={!!channel.readOnly}
                                    onChange={(e) => run(() => setReadOnly({ id: channelId, readOnly: e.target.checked }), "Couldn't change channel mode")} />
                            </label>
                        )}

                        {canManage && (
                            <button className="flex items-center gap-x-2 px-5 py-4 bg-surface rounded-xl cursor-pointer border border-plum/12 hover:bg-rose-50 dark:hover:bg-rose-500/10 text-rose-600 dark:text-rose-400" onClick={handleDelete}>
                                <TrashIcon className="size-4" />
                                <p className="text-sm font-semibold">Delete Channel</p>
                            </button>
                        )}
                    </div>
                </DialogContent>
            </Dialog>
            <PinnedMessages channelId={channelId} />
        </div>
    )
}
