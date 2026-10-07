"use client"
import { useEffect, useRef, useState } from "react"
import { useMutation, useQuery } from "convex/react"
import { useRouter } from "next/navigation"
import { Camera, Loader, TrashIcon, Trash2, Crown, Shield, ShieldCheck } from "lucide-react"
import { toast } from "sonner"
import { api } from "../../../../../../convex/_generated/api"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { useRemoveWorkspace } from "@/features/workspaces/api/use-delete-workspace"
import { useWorkspaceId } from "@/hooks/use-workspace-id"
import { usePermissions, PermissionKey } from "@/hooks/use-permissions"
import { usePanel } from "@/hooks/use-panel"
import { usePhotoUpload } from "@/lib/upload-photo"
import { errMsg } from "@/lib/errors"
import { cn } from "@/lib/utils"
import { useConfirm } from "../../hooks/use-confirm"

interface PreferencesModalProps {
  open: boolean
  setOpen: (open: boolean) => void
  initialValue: string
}

type Tab = "general" | "members" | "roles" | "audit"

const PERMISSION_INFO: { key: PermissionKey; label: string; hint: string }[] = [
  { key: "createChannels", label: "Create channels", hint: "Start new public or locked channels" },
  { key: "manageChannels", label: "Manage channels", hint: "Rename, lock/unlock, add people to and delete channels" },
  { key: "viewPrivateChannels", label: "See all locked channels", hint: "Open locked channels without being added" },
  { key: "deleteMessages", label: "Delete others' messages", hint: "Moderate chat in channels" },
  { key: "manageMembers", label: "Remove members", hint: "Remove people ranked below them" },
  { key: "invite", label: "Invite people", hint: "See the join code, reset it, pause invites" },
  { key: "editWorkspace", label: "Edit workspace", hint: "Name, photo and description" },
  { key: "moderateMeetings", label: "Moderate meetings", hint: "Mute, remove people and end calls for everyone" },
  { key: "manageContent", label: "Manage shared content", hint: "Edit or delete others' tasks, notes, sprints and docs" },
]

const ACTION_LABEL: Record<string, string> = {
  "workspace.update": "Updated workspace",
  "workspace.transfer": "Transferred ownership",
  "invite.reset": "Reset the join code",
  "invite.enable": "Turned invites on",
  "invite.disable": "Paused invites",
  "member.role": "Changed a role",
  "member.remove": "Removed a member",
  "member.leave": "Member left",
  "permissions.update": "Changed role permissions",
  "channel.create": "Created a channel",
  "channel.update": "Edited a channel",
  "channel.lock": "Locked a channel",
  "channel.unlock": "Unlocked a channel",
  "channel.delete": "Deleted a channel",
}

const RoleIcon = ({ role, isOwner }: { role: string; isOwner?: boolean }) =>
  isOwner ? <Crown className="size-3.5 text-[#ff5018]" /> :
  role === "admin" ? <ShieldCheck className="size-3.5 text-[#ff5018]" /> :
  role === "moderator" ? <Shield className="size-3.5 text-[#381d2a]" /> : null

