"use client"

import { useParams, useRouter, useSearchParams } from "next/navigation"
import { useCurrentMember } from "@/features/members/api/use-current-member"
import { useGetMembers } from "@/features/members/api/use-get-members"
import { useGetChannels } from "@/features/channels/api/use-get-channels"
import { useWorkspaceId } from "@/hooks/use-workspace-id"

import { Button } from "@/components/ui/button"
import {
    DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator,
    DropdownMenuTrigger
} from "@/components/ui/dropdown-menu"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { usePageTree, ancestorsOf } from "@/features/pages/use-page-tree"
import { PageIcon } from "@/features/pages/page-tree"
import { IconPicker } from "@/features/pages/page-icons"
import { NewPageDialog } from "@/features/pages/new-page-dialog"
import { friendlyError } from "@/hooks/use-limit-handler"
import {
    Select, SelectContent, SelectItem,
    SelectTrigger, SelectValue
} from "@/components/ui/select"
import { toast } from "sonner"
import { FileText, Download, Share2, ArrowLeft, Loader, Star, Plus, MoreHorizontal, ChevronRight, LayoutTemplate } from "lucide-react"
import { useMutation, useQuery } from "convex/react"
import { api } from "../../../../../../../convex/_generated/api"
import { Id } from "../../../../../../../convex/_generated/dataModel"
import { useCallback, useState } from "react"
import { Input } from "@/components/ui/input"
import { useRenameDoc } from "@/features/docs/use-rename-doc"
import { useGetDocs } from "@/features/docs/use-get-docs"
import dynamic from "next/dynamic"

const DatabaseView = dynamic(() => import("@/features/databases/database-view").then((m) => m.DatabaseView), {
    ssr: false,
    loading: () => <div className="flex h-full items-center justify-center"><Loader className="size-6 animate-spin text-brand" /></div>,
})

// TipTap + Liveblocks are heavy; load them only on the editor screen.
const DocEditor = dynamic(() => import("../components/doc-editor").then((m) => m.DocEditor), {
    ssr: false,
    loading: () => <div className="flex h-full items-center justify-center"><Loader className="size-6 animate-spin text-brand" /></div>,
})

const USER_COLORS = [
    "#ff5018", "#3b82f6", "#10b981", "#f59e0b",
    "#8b5cf6", "#ef4444", "#06b6d4", "#ec4899"
]

