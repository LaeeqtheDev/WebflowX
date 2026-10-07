"use client"
/* eslint-disable @next/next/no-img-element */
import { Download } from "lucide-react"
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"

export const canPreview = (type?: string | null) =>
    !!type && (type.startsWith("image/") || type === "application/pdf" || type.startsWith("video/") || type.startsWith("audio/"))

interface Props {
    open: boolean
    onOpenChange: (open: boolean) => void
    url: string
    name: string
    type?: string | null
}

// Opens a file in place: images, PDFs, video and audio. Everything else downloads.
export const AttachmentPreview = ({ open, onOpenChange, url, name, type }: Props) => (
    <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="flex max-h-[92dvh] w-[min(96vw,64rem)] max-w-none flex-col gap-3 rounded-2xl bg-cream p-4 sm:max-w-5xl">
            <div className="flex items-center gap-3 pr-8">
                <DialogTitle className="min-w-0 flex-1 truncate text-base font-semibold tracking-tight">{name}</DialogTitle>
                <Button asChild variant="outline" size="sm" className="shrink-0">
                    <a href={url} download={name} target="_blank" rel="noopener noreferrer"><Download className="mr-2 size-4" /> Download</a>
                </Button>
            </div>
            <DialogDescription className="sr-only">Preview of {name}</DialogDescription>
            <div className="flex min-h-0 flex-1 items-center justify-center overflow-auto rounded-xl bg-surface">
                {type?.startsWith("image/") ? (
                    <img src={url} alt={name} referrerPolicy="no-referrer" className="max-h-[78dvh] max-w-full object-contain" />
                ) : type === "application/pdf" ? (
                    <iframe src={url} title={name} className="h-[78dvh] w-full rounded-xl" />
                ) : type?.startsWith("video/") ? (
                    <video src={url} controls className="max-h-[78dvh] max-w-full" preload="metadata" />
                ) : type?.startsWith("audio/") ? (
                    <audio src={url} controls className="my-10 w-full max-w-md" preload="metadata" />
                ) : (
                    <p className="p-10 text-sm text-ink/60">This file type can&apos;t be previewed. Use Download to open it.</p>
                )}
            </div>
        </DialogContent>
    </Dialog>
)
