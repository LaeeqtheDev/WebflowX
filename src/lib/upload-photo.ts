"use client"
import { useCallback, useState } from "react"
import { useMutation } from "convex/react"
import { api } from "../../convex/_generated/api"
import { Id } from "../../convex/_generated/dataModel"
import { errMsg } from "@/lib/errors"

const MB = 1024 * 1024
export const IMAGE_TYPES = ["image/png", "image/jpeg", "image/gif", "image/webp", "image/avif"]

type Kind = "image" | "file" | "doc" | "avatar"
const MAX: Record<Kind, number> = { image: 10 * MB, file: 25 * MB, doc: 10 * MB, avatar: 5 * MB }

/**
 * Two-step upload: ask the server for a URL (checks permission, rate limit and storage space),
 * send the file, then register it so the server verifies the real type and size.
 * Throws an Error with a message that is safe to show.
 */
export const useUploader = () => {
  const generateUploadUrl = useMutation(api.files.generateUploadUrl)
  const register = useMutation(api.files.register)
  const [uploading, setUploading] = useState(false)

  const upload = useCallback(
    async (file: File, kind: Kind, workspaceId?: Id<"workspaces">): Promise<Id<"_storage">> => {
      if (kind !== "file" && !IMAGE_TYPES.includes(file.type)) throw new Error("Images must be PNG, JPG, GIF, WebP or AVIF")
      if (file.size > MAX[kind]) throw new Error(`That file is too large (max ${Math.round(MAX[kind] / MB)} MB)`)
      setUploading(true)
      try {
        let url: string
        try { url = await generateUploadUrl({ workspaceId }) } catch (e) { throw new Error(errMsg(e, "Couldn't start the upload")) }
        const res = await fetch(url, { method: "POST", headers: { "Content-Type": file.type || "application/octet-stream" }, body: file })
        if (!res.ok) throw new Error("Upload failed. Check your connection and try again.")
        const { storageId } = (await res.json()) as { storageId: Id<"_storage"> }
        let result: Awaited<ReturnType<typeof register>>
        try { result = await register({ storageId, workspaceId, kind }) } catch (e) { throw new Error(errMsg(e, "That file couldn't be accepted")) }
        if (!result.ok) throw new Error(result.error)
        return storageId
      } finally {
        setUploading(false)
      }
    },
    [generateUploadUrl, register]
  )
  return { upload, uploading }
}

// Profile and workspace photos (not counted against workspace storage).
export const usePhotoUpload = () => {
  const { upload, uploading } = useUploader()
  const photo = useCallback((file: File) => upload(file, "avatar"), [upload])
  return { upload: photo, uploading }
}
