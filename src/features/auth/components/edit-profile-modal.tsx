"use client"
import { useEffect, useRef, useState } from "react"
import { useMutation } from "convex/react"
import { Camera, Loader, Trash2 } from "lucide-react"
import { toast } from "sonner"
import { api } from "../../../../convex/_generated/api"
import { Doc } from "../../../../convex/_generated/dataModel"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { usePhotoUpload } from "@/lib/upload-photo"
import { errMsg } from "@/lib/errors"

interface Props {
  open: boolean
  setOpen: (open: boolean) => void
  user: Doc<"users">
}

// Every member can edit their own name, title, bio and photo.
export const EditProfileModal = ({ open, setOpen, user }: Props) => {
  const update = useMutation(api.users.updateProfile)
  const { upload, uploading } = usePhotoUpload()
  const fileRef = useRef<HTMLInputElement>(null)

  const [name, setName] = useState(user.name ?? "")
  const [title, setTitle] = useState(user.title ?? "")
  const [bio, setBio] = useState(user.bio ?? "")
  const [photo, setPhoto] = useState<{ storageId: string; preview: string } | null>(null)
  const [removePhoto, setRemovePhoto] = useState(false)
  const [emailNotifs, setEmailNotifs] = useState(user.emailNotifications !== false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!open) return
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reset the form each time the dialog opens
    setName(user.name ?? ""); setTitle(user.title ?? ""); setBio(user.bio ?? ""); setPhoto(null); setRemovePhoto(false)
    setEmailNotifs(user.emailNotifications !== false)
  }, [open, user.name, user.title, user.bio, user.emailNotifications])

  const shownImage = removePhoto ? undefined : photo?.preview ?? user.image

  const onPick = async (file?: File) => {
    if (!file) return
    try {
      const storageId = await upload(file)
      setPhoto({ storageId, preview: URL.createObjectURL(file) })
      setRemovePhoto(false)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't upload that photo")
    }
  }

  const onSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      await update({
        name, title, bio,
        emailNotifications: emailNotifs,
        ...(photo ? { imageStorageId: photo.storageId as never } : {}),
        ...(removePhoto && !photo ? { removeImage: true } : {}),
      })
      toast.success("Profile updated")
      setOpen(false)
    } catch (err) {
      toast.error(errMsg(err, "Couldn't save your profile"))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="rounded-2xl p-0 overflow-hidden bg-[#f7f2ee] max-w-md">
        <DialogHeader className="px-6 py-5 border-b bg-white">
          <DialogTitle className="font-semibold tracking-tight">Edit your profile</DialogTitle>
        </DialogHeader>
        <form onSubmit={onSave} className="px-6 py-5 flex flex-col gap-4">
          <div className="flex items-center gap-4">
            <Avatar className="size-20 rounded-2xl">
              <AvatarImage className="rounded-2xl" src={shownImage} />
              <AvatarFallback className="rounded-2xl bg-[#381d2a] text-white text-2xl font-semibold">
                {(name || "?").charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="flex flex-col gap-2">
              <input ref={fileRef} type="file" accept="image/*" hidden onChange={(e) => { onPick(e.target.files?.[0]); e.target.value = "" }} />
              <Button type="button" variant="outline" size="sm" className="rounded-lg" disabled={uploading} onClick={() => fileRef.current?.click()}>
                {uploading ? <Loader className="size-4 mr-2 animate-spin" /> : <Camera className="size-4 mr-2" />}
                {shownImage ? "Change photo" : "Upload photo"}
              </Button>
              {shownImage && (
                <Button type="button" variant="ghost" size="sm" className="rounded-lg text-rose-600 hover:text-rose-700" onClick={() => { setPhoto(null); setRemovePhoto(true) }}>
                  <Trash2 className="size-4 mr-2" /> Remove
                </Button>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="pf-name">Display name</Label>
            <Input id="pf-name" value={name} onChange={(e) => setName(e.target.value)} maxLength={60} required disabled={saving} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="pf-title">Title</Label>
            <Input id="pf-title" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={80} placeholder="e.g. Product designer" disabled={saving} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="pf-bio">About</Label>
            <Textarea id="pf-bio" value={bio} onChange={(e) => setBio(e.target.value)} maxLength={300} rows={3} placeholder="A line or two about you" disabled={saving} />
            <p className="text-xs text-[#1b1017]/50 text-right">{bio.length}/300</p>
          </div>

          <label htmlFor="pf-email-notifs" className="flex items-start gap-3 rounded-xl border border-[#1b1017]/10 bg-white px-4 py-3 cursor-pointer">
            <input
              id="pf-email-notifs"
              type="checkbox"
              checked={emailNotifs}
              onChange={(e) => setEmailNotifs(e.target.checked)}
              disabled={saving}
              className="mt-1 size-4 accent-[#ff5018]"
            />
            <span className="flex flex-col">
              <span className="text-sm font-medium text-[#1b1017]">Email notifications</span>
              <span className="text-xs text-[#1b1017]/65">Get an email when you are mentioned, get a direct message or thread reply, or a task is assigned to you and you haven&apos;t seen it yet.</span>
            </span>
          </label>

          <DialogFooter>
            <Button type="button" variant="outline" disabled={saving} onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={saving || uploading} className="bg-[#ff5018] hover:bg-[#e6430f] text-white">
              {saving ? "Saving…" : "Save changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