export const PreferencesModal = ({ open, setOpen, initialValue }: PreferencesModalProps) => {
  const workspaceId = useWorkspaceId()
  const router = useRouter()
  const perms = usePermissions()
  const { onOpenProfile } = usePanel()
  const { upload, uploading } = usePhotoUpload()
  const fileRef = useRef<HTMLInputElement>(null)

  const workspace = useQuery(api.workspaces.getById, { id: workspaceId })
  const members = useQuery(api.members.get, { workspaceId })
  const rolePerms = useQuery(api.permissions.rolePermissions, { workspaceId })
  const audit = useQuery(api.audit.list, perms.isAdmin && open ? { workspaceId } : "skip")

  const updateWorkspace = useMutation(api.workspaces.update)
  const setRolePermissions = useMutation(api.permissions.setRolePermissions)
  const { mutate: removeWorkspace, isPending: isRemoving } = useRemoveWorkspace()

  const [tab, setTab] = useState<Tab>("general")
  const [name, setName] = useState(initialValue)
  const [description, setDescription] = useState("")
  const [saving, setSaving] = useState(false)
  const [filter, setFilter] = useState("")

  const [ConfirmDialog, confirm] = useConfirm("Delete this workspace?", "This permanently deletes every channel, message, doc and file. This cannot be undone.")

  const canEdit = perms.can("editWorkspace")

  useEffect(() => {
    if (!open || !workspace) return
    // eslint-disable-next-line react-hooks/set-state-in-effect -- seed the form from the saved workspace when the dialog opens
    setName(workspace.name); setDescription(workspace.description ?? "")
  }, [open, workspace])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- always start on the first tab
    if (open) setTab("general")
  }, [open])

  const save = async (patch: Parameters<typeof updateWorkspace>[0], ok: string) => {
    setSaving(true)
    try { await updateWorkspace(patch); toast.success(ok) }
    catch (e) { toast.error(errMsg(e, "Couldn't save changes")) }
    finally { setSaving(false) }
  }

  const onPhoto = async (file?: File) => {
    if (!file) return
    try {
      const image = await upload(file)
      await save({ id: workspaceId, image }, "Workspace photo updated")
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't upload that photo")
    }
  }

  const toggle = async (role: "moderator" | "member", key: PermissionKey) => {
    const current = rolePerms?.[role] ?? []
    const next = current.includes(key) ? current.filter((k) => k !== key) : [...current, key]
    try { await setRolePermissions({ workspaceId, role, permissions: next }) }
    catch (e) { toast.error(errMsg(e, "Couldn't update permissions")) }
  }

  const handleRemove = async () => {
    const ok = await confirm()
    if (!ok) return
    removeWorkspace({ id: workspaceId }, {
      onSuccess: () => { toast.success("Workspace removed"); router.replace("/dashboard") },
      onError: (e) => toast.error(errMsg(e, "Failed to delete workspace")),
    })
  }

  const tabs: { id: Tab; label: string; show: boolean }[] = [
    { id: "general", label: "General", show: true },
    { id: "members", label: `Members${members ? ` (${members.length})` : ""}`, show: true },
    { id: "roles", label: "Roles & permissions", show: perms.isAdmin },
    { id: "audit", label: "Audit log", show: perms.isAdmin },
  ]

  const shownMembers = (members ?? []).filter((m) => (m.user.name ?? "").toLowerCase().includes(filter.toLowerCase()))
  const order = (m: { isOwner: boolean; role: string }) => (m.isOwner ? 0 : m.role === "admin" ? 1 : m.role === "moderator" ? 2 : 3)

  return (
    <>
      <ConfirmDialog />
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="bg-[#f7f2ee] p-0 overflow-hidden rounded-2xl max-w-2xl">
          <DialogHeader className="px-6 py-5 border-b bg-white">
            <DialogTitle className="font-semibold tracking-tight">Workspace settings</DialogTitle>
          </DialogHeader>

          <div className="flex gap-1 px-4 pt-3 border-b bg-white overflow-x-auto">
            {tabs.filter((t) => t.show).map((t) => (
              <button key={t.id} onClick={() => setTab(t.id)}
                className={cn("px-3 py-2 text-sm font-semibold whitespace-nowrap border-b-2 -mb-px transition",
                  tab === t.id ? "border-[#ff5018] text-[#1b1017]" : "border-transparent text-[#1b1017]/55 hover:text-[#1b1017]")}>
                {t.label}
              </button>
            ))}
          </div>

          <div className="px-6 py-5 max-h-[60vh] overflow-y-auto">
            {tab === "general" && (
              <div className="flex flex-col gap-5">
                <div className="flex items-center gap-4">
                  <Avatar className="size-20 rounded-2xl">
                    <AvatarImage className="rounded-2xl" src={workspace?.imageUrl ?? undefined} />
                    <AvatarFallback className="rounded-2xl bg-[#381d2a] text-white text-3xl font-semibold">
                      {(workspace?.name ?? name).charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  {canEdit ? (
                    <div className="flex flex-col gap-2">
                      <input ref={fileRef} type="file" accept="image/*" hidden onChange={(e) => { onPhoto(e.target.files?.[0]); e.target.value = "" }} />
                      <Button type="button" variant="outline" size="sm" className="rounded-lg" disabled={uploading || saving} onClick={() => fileRef.current?.click()}>
                        {uploading ? <Loader className="size-4 mr-2 animate-spin" /> : <Camera className="size-4 mr-2" />}
                        {workspace?.imageUrl ? "Change photo" : "Upload photo"}
                      </Button>
                      {workspace?.imageUrl && (
                        <Button type="button" variant="ghost" size="sm" className="rounded-lg text-rose-600 hover:text-rose-700" disabled={saving}
                          onClick={() => save({ id: workspaceId, removeImage: true }, "Photo removed")}>
                          <Trash2 className="size-4 mr-2" /> Remove
                        </Button>
                      )}
                    </div>
                  ) : <p className="text-sm text-[#1b1017]/55">You don&apos;t have permission to edit the workspace.</p>}
                </div>

                <form className="flex flex-col gap-4" onSubmit={(e) => { e.preventDefault(); save({ id: workspaceId, name, description }, "Workspace updated") }}>
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="ws-name">Workspace name</Label>
                    <Input id="ws-name" value={name} onChange={(e) => setName(e.target.value)} maxLength={60} required minLength={3} disabled={!canEdit || saving} />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="ws-desc">Description</Label>
                    <Textarea id="ws-desc" value={description} onChange={(e) => setDescription(e.target.value)} maxLength={300} rows={3} placeholder="What is this workspace for?" disabled={!canEdit || saving} />
                  </div>
                  {canEdit && (
                    <Button type="submit" disabled={saving} className="w-fit bg-[#ff5018] hover:bg-[#e6430f] text-white">
                      {saving ? "Saving…" : "Save changes"}
                    </Button>
                  )}
                </form>

                {perms.isOwner && (
                  <button disabled={isRemoving} onClick={handleRemove}
                    className="flex items-center gap-x-2 px-5 py-4 bg-white rounded-xl border border-[#381d2a]/12 hover:bg-rose-50 text-rose-600">
                    <TrashIcon className="size-4" />
                    <p className="text-sm font-semibold">Delete workspace</p>
                  </button>
                )}
              </div>
            )}

            {tab === "members" && (
              <div className="flex flex-col gap-3">
                <Input placeholder="Search members" value={filter} onChange={(e) => setFilter(e.target.value)} className="bg-white" />
                <div className="flex flex-col gap-1.5">
                  {!members && <Loader className="size-5 animate-spin text-[#ff5018] mx-auto my-6" />}
                  {[...shownMembers].sort((a, b) => order(a) - order(b)).map((m) => (
                    <button key={m._id} onClick={() => { onOpenProfile(m._id); setOpen(false) }}
                      className="flex items-center gap-3 bg-white rounded-xl border border-[#381d2a]/10 px-3 py-2.5 text-left hover:bg-[#fbf9f7]">
                      <Avatar className="size-9 rounded-lg">
                        <AvatarImage className="rounded-lg" src={m.user.image} />
                        <AvatarFallback className="rounded-lg bg-[#381d2a] text-white font-semibold">{(m.user.name ?? "?").charAt(0).toUpperCase()}</AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-[#1b1017] truncate">{m.user.name}</p>
                        <p className="text-xs text-[#1b1017]/55 truncate">{m.user.title || m.user.email}</p>
                      </div>
                      <span className="flex items-center gap-1 text-xs font-semibold capitalize text-[#1b1017]/70">
                        <RoleIcon role={m.role} isOwner={m.isOwner} />
                        {m.isOwner ? "Owner" : m.role}
                      </span>
                    </button>
                  ))}
                  {members && shownMembers.length === 0 && <p className="text-sm text-[#1b1017]/55 text-center py-6">No one matches that search.</p>}
                </div>
              </div>
            )}

            {tab === "roles" && (
              <div className="flex flex-col gap-4">
                <p className="text-sm text-[#1b1017]/65">Owner and admins can do everything. Choose what moderators and members are allowed to do. Changes apply immediately.</p>
                <div className="bg-white rounded-xl border border-[#381d2a]/10 overflow-hidden">
                  <div className="grid grid-cols-[1fr_88px_88px] px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-[#1b1017]/55 border-b">
                    <span>Permission</span><span className="text-center">Moderator</span><span className="text-center">Member</span>
                  </div>
                  {PERMISSION_INFO.map((p) => (
                    <div key={p.key} className="grid grid-cols-[1fr_88px_88px] items-center px-4 py-3 border-b last:border-b-0">
                      <div className="pr-3">
                        <p className="text-sm font-semibold text-[#1b1017]">{p.label}</p>
                        <p className="text-xs text-[#1b1017]/55">{p.hint}</p>
                      </div>
                      {(["moderator", "member"] as const).map((role) => (
                        <div key={role} className="flex justify-center">
                          <input type="checkbox" aria-label={`${p.label} for ${role}`} className="size-4 accent-[#ff5018] cursor-pointer"
                            disabled={!rolePerms}
                            checked={!!rolePerms?.[role]?.includes(p.key)} onChange={() => toggle(role, p.key)} />
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {tab === "audit" && (
              <div className="flex flex-col gap-1.5">
                {audit === undefined && <Loader className="size-5 animate-spin text-[#ff5018] mx-auto my-6" />}
                {audit?.length === 0 && <p className="text-sm text-[#1b1017]/55 text-center py-6">Nothing recorded yet.</p>}
                {audit?.map((a) => (
                  <div key={a._id} className="bg-white rounded-xl border border-[#381d2a]/10 px-4 py-2.5">
                    <p className="text-sm text-[#1b1017]"><span className="font-semibold">{a.actorName}</span> · {ACTION_LABEL[a.action] ?? a.action}</p>
                    <p className="text-xs text-[#1b1017]/55">
                      {a.detail ? `${a.detail} · ` : ""}{new Date(a._creationTime).toLocaleString()}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