export default function DocPage() {
    const params = useParams()
    const router = useRouter()
    const workspaceId = useWorkspaceId()
    const docId = params.docId as string

    const { data: currentMember } = useCurrentMember({ workspaceId })
    const { data: members } = useGetMembers({ workspaceId })
    const { data: docs, isLoading } = useGetDocs({ workspaceId })
    const { data: channels } = useGetChannels({ workspaceId })
    const createMessage = useMutation(api.messages.create)

    const searchParams = useSearchParams()
    const tplId = searchParams.get("tpl")
    const template = tplId ? "custom" : searchParams.get("t")
    const tplHtml = useQuery(api.docs.templateHtml, tplId ? { id: tplId as Id<"docTemplates"> } : "skip")
    const { byId, favoriteSet } = usePageTree(workspaceId)
    const toggleFavorite = useMutation(api.docs.toggleFavorite)
    const setIcon = useMutation(api.docs.setIcon)
    const saveTemplate = useMutation(api.docs.saveTemplate)
    const [subOpen, setSubOpen] = useState(false)
    const [tplOpen, setTplOpen] = useState(false)
    const [tplName, setTplName] = useState("")
    const { mutate: renameDoc } = useRenameDoc()
    const [editingTitle, setEditingTitle] = useState(false)
    const [titleDraft, setTitleDraft] = useState("")
    const clearTemplate = useCallback(() => {
        router.replace(`/dashboard/workspace/${workspaceId}/docs/${docId}`)
    }, [router, workspaceId, docId])

    const [showShareDialog, setShowShareDialog] = useState(false)
    const [shareChannelId, setShareChannelId] = useState("")

    const doc = docs?.find(d => d._id === docId)
    const currentUserName = members?.find(m => m._id === currentMember?._id)?.user.name ?? "Anonymous"
    const currentUserAvatar = members?.find(m => m._id === currentMember?._id)?.user.image ?? ""
    const userColor = USER_COLORS[
        Math.abs(
            (currentMember?._id ?? "")
                .split("")
                .reduce((a, c) => a + c.charCodeAt(0), 0)
        ) % USER_COLORS.length
    ]

    const crumbs = ancestorsOf(byId, doc?._id)

    const saveTitle = () => {
        const t = titleDraft.trim()
        setEditingTitle(false)
        if (!doc || !t || t === doc.title) return
        renameDoc({ id: doc._id, title: t }, { onError: (e) => toast.error(e.message || "Couldn't rename") })
    }

    const esc = (str: string) =>
        str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;")

    const handleDownloadPdf = () => {
        const content = document.querySelector(".ProseMirror")
        if (!content) return toast.error("Nothing to download")

        const printWindow = window.open("", "_blank")
        if (!printWindow) return

        printWindow.document.write(`
            <html>
                <head>
                    <title>${esc(doc?.title ?? "Document")}</title>
                    <style>
                        body { font-family: Arial, sans-serif; margin: 40px; line-height: 1.6; color: #111; }
                        h1 { font-size: 2.5em; font-weight: bold; margin-bottom: 0.5em; }
                        h2 { font-size: 2em; font-weight: bold; margin-bottom: 0.5em; }
                        h3 { font-size: 1.5em; font-weight: bold; margin-bottom: 0.5em; }
                        p { margin-bottom: 0.75em; }
                        table { border-collapse: collapse; width: 100%; margin: 1em 0; }
                        td, th { border: 1px solid #ddd; padding: 8px; text-align: left; }
                        th { background-color: #f2f2f2; font-weight: bold; }
                        img { max-width: 100%; }
                        ul, ol { margin: 0.5em 0; padding-left: 2em; }
                        pre { background: #f4f4f4; padding: 1em; border-radius: 4px; }
                        code { background: #f4f4f4; padding: 2px 4px; border-radius: 2px; font-family: monospace; }
                        ul[data-type="taskList"] { list-style: none; padding-left: 0; }
                        ul[data-type="taskList"] li { display: flex; gap: 8px; }
                        blockquote { border-left: 3px solid #ddd; margin: 0; padding-left: 1em; color: #666; }
                        @media print { body { margin: 20px; } }
                    </style>
                </head>
                <body>
                    <h1>${esc(doc?.title ?? "Document")}</h1>
                    ${content.innerHTML}
                </body>
            </html>
        `)
        printWindow.document.close()
        printWindow.focus()
        setTimeout(() => {
            printWindow.print()
            printWindow.close()
        }, 500)
    }

    const handleSaveTemplate = async () => {
        if (!doc) return
        const pm = document.querySelector(".ProseMirror")
        if (!pm) return toast.error("Open the page first")
        const clone = pm.cloneNode(true) as HTMLElement
        clone.querySelectorAll(".collab-caret, .ProseMirror-trailingBreak, .ProseMirror-gapcursor").forEach((n) => n.remove())
        try {
            await saveTemplate({ workspaceId, name: tplName.trim() || doc.title, icon: doc.icon, html: clone.innerHTML })
            toast.success("Saved as a template")
            setTplOpen(false)
        } catch (e) {
            toast.error(friendlyError(e, "Couldn't save the template"))
        }
    }

    const handleShare = async () => {
        if (!shareChannelId || !doc) return

        const docUrl = `${window.location.origin}/dashboard/workspace/${workspaceId}/docs/${doc._id}`
        const body = JSON.stringify({
            ops: [
                { insert: `${currentUserName} shared a page: ` },
                { attributes: { link: docUrl }, insert: doc.title },
                { insert: "\n" }
            ]
        })

        try {
            await createMessage({
                workspaceId,
                channelId: shareChannelId as Id<"channels">,
                body,
            })
            toast.success("Shared to channel!")
            setShowShareDialog(false)
            setShareChannelId("")
        } catch (e) {
            toast.error("Failed to share")
        }
    }

    if (isLoading || !currentMember) {
        return (
            <div className="h-full flex items-center justify-center bg-cream-soft">
                <Loader className="size-5 animate-spin text-brand" />
            </div>
        )
    }

    if (!doc) {
        return (
            <div className="h-full flex flex-col items-center justify-center gap-3 bg-cream-soft px-4">
                <div className="size-14 rounded-2xl bg-brand/10 text-brand flex items-center justify-center">
                    <FileText className="size-6" />
                </div>
                <p className="text-sm font-semibold tracking-tight text-ink text-center">Document not found</p>
                <Button
                    size="sm"
                    className="bg-brand hover:bg-brand-hover text-white rounded-lg font-semibold"
                    onClick={() => router.push(`/dashboard/workspace/${workspaceId}/docs`)}
                >
                    <ArrowLeft className="size-4 mr-1" /> Back to Docs
                </Button>
            </div>
        )
    }

    return (
        <div className="h-full flex flex-col overflow-hidden bg-cream-soft">
            {/* Header */}
            <div className="flex items-center justify-between px-3 sm:px-6 h-14 border-b border-plum/12 bg-surface shrink-0 gap-2">
                <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
                    <nav aria-label="Breadcrumb" className="flex min-w-0 items-center gap-1 text-sm">
                        <button type="button" onClick={() => router.push(`/dashboard/workspace/${workspaceId}/docs`)}
                            className="hidden shrink-0 rounded-md px-1.5 py-1 text-xs text-ink/60 hover:bg-cream-deep hover:text-ink sm:block">
                            Pages
                        </button>
                        {crumbs.slice(0, -1).map((c) => (
                            <span key={c._id} className="hidden min-w-0 items-center gap-1 sm:flex">
                                <ChevronRight className="size-3 shrink-0 text-ink/30" />
                                <button type="button" onClick={() => router.push(`/dashboard/workspace/${workspaceId}/docs/${c._id}`)}
                                    className="flex max-w-[140px] items-center gap-1 truncate rounded-md px-1.5 py-1 text-xs text-ink/60 hover:bg-cream-deep hover:text-ink">
                                    <PageIcon node={c} className="size-3.5 text-[13px]" /> <span className="truncate">{c.title || "Untitled"}</span>
                                </button>
                            </span>
                        ))}
                        {crumbs.length > 1 && <ChevronRight className="hidden size-3 shrink-0 text-ink/30 sm:block" />}
                        <IconPicker value={doc.icon ?? null} onChange={(e) => void setIcon({ id: doc._id, icon: e })}>
                            <button type="button" aria-label="Change icon" className="flex size-7 shrink-0 items-center justify-center rounded-md hover:bg-cream-deep">
                                <PageIcon node={{ icon: doc.icon ?? null, type: doc.type }} className="size-4 text-base" />
                            </button>
                        </IconPicker>
                        {editingTitle ? (
                            <Input aria-label="Page title"
                                autoFocus
                                value={titleDraft}
                                maxLength={120}
                                onChange={(e) => setTitleDraft(e.target.value)}
                                onBlur={saveTitle}
                                onKeyDown={(e) => {
                                    if (e.key === "Enter") saveTitle()
                                    if (e.key === "Escape") setEditingTitle(false)
                                }}
                                className="h-8 w-44 sm:w-72 text-sm font-semibold rounded-lg"
                            />
                        ) : (
                            <button
                                title="Rename"
                                aria-label={`Rename page: ${doc.title}`}
                                onClick={() => { setTitleDraft(doc.title); setEditingTitle(true) }}
                                className="min-w-0 truncate rounded-md px-1.5 py-0.5 text-sm font-semibold tracking-tight text-ink hover:bg-cream-deep"
                            >
                                {doc.title}
                            </button>
                        )}
                    </nav>
                </div>
                <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                    <Button variant="ghost" size="sm" aria-label={favoriteSet.has(doc._id) ? "Remove from favorites" : "Add to favorites"} aria-pressed={favoriteSet.has(doc._id)}
                        className="h-8 w-8 rounded-lg p-0 hover:bg-cream-deep"
                        onClick={() => toggleFavorite({ id: doc._id }).catch((e) => toast.error(friendlyError(e, "Couldn't update favorites")))}>
                        <Star className={`size-4 ${favoriteSet.has(doc._id) ? "fill-brand text-brand" : "text-ink/55"}`} />
                    </Button>
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" aria-label="Page options" className="h-8 w-8 rounded-lg p-0 hover:bg-cream-deep">
                                <MoreHorizontal className="size-4 text-ink/60" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-52 text-sm">
                            <DropdownMenuItem onClick={() => setSubOpen(true)}><Plus className="mr-2 size-3.5" /> Add a sub-page</DropdownMenuItem>
                            {doc.type === "document" && (
                                <DropdownMenuItem onClick={() => { setTplName(doc.title); setTplOpen(true) }}>
                                    <LayoutTemplate className="mr-2 size-3.5" /> Save as template
                                </DropdownMenuItem>
                            )}
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => router.push(`/dashboard/workspace/${workspaceId}/docs`)}>
                                <ArrowLeft className="mr-2 size-3.5" /> All pages
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                    <DropdownMenu open={showShareDialog} onOpenChange={setShowShareDialog}>
                        <DropdownMenuTrigger asChild>
                            <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5 px-3 rounded-lg border-plum/15 hover:bg-cream-deep">
                                <Share2 className="size-3 sm:size-3.5" /> 
                                <span className="hidden xs:inline">Share</span>
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-52 sm:w-56 p-3 rounded-xl border-plum/12">
                            <p className="text-xs font-semibold tracking-tight text-ink mb-2">Share to channel</p>
                            <Select value={shareChannelId} onValueChange={setShareChannelId}>
                                <SelectTrigger aria-label="Channel to share to" className="h-8 text-xs mb-2 rounded-lg">
                                    <SelectValue placeholder="Select channel..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {channels?.map(c => (
                                        <SelectItem key={c._id} value={c._id} className="text-xs">
                                            # {c.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <Button
                                onClick={handleShare}
                                disabled={!shareChannelId}
                                className="w-full h-8 text-xs rounded-lg font-semibold bg-brand hover:bg-brand-hover text-white"
                            >
                                Share
                            </Button>
                        </DropdownMenuContent>
                    </DropdownMenu>

                    {doc.type !== "database" && <Button
                        onClick={handleDownloadPdf}
                        variant="outline"
                        size="sm"
                        className="h-8 text-xs gap-1.5 px-3 rounded-lg border-plum/15 hover:bg-cream-deep"
                    >
                        <Download className="size-3 sm:size-3.5" /> 
                        <span className="hidden xs:inline">PDF</span>
                    </Button>}
                </div>
            </div>

            {/* Sub-pages */}
            {(byId.get(doc._id)?.children.length ?? 0) > 0 && (
                <div className="flex shrink-0 flex-wrap items-center gap-1.5 border-b border-plum/12 bg-surface px-4 py-2 sm:px-6">
                    <span className="mr-1 text-[11px] font-semibold uppercase tracking-wide text-ink/45">Inside</span>
                    {byId.get(doc._id)!.children.map((c) => (
                        <button key={c._id} type="button" onClick={() => router.push(`/dashboard/workspace/${workspaceId}/docs/${c._id}`)}
                            className="flex max-w-[200px] items-center gap-1.5 rounded-lg border border-plum/12 bg-cream-soft px-2 py-1 text-xs text-ink hover:border-brand/40">
                            <PageIcon node={c} className="size-3.5 text-[13px]" /> <span className="truncate">{c.title || "Untitled"}</span>
                        </button>
                    ))}
                </div>
            )}

            {/* Body */}
            <div className="flex-1 overflow-hidden">
                {doc.type === "database" ? (
                    <DatabaseView docId={doc._id} />
                ) : tplId && tplHtml === undefined ? (
                    <div className="flex h-full items-center justify-center"><Loader className="size-5 animate-spin text-brand" /></div>
                ) : (
                    <DocEditor
                        key={doc._id}
                        docId={doc._id}
                        template={template}
                        customHtml={tplHtml}
                        onTemplateUsed={clearTemplate}
                        roomId={doc.liveblocksRoomId}
                        userId={currentMember._id}
                        userName={currentUserName}
                        userColor={userColor}
                        userAvatar={currentUserAvatar}
                    />
                )}
            </div>

            <NewPageDialog open={subOpen} onOpenChange={setSubOpen} parentId={doc._id} />

            <Dialog open={tplOpen} onOpenChange={setTplOpen}>
                <DialogContent className="mx-4 max-w-sm rounded-2xl border-plum/12">
                    <DialogHeader>
                        <DialogTitle className="text-[17px] font-semibold tracking-tight">Save as template</DialogTitle>
                        <DialogDescription className="text-sm text-ink/60">Anyone in the workspace can start a new page from it. Comments and live cursors are not included.</DialogDescription>
                    </DialogHeader>
                    <Input aria-label="Template name" value={tplName} maxLength={120} onChange={(e) => setTplName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleSaveTemplate()} className="h-10 rounded-lg" />
                    <div className="flex justify-end gap-2">
                        <Button variant="outline" onClick={() => setTplOpen(false)}>Cancel</Button>
                        <Button className="bg-brand text-white hover:bg-brand-hover" onClick={handleSaveTemplate}>Save template</Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    )
}