"use client"
import { useEffect, useRef, useState } from "react"
import { useMutation, useQuery } from "convex/react"
import { useRouter } from "next/navigation"
import { Camera, Loader, TrashIcon, Trash2, Crown, Shield, ShieldCheck, Download, Plus, Pencil } from "lucide-react"
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
import { useDataExport } from "@/lib/export-data"
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
  { key: "postInReadOnly", label: "Post in read-only channels", hint: "Write in announcement channels" },
  { key: "mentionEveryone", label: "Use @everyone", hint: "Notify everyone who can see a channel" },
  { key: "uploadFiles", label: "Upload files and images", hint: "Attach files and pictures to messages and docs" },
  { key: "startMeetings", label: "Start meetings", hint: "Create new meetings" },
  { key: "createDocs", label: "Create documents", hint: "Start new docs" },
]

const ACTION_LABEL: Record<string, string> = {
  "workspace.update": "Updated workspace",
  "workspace.transfer": "Transferred ownership",
  "invite.reset": "Reset the join code",
  "invite.enable": "Turned invites on",
  "invite.disable": "Paused invites",
  "invite.open_link": "Turned on open invite link",
  "invite.close_link": "Turned off open invite link",
  "security.require_2fa": "Required two-step verification",
  "security.allow_no_2fa": "Stopped requiring two-step verification",
  "member.role": "Changed a role",
  "member.remove": "Removed a member",
  "member.leave": "Member left",
  "permissions.update": "Changed role permissions",
  "channel.create": "Created a channel",
  "channel.update": "Edited a channel",
  "channel.lock": "Locked a channel",
  "channel.unlock": "Unlocked a channel",
  "channel.delete": "Deleted a channel",
  "channel.create_private": "Created a locked channel",
  "channel.guests": "Changed guest access to a channel",
  "channel.readonly_on": "Made a channel read-only",
  "channel.readonly_off": "Made a channel writable",
  "role.create": "Created a custom role",
  "role.update": "Edited a custom role",
  "role.delete": "Deleted a custom role",
  "member.customRole": "Assigned a custom role",
}

