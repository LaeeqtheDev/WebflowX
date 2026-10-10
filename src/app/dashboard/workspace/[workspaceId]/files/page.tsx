"use client"
/* eslint-disable @next/next/no-img-element */

import { useDeferredValue, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { useQuery } from "convex/react"
import { format } from "date-fns"
import { Download, Eye, FileArchive, FileAudio, FileText, FileVideo, Files, Loader, MessageSquare, Search } from "lucide-react"
import { api } from "../../../../../../convex/_generated/api"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useWorkspaceId } from "@/hooks/use-workspace-id"
import { messageLink } from "@/features/messages/lib/message-link"
import { cn } from "@/lib/utils"
import { AttachmentPreview, canPreview } from "../components/attachment-preview"

type Category = "all" | "images" | "documents" | "media" | "other"
const CATEGORIES: { id: Category; label: string }[] = [
    { id: "all", label: "All" },
    { id: "images", label: "Images" },
    { id: "documents", label: "Documents" },
    { id: "media", label: "Audio & video" },
    { id: "other", label: "Other" },
]

const categoryOf = (type: string): Exclude<Category, "all"> => {
    if (type.startsWith("image/")) return "images"
    if (type.startsWith("audio/") || type.startsWith("video/")) return "media"
    if (type === "application/pdf" || type.includes("word") || type.includes("excel") || type.includes("spreadsheet") || type.includes("powerpoint") || type.includes("presentation") || type.startsWith("text/") || type === "application/json") return "documents"
    return "other"
}

const sizeLabel = (bytes: number) => {
    if (!bytes) return ""
    if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

const Icon = ({ type, className }: { type: string; className?: string }) =>
    type.startsWith("video/") ? <FileVideo className={className} /> :
    type.startsWith("audio/") ? <FileAudio className={className} /> :
    type.includes("zip") ? <FileArchive className={className} /> :
    <FileText className={className} />

const FilesPage = () => {
    const workspaceId = useWorkspaceId()
    const router = useRouter()
    const [search, setSearch] = useState("")
    const deferred = useDeferredValue(search)
    const [category, setCategory] = useState<Category>("all")
    const [preview, setPreview] = useState<{ url: string; name: string; type: string } | null>(null)

    const data = useQuery(api.attachments.list, { workspaceId, search: deferred.trim() || undefined })
    const shown = useMemo(() => (data ?? []).filter((f) => category === "all" || categoryOf(f.contentType) === category), [data, category])

    return (
        <div className="flex h-full min-h-0 flex-col bg-surface">
            {preview && <AttachmentPreview open onOpenChange={(o) => !o && setPreview(null)} url={preview.url} name={preview.name} type={preview.type} />}
            <div className="flex shrink-0 flex-wrap items-center gap-3 border-b border-plum/12 px-4 py-2.5">
                <Files className="size-5 text-brand" />
                <h1 className="text-lg font-semibold tracking-tight text-ink">Files</h1>
                <div className="relative ml-auto w-full sm:w-72">
                    <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink/45" />
                    <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by file name" aria-label="Search files by name" className="h-10 pl-9" />
                </div>
            </div>
            <div className="flex shrink-0 gap-1.5 overflow-x-auto border-b border-plum/12 px-4 py-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden" role="tablist" aria-label="File type">
                {CATEGORIES.map((c) => (
                    <button
                        key={c.id}
                        type="button"
                        role="tab"
                        aria-selected={category === c.id}
                        onClick={() => setCategory(c.id)}
                        className={cn("whitespace-nowrap rounded-full px-3 py-1.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/70",
                            category === c.id ? "bg-brand text-white" : "bg-cream text-ink/75 hover:bg-cream-deep2")}
                    >
                        {c.label}
                    </button>
                ))}
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto p-4">
                {data === undefined ? (
                    <div className="flex h-full items-center justify-center"><Loader className="size-6 animate-spin text-brand" /></div>
                ) : shown.length === 0 ? (
                    <div className="mx-auto flex max-w-sm flex-col items-center gap-3 py-20 text-center">
                        <div className="flex size-14 items-center justify-center rounded-2xl bg-brand/10 text-brand"><Files className="size-6" /></div>
                        <p className="font-semibold tracking-tight text-ink">{deferred ? "No files match that name" : "No files yet"}</p>
                        <p className="text-sm text-ink/60">{deferred ? "Try a different word." : "Files and images shared in channels and direct messages show up here."}</p>
                    </div>
                ) : (
                    <>
                        <ul className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">
                            {shown.map((f) => {
                                const openMessage = () => router.push(messageLink({ workspaceId, channelId: f.channelId, memberId: f.otherMemberId, messageId: f.messageId, parentMessageId: f.parentMessageId }))
                                return (
                                    <li key={f._id} className="group flex flex-col overflow-hidden rounded-xl border border-plum/12 bg-surface transition-shadow hover:shadow-md">
                                        <button
                                            type="button"
                                            onClick={() => canPreview(f.contentType) ? setPreview({ url: f.url, name: f.name, type: f.contentType }) : window.open(f.url, "_blank", "noopener,noreferrer")}
                                            aria-label={`${canPreview(f.contentType) ? "Preview" : "Open"} ${f.name}`}
                                            className="flex aspect-[4/3] items-center justify-center overflow-hidden bg-cream focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand/70"
                                        >
                                            {f.contentType.startsWith("image/") ? (
                                                <img src={f.url} alt="" loading="lazy" referrerPolicy="no-referrer" className="size-full object-cover" />
                                            ) : (
                                                <Icon type={f.contentType} className="size-10 text-brand" />
                                            )}
                                        </button>
                                        <div className="flex flex-1 flex-col gap-0.5 p-3">
                                            <p className="truncate text-sm font-medium text-ink" title={f.name}>{f.name}</p>
                                            <p className="truncate text-xs text-ink/60">{f.uploaderName} · {f.where}</p>
                                            <p className="text-xs text-ink/50">{format(f.createdAt, "MMM d, yyyy")}{f.size ? ` · ${sizeLabel(f.size)}` : ""}</p>
                                            <div className="mt-2 flex gap-1">
                                                {canPreview(f.contentType) && (
                                                    <Button type="button" variant="ghost" size="sm" aria-label="Preview" className="h-8 px-2" onClick={() => setPreview({ url: f.url, name: f.name, type: f.contentType })}><Eye className="size-4" /></Button>
                                                )}
                                                <Button asChild variant="ghost" size="sm" className="h-8 px-2"><a href={f.url} download={f.name} target="_blank" rel="noopener noreferrer" aria-label="Download"><Download className="size-4" /></a></Button>
                                                <Button type="button" variant="ghost" size="sm" aria-label="Go to message" className="h-8 px-2" onClick={openMessage}><MessageSquare className="size-4" /></Button>
                                            </div>
                                        </div>
                                    </li>
                                )
                            })}
                        </ul>
                        {(data?.length ?? 0) >= 100 && <p className="mt-4 text-center text-xs text-ink/55">Showing the 100 most recent. Search by name to find older files.</p>}
                    </>
                )}
            </div>
        </div>
    )
}

export default FilesPage
