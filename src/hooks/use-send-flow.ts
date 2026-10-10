"use client"
import { useCallback, useEffect, useRef, useState, type MutableRefObject } from "react"
import { toast } from "sonner"
import type Quill from "quill"
import { useLimitHandler } from "@/hooks/use-limit-handler"
import { NetworkError, clearDraft, type UploadProgress } from "@/lib/network"

type Upload = { name: string; progress: UploadProgress | null }

/**
 * The shared "send a message" flow for the channel, direct-message and thread boxes: locks the box while sending,
 * shows upload progress, offers Retry when the connection (not the content) was the problem, keeps the text if it
 * fails, and clears the saved draft only once the message has gone.
 */
export const useSendFlow = <A,>(
  editorRef: MutableRefObject<Quill | null>,
  draftKey: string,
  perform: (args: A, onProgress: (name: string, p: UploadProgress) => void) => Promise<void>,
) => {
  const [editorKey, setEditorKey] = useState(0)
  const [isPending, setIsPending] = useState(false)
  const [upload, setUpload] = useState<Upload | null>(null)
  const { handleLimitError } = useLimitHandler()
  const performRef = useRef(perform)
  const draftRef = useRef(draftKey)
  useEffect(() => { performRef.current = perform; draftRef.current = draftKey })

  const submit = useCallback(async function run(args: A): Promise<void> {
    try {
      setIsPending(true)
      editorRef.current?.enable(false)
      await performRef.current(args, (name, progress) => setUpload({ name, progress }))
      clearDraft(draftRef.current)
      setEditorKey((k) => k + 1)
    } catch (error) {
      if (error instanceof NetworkError) {
        toast.error(error.message, { duration: 12_000, action: { label: "Retry", onClick: () => { void run(args) } } })
      } else {
        handleLimitError(error, "Failed to send the message")
      }
    } finally {
      setIsPending(false)
      setUpload(null)
      editorRef.current?.enable(true)
    }
  }, [editorRef, handleLimitError])

  return { editorKey, isPending, upload, submit }
}