const RoleIcon = ({ role, isOwner }: { role: string; isOwner?: boolean }) =>
  isOwner ? <Crown className="size-3.5 text-[#ff5018]" /> :
  role === "admin" ? <ShieldCheck className="size-3.5 text-[#ff5018]" /> :
  role === "moderator" ? <Shield className="size-3.5 text-plum" /> : null

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
  const setRequire2fa = useMutation(api.workspaces.setRequire2fa)
  const setRolePermissions = useMutation(api.permissions.setRolePermissions)
  const saveCustomRole = useMutation(api.permissions.saveCustomRole)
  const deleteCustomRole = useMutation(api.permissions.deleteCustomRole)
  const { exportWorkspace, busy: exporting, progress } = useDataExport()
  const [roleDraft, setRoleDraft] = useState<{ id?: string; name: string; baseRole: "moderator" | "member"; permissions: string[] } | null>(null)
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
  const order = (m: { isOwner: boolean; role: string }) => (m.isOwner ? 0 : m.role === "admin" ? 1 : m.role === "moderator" ? 2 : m.role === "guest" ? 4 : 3)

  return (
    <>
      <ConfirmDialog />
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="bg-cream p-0 overflow-hidden rounded-2xl max-w-2xl">
          <DialogHeader className="px-6 py-5 border-b bg-surface">
            <DialogTitle className="font-semibold tracking-tight">Workspace settings</DialogTitle>
          </DialogHeader>

          <div className="flex gap-1 px-4 pt-3 border-b bg-surface overflow-x-auto overflow-y-hidden [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {tabs.filter((t) => t.show).map((t) => (
              <button key={t.id} onClick={() => setTab(t.id)}
                className={cn("px-3 py-2 text-sm font-semibold whitespace-nowrap border-b-2 -mb-px transition",
                  tab === t.id ? "border-[#ff5018] text-ink" : "border-transparent text-ink/65 hover:text-ink")}>
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
                    <AvatarFallback className="rounded-2xl bg-[#381d2a] dark:bg-[#4a2838] text-white text-3xl font-semibold">
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
                        <Button type="button" variant="ghost" size="sm" className="rounded-lg text-rose-600 dark:text-rose-400 hover:text-rose-700 dark:hover:text-rose-300" disabled={saving}
                          onClick={() => save({ id: workspaceId, removeImage: true }, "Photo removed")}>
                          <Trash2 className="size-4 mr-2" /> Remove
                        </Button>
                      )}
                    </div>
                  ) : <p className="text-sm text-ink/65">You don&apos;t have permission to edit the workspace.</p>}
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

                {perms.isAdmin && (
                  <label className="flex items-start gap-3 rounded-xl border border-plum/12 bg-surface px-5 py-4 cursor-pointer">
                    <input
                      type="checkbox"
                      className="mt-1 size-4 accent-[#ff5018]"
                      checked={!!workspace?.require2fa}
                      onChange={(e) =>
                        setRequire2fa({ workspaceId, require: e.target.checked })
                          .then(() => toast.success(e.target.checked ? "Everyone must now use two-step verification" : "Two-step verification is optional again"))
                          .catch((err) => toast.error(errMsg(err, "Couldn't change that setting")))
                      }
                    />
                    <span>
                      <span className="block text-sm font-semibold text-ink">Require two-step verification</span>
                      <span className="block text-xs text-ink/65">Everyone must set up an authenticator app before they can open this workspace. Business plan and up.</span>
                    </span>
                  </label>
                )}

                {perms.isAdmin && (
                  <button disabled={exporting}
                    onClick={() => exportWorkspace(workspaceId, workspace?.name ?? name).then(() => toast.success("Export downloaded")).catch((e) => toast.error(errMsg(e, "Export failed. Please try again.")))}
                    className="flex items-center gap-x-2 px-5 py-4 bg-surface rounded-xl border border-plum/12 hover:bg-cream-soft text-ink disabled:opacity-60">
                    {exporting ? <Loader className="size-4 animate-spin" /> : <Download className="size-4" />}
                    <span className="text-sm font-semibold">{exporting ? progress || "Exporting…" : "Export workspace data (JSON)"}</span>
                  </button>
                )}

                {perms.isOwner && (
                  <button disabled={isRemoving} onClick={handleRemove}
                    className="flex items-center gap-x-2 px-5 py-4 bg-surface rounded-xl border border-plum/12 hover:bg-rose-50 dark:hover:bg-rose-500/10 text-rose-600 dark:text-rose-400">
                    <TrashIcon className="size-4" />
                    <p className="text-sm font-semibold">Delete workspace</p>
                  </button>
                )}
              </div>
            )}

            {tab === "members" && (
              <div className="flex flex-col gap-3">
                <Input aria-label="Search members" placeholder="Search members" value={filter} onChange={(e) => setFilter(e.target.value)} className="bg-surface" />
                <div className="flex flex-col gap-1.5">
                  {!members && <Loader className="size-5 animate-spin text-[#ff5018] mx-auto my-6" />}
                  {[...shownMembers].sort((a, b) => order(a) - order(b)).map((m) => (
                    <button key={m._id} onClick={() => { onOpenProfile(m._id); setOpen(false) }}
                      className="flex items-center gap-3 bg-surface rounded-xl border border-plum/10 px-3 py-2.5 text-left hover:bg-cream-soft">
                      <Avatar className="size-9 rounded-lg">
                        <AvatarImage className="rounded-lg" src={m.user.image} />
                        <AvatarFallback className="rounded-lg bg-[#381d2a] dark:bg-[#4a2838] text-white font-semibold">{(m.user.name ?? "?").charAt(0).toUpperCase()}</AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-ink truncate">{m.user.name}</p>
                        <p className="text-xs text-ink/65 truncate">{m.user.title || m.user.email}</p>
                      </div>
                      <span className="flex items-center gap-1 text-xs font-semibold capitalize text-ink/70">
                        <RoleIcon role={m.role} isOwner={m.isOwner} />
                        {m.isOwner ? "Owner" : rolePerms?.customRoles.find((r) => r.id === m.customRoleId)?.name ?? m.role}
                      </span>
                    </button>
                  ))}
                  {members && shownMembers.length === 0 && <p className="text-sm text-ink/65 text-center py-6">No one matches that search.</p>}
                </div>
              </div>
            )}

            {tab === "roles" && (
              <div className="flex flex-col gap-4">
                <p className="text-sm text-ink/65">Owner and admins can do everything. Choose what moderators and members are allowed to do. Changes apply immediately.</p>
                <div className="bg-surface rounded-xl border border-plum/10 overflow-hidden">
                  <div className="grid grid-cols-[1fr_88px_88px] px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-ink/65 border-b">
                    <span>Permission</span><span className="text-center">Moderator</span><span className="text-center">Member</span>
                  </div>
                  {PERMISSION_INFO.map((p) => (
                    <div key={p.key} className="grid grid-cols-[1fr_88px_88px] items-center px-4 py-3 border-b last:border-b-0">
                      <div className="pr-3">
                        <p className="text-sm font-semibold text-ink">{p.label}</p>
                        <p className="text-xs text-ink/65">{p.hint}</p>
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

                <div className="flex items-center justify-between pt-2">
                  <div>
                    <p className="text-sm font-semibold text-ink">Custom roles</p>
                    <p className="text-xs text-ink/65">Name a role, pick a rank and exactly what it can do. Assign it from a member&apos;s profile.</p>
                  </div>
                  <Button size="sm" variant="outline" className="rounded-lg" disabled={(rolePerms?.customRoles.length ?? 0) >= 10}
                    onClick={() => setRoleDraft({ name: "", baseRole: "member", permissions: [] })}>
                    <Plus className="size-4 mr-1" /> New role
                  </Button>
                </div>
                <div className="flex flex-col gap-1.5">
                  {rolePerms?.customRoles.length === 0 && <p className="text-sm text-ink/65">No custom roles yet.</p>}
                  {rolePerms?.customRoles.map((r) => (
                    <div key={r.id} className="flex items-center gap-3 bg-surface rounded-xl border border-plum/10 px-4 py-2.5">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold truncate">{r.name}</p>
                        <p className="text-xs text-ink/65">Ranks as {r.baseRole} · {r.permissions.length} permissions · {(members ?? []).filter((m) => m.customRoleId === r.id).length} people</p>
                      </div>
                      <Button size="icon" variant="ghost" aria-label="Edit role" onClick={() => setRoleDraft({ id: r.id, name: r.name, baseRole: r.baseRole, permissions: r.permissions })}><Pencil className="size-4" aria-hidden="true" /></Button>
                      <Button size="icon" variant="ghost" aria-label="Delete role" className="text-rose-600 dark:text-rose-400"
                        onClick={() => deleteCustomRole({ workspaceId, id: r.id }).then(() => toast.success("Role deleted")).catch((e) => toast.error(errMsg(e, "Couldn't delete role")))}>
                        <Trash2 className="size-4" aria-hidden="true" />
                      </Button>
                    </div>
                  ))}
                </div>

                {roleDraft && (
                  <form className="bg-surface rounded-xl border border-[#ff5018]/40 p-4 flex flex-col gap-3"
                    onSubmit={(e) => {
                      e.preventDefault()
                      saveCustomRole({ workspaceId, ...roleDraft })
                        .then(() => { toast.success("Role saved"); setRoleDraft(null) })
                        .catch((err) => toast.error(errMsg(err, "Couldn't save role")))
                    }}>
                    <div className="grid gap-3 sm:grid-cols-[1fr_160px]">
                      <div className="flex flex-col gap-1.5">
                        <Label htmlFor="role-name">Role name</Label>
                        <Input id="role-name" value={roleDraft.name} onChange={(e) => setRoleDraft({ ...roleDraft, name: e.target.value })} maxLength={30} placeholder="e.g. Support lead" required />
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <Label htmlFor="role-rank">Ranks as</Label>
                        <select id="role-rank" value={roleDraft.baseRole} onChange={(e) => setRoleDraft({ ...roleDraft, baseRole: e.target.value as "moderator" | "member" })}
                          className="h-9 rounded-md border border-input bg-surface px-3 text-sm text-ink">
                          <option value="member">Member</option>
                          <option value="moderator">Moderator</option>
                        </select>
                      </div>
                    </div>
                    <div className="grid gap-x-4 gap-y-2 sm:grid-cols-2">
                      {PERMISSION_INFO.map((p) => (
                        <label key={p.key} className="flex items-start gap-2 text-sm cursor-pointer">
                          <input type="checkbox" className="mt-0.5 size-4 accent-[#ff5018]" checked={roleDraft.permissions.includes(p.key)}
                            onChange={(e) => setRoleDraft({ ...roleDraft, permissions: e.target.checked ? [...roleDraft.permissions, p.key] : roleDraft.permissions.filter((k) => k !== p.key) })} />
                          <span>{p.label}</span>
                        </label>
                      ))}
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button type="button" variant="outline" onClick={() => setRoleDraft(null)}>Cancel</Button>
                      <Button type="submit" className="bg-[#ff5018] hover:bg-[#e6430f] text-white">Save role</Button>
                    </div>
                  </form>
                )}
              </div>
            )}

            {tab === "audit" && (
              <div className="flex flex-col gap-1.5">
                {audit === undefined && <Loader className="size-5 animate-spin text-[#ff5018] mx-auto my-6" />}
                {audit?.length === 0 && <p className="text-sm text-ink/65 text-center py-6">Nothing recorded yet.</p>}
                {audit?.map((a) => (
                  <div key={a._id} className="bg-surface rounded-xl border border-plum/10 px-4 py-2.5">
                    <p className="text-sm text-ink"><span className="font-semibold">{a.actorName}</span> · {ACTION_LABEL[a.action] ?? a.action}</p>
                    <p className="text-xs text-ink/65">
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
