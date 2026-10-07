"use client"
import { useCallback, useState } from "react"
import { useMutation } from "convex/react"
import { api } from "../../convex/_generated/api"
import { Id } from "../../convex/_generated/dataModel"

const MAX_BYTES = 5 * 1024 * 1024

// Uploads an image to Convex storage and returns its storage id.
export const usePhotoUpload = () => {
  const generateUploadUrl = useMutation(api.upload.generateUploadUrl)
  const [uploading, setUploading] = useState(false)

  const upload = useCallback(async (file: File): Promise<Id<"_storage">> => {
    if (!file.type.startsWith("image/")) throw new Error("Please choose an image file")
    if (file.size > MAX_BYTES) throw new Error("Image must be under 5 MB")
    setUploading(true)
    try {
      const url = await generateUploadUrl()
      const res = await fetch(url, { method: "POST", headers: { "Content-Type": file.type }, body: file })
      if (!res.ok) throw new Error("Upload failed")
      const { storageId } = await res.json()
      return storageId as Id<"_storage">
    } finally {
      setUploading(false)
    }
  }, [generateUploadUrl])

  return { upload, uploading }
}
