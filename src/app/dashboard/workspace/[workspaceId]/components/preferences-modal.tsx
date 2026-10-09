"use client"
import { useEffect, useRef, useState } from "react"
import { useMutation, useQuery } from "convex/react"
import { useRouter } from "next/navigation"
import { Camera, Loader, TrashIcon, Trash2, Crown, Shield, ShieldCheck, Download, Plus, Pencil, Settings2, Users, KeyRound, Plug, ScrollText, Upload } from "lucide-react"
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
import { IntegrationsPanel } from "@/features/integrations/integrations-panel"
import { ImportPanel } from "@/features/import/import-panel"

interface PreferencesModalProps {
  open: boolean
  setOpen: (open: boolean) => void
  initialValue: string
}

type Tab = "general" | "members" | "roles" | "integrations" | "audit" | "import"

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
  { key: "startMeetings", label: "Start and schedule meetings", hint: "Workspace meetings. Everyone can still start a 15 minute one-to-one call" },
  { key: "createDocs", label: "Create documents", hint: "Start new docs" },
]

// Spreadsheet formulas can start with = + - @, so those cells are prefixed with a quote when the CSV is opened in Excel or Sheets.
const csvCell = (v: string) => {
  const safe = /^[=+\-@\t\r]/.test(v) ? `'${v}` : v
  return `"${safe.replace(/"/g, '""')}"`
}
const exportAuditCsv = (rows: { actorName: string; action: string; detail?: string; _creationTime: number }[]) => {
  const lines = [["Time (UTC)", "Person", "Action", "Detail"].map(csvCell).join(",")]
  for (const r of rows) {
    lines.push([new Date(r._creationTime).toISOString(), r.actorName, ACTION_LABEL[r.action] ?? r.action, r.detail ?? ""].map(csvCell).join(","))
  }
  const url = URL.createObjectURL(new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" }))
  const a = document.createElement("a")
  a.href = url
  a.download = `audit-log-${new Date().toISOString().slice(0, 10)}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

const ACTION_LABEL: Record<string, string> = {
  "import.channel": "Imported a channel",
  "import.notes": "Imported notes",
  "workspace.update": "Updated workspace",
  "workspace.transfer": "Transferred ownership",
  "invite.reset": "Reset the join code",
  "invite.enable": "Turned invites on",
  "invite.disable": "Paused invites",
  "invite.open_link": "Turned on open invite link",
  "invite.close_link": "Turned off open invite link",
  "security.require_2fa": "Required two-step verification",
  "security.allow_no_2fa": "Stopped requiring two-step verification",
  "meeting.delete": "Deleted a meeting",
  "meeting.cancel": "Cancelled a scheduled meeting",
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
  "integration.create": "Added an integration",
  "integration.on": "Turned an integration on",
  "integration.off": "Turned an integration off",
  "integration.delete": "Removed an integration",
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
  const [auditSearch, setAuditSearch] = useState("")
  const auditRows = (audit ?? []).filter((a) => {
    const q = auditSearch.trim().toLowerCase()
    if (!q) return true
    return `${a.actorName} ${ACTION_LABEL[a.action] ?? a.action} ${a.action} ${a.detail ?? ""}`.toLowerCase().includes(q)
  })
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

  const tabs: { id: Tab; label: string; hint: string; icon: typeof Settings2; show: boolean }[] = [
    { id: "general", label: "General", hint: "Name, photo, security and data", icon: Settings2, show: true },
    { id: "members", label: "Members", hint: `${members ? members.length : "…"} ${members?.length === 1 ? "person" : "people"} in this workspace`, icon: Users, show: true },
    { id: "roles", label: "Roles & permissions", hint: "Choose what each role is allowed to do", icon: KeyRound, show: perms.isAdmin },
    { id: "integrations", label: "Integrations", hint: "API keys, webhooks and GitHub", icon: Plug, show: perms.isAdmin },
    { id: "audit", label: "Audit log", hint: "The latest 500 admin actions, searchable and exportable", icon: ScrollText, show: perms.isAdmin },
    { id: "import", label: "Import", hint: "Bring in channels from Slack or pages from Notion", icon: Upload, show: perms.isAdmin },
  ]
  const current = tabs.find((t) => t.id === tab) ?? tabs[0]

  const shownMembers = (members ?? []).filter((m) => (m.user.name ?? "").toLowerCase().includes(filter.toLowerCase()))
  const order = (m: { isOwner: boolean; role: string }) => (m.isOwner ? 0 : m.role === "admin" ? 1 : m.role === "moderator" ? 2 : m.role === "guest" ? 4 : 3)

  return (
    <>
      <ConfirmDialog />
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="flex h-[min(88vh,740px)] flex-col gap-0 overflow-hidden rounded-2xl bg-cream p-0 sm:max-w-4xl md:flex-row">
          <DialogTitle className="sr-only">Workspace settings</DialogTitle>

          <nav aria-label="Settings sections" className="flex shrink-0 gap-1 overflow-x-auto border-b border-plum/10 bg-surface p-2 pr-12 [scrollbar-width:none] md:w-60 md:flex-col md:overflow-visible md:border-b-0 md:border-r md:p-4 [&::-webkit-scrollbar]:hidden">
            <div className="hidden items-center gap-3 px-2 pb-4 pt-1 md:flex">
              <Avatar className="size-10 rounded-xl">
                <AvatarImage className="rounded-xl" src={workspace?.imageUrl ?? undefined} />
                <AvatarFallback className="rounded-xl bg-[#381d2a] text-base font-semibold text-white">{(workspace?.name ?? name).charAt(0).toUpperCase()}</AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-ink">{workspace?.name ?? name}</p>
                <p className="text-xs text-ink/55">Settings</p>
              </div>
            </div>
            {tabs.filter((t) => t.show).map((t) => {
              const Icon = t.icon
              const active = tab === t.id
              return (
                <button key={t.id} onClick={() => setTab(t.id)} aria-current={active ? "page" : undefined}
                  className={cn("flex shrink-0 items-center gap-2.5 whitespace-nowrap rounded-xl px-3 py-2.5 text-left text-sm font-semibold outline-none transition-colors focus-visible:ring-2 focus-visible:ring-[#ff5018]",
                    active ? "bg-[#381d2a] text-white" : "text-ink/70 hover:bg-cream hover:text-ink")}>
                  <Icon className={cn("size-4 shrink-0", active ? "text-[#ff5018]" : "")} />
                  {t.label}
                </button>
              )
            })}
          </nav>

          <div className="flex min-h-0 min-w-0 flex-1 flex-col">
          <header className="shrink-0 border-b border-plum/10 bg-surface/70 px-6 py-4 md:px-8 md:py-5">
            <h2 className="text-lg font-semibold tracking-tight text-ink">{current.label}</h2>
            <p className="mt-0.5 text-sm text-ink/60">{current.hint}</p>
          </header>

          <div className="min-h-0 flex-1 overflow-y-auto px-6 py-6 md:px-8">
            {tab === "general" && (
              <div className="flex flex-col gap-5">
                <div className="flex flex-wrap items-center gap-4 rounded-2xl border border-plum/12 bg-surface p-5">
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

                <form className="flex flex-col gap-4 rounded-2xl border border-plum/12 bg-surface p-5" onSubmit={(e) => { e.preventDefault(); save({ id: workspaceId, name, description }, "Workspace updated") }}>
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
                  <div className="flex items-center justify-between gap-4 rounded-2xl border border-plum/12 bg-surface p-5">
                    <div>
                      <p className="text-sm font-semibold text-ink">Require two-step verification</p>
                      <p className="mt-0.5 text-xs leading-relaxed text-ink/65">Everyone must set up an authenticator app before they can open this workspace. Growth plan and up.</p>
                    </div>
                    <button type="button" role="switch" aria-checked={!!workspace?.require2fa} aria-label="Require two-step verification"
                      onClick={() => {
                        const next = !workspace?.require2fa
                        setRequire2fa({ workspaceId, require: next })
                          .then(() => toast.success(next ? "Everyone must now use two-step verification" : "Two-step verification is optional again"))
                          .catch((err) => toast.error(errMsg(err, "Couldn't change that setting")))
                      }}
                      className={cn("relative h-6 w-11 shrink-0 rounded-full transition-colors outline-none focus-visible:ring-2 focus-visible:ring-[#ff5018]", workspace?.require2fa ? "bg-[#ff5018]" : "bg-ink/20")}>
                      <span className={cn("absolute left-0.5 top-0.5 size-5 rounded-full bg-white shadow transition-transform", workspace?.require2fa && "translate-x-5")} />
                    </button>
                  </div>
                )}

                {perms.isAdmin && (
                  <button disabled={exporting}
                    onClick={() => exportWorkspace(workspaceId, workspace?.name ?? name).then(() => toast.success("Export downloaded")).catch((e) => toast.error(errMsg(e, "Export failed. Please try again.")))}
                    className="flex items-center gap-x-2 rounded-2xl border border-plum/12 bg-surface p-5 text-ink hover:bg-cream-soft disabled:opacity-60">
                    {exporting ? <Loader className="size-4 animate-spin" /> : <Download className="size-4" />}
                    <span className="text-sm font-semibold">{exporting ? progress || "Exporting…" : "Export workspace data (JSON)"}</span>
                  </button>
                )}

                {perms.isOwner && (
                  <button disabled={isRemoving} onClick={handleRemove}
                    className="flex items-center gap-x-2 rounded-2xl border border-rose-500/30 bg-surface p-5 text-rose-600 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-500/10">
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

            {tab === "integrations" && <IntegrationsPanel workspaceId={workspaceId} />}

            {tab === "import" && <ImportPanel workspaceId={workspaceId} />}

            {tab === "audit" && (
              <div className="flex flex-col gap-1.5">
                <div className="mb-1 flex gap-2">
                  <Input value={auditSearch} onChange={(e) => setAuditSearch(e.target.value)} placeholder="Search by person, action or detail" aria-label="Search the audit log" />
                  <Button type="button" variant="outline" disabled={!audit?.length} onClick={() => exportAuditCsv(auditRows)}>
                    <Download className="size-4 mr-1.5" />CSV
                  </Button>
                </div>
                {audit === undefined && <Loader className="size-5 animate-spin text-[#ff5018] mx-auto my-6" />}
                {audit?.length === 0 && <p className="text-sm text-ink/65 text-center py-6">Nothing recorded yet.</p>}
                {audit && audit.length > 0 && auditRows.length === 0 && <p className="text-sm text-ink/65 text-center py-6">No entries match your search.</p>}
                {auditRows.map((a) => (
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
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
