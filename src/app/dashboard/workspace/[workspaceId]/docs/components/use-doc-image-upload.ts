"use client"

import { useCallback } from "react"
import { useConvex, useMutation } from "convex/react"
import { toast } from "sonner"
import { api } from "../../../../../../../convex/_generated/api"
import type { Id } from "../../../../../../../convex/_generated/dataModel"

// Uploads an image to Convex storage and returns its URL (or null after showing an error).
// Used by the toolbar button and by paste / drag-and-drop in the editor.
export const useDocImageUpload = () => {
    const generateUploadUrl = useMutation(api.upload.generateUploadUrl)
    const convex = useConvex()

    return useCallback(async (file: File): Promise<string | null> => {
        if (!file.type.startsWith("image/")) {
            toast.error("Please choose an image file")
            return null
        }
        if (file.size > 8 * 1024 * 1024) {
            toast.error("Image is too large (max 8 MB)")
            return null
        }
        const toastId = toast.loading("Uploading image...")
        try {
            const uploadUrl = await generateUploadUrl()
            const res = await fetch(uploadUrl, { method: "POST", headers: { "Content-Type": file.type }, body: file })
            if (!res.ok) throw new Error("upload failed")
            const { storageId } = await res.json()
            const src = await convex.query(api.upload.getStorageUrl, { storageId: storageId as Id<"_storage"> })
            if (!src) throw new Error("no url")
            toast.success("Image added", { id: toastId })
            return src
        } catch {
            toast.error("Failed to upload image", { id: toastId })
            return null
        }
    }, [generateUploadUrl, convex])
}
