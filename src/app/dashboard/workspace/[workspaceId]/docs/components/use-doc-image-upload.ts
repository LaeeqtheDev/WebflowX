"use client"

import { useCallback } from "react"
import { useConvex } from "convex/react"
import { toast } from "sonner"
import { useUploader } from "@/lib/upload-photo"
import { useWorkspaceId } from "@/hooks/use-workspace-id"
import { api } from "../../../../../../../convex/_generated/api"

// Uploads an image to Convex storage and returns its URL (or null after showing an error).
// Used by the toolbar button and by paste / drag-and-drop in the editor.
export const useDocImageUpload = () => {
    const { upload } = useUploader()
    const workspaceId = useWorkspaceId()
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
            const storageId = await upload(file, "doc", workspaceId)
            const src = await convex.query(api.upload.getStorageUrl, { storageId })
            if (!src) throw new Error("no url")
            toast.success("Image added", { id: toastId })
            return src
        } catch (e) {
            toast.error(e instanceof Error ? e.message : "Failed to upload image", { id: toastId })
            return null
        }
    }, [upload, workspaceId, convex])
}
