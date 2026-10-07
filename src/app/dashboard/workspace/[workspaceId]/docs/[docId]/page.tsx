"use client"

import { useParams, useRouter, useSearchParams } from "next/navigation"
import { useCurrentMember } from "@/features/members/api/use-current-member"
import { useGetMembers } from "@/features/members/api/use-get-members"
import { useGetChannels } from "@/features/channels/api/use-get-channels"
import { useWorkspaceId } from "@/hooks/use-workspace-id"

import { Button } from "@/components/ui/button"
import {
    DropdownMenu, DropdownMenuContent,
    DropdownMenuTrigger
} from "@/components/ui/dropdown-menu"
import {
    Select, SelectContent, SelectItem,
    SelectTrigger, SelectValue
} from "@/components/ui/select"
import { toast } from "sonner"
import { FileText, FileSpreadsheet, Download, Share2, ArrowLeft, Loader } from "lucide-react"
import { useMutation } from "convex/react"
import { api } from "../../../../../../../convex/_generated/api"
import { Id } from "../../../../../../../convex/_generated/dataModel"
import { useCallback, useState } from "react"
import { Input } from "@/components/ui/input"
import { useRenameDoc } from "@/features/docs/use-rename-doc"
import { useGetDocs } from "@/features/docs/use-get-docs"
import dynamic from "next/dynamic"

// TipTap + Liveblocks are heavy; load them only on the editor screen.
const DocEditor = dynamic(() => import("../components/doc-editor").then((m) => m.DocEditor), {
    ssr: false,
    loading: () => <div className="flex h-full items-center justify-center"><Loader className="size-6 animate-spin text-[#ff5018]" /></div>,
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
    const template = searchParams.get("t")
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

    const handleShare = async () => {
        if (!shareChannelId || !doc) return

        const docUrl = `${window.location.origin}/dashboard/workspace/${workspaceId}/docs/${doc._id}`
        const body = JSON.stringify({
            ops: [
                { insert: `📄 ${currentUserName} shared a document: ` },
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
            <div className="h-full flex items-center justify-center bg-[#fbf9f7]">
                <Loader className="size-5 animate-spin text-[#ff5018]" />
            </div>
        )
    }

    if (!doc) {
        return (
            <div className="h-full flex flex-col items-center justify-center gap-3 bg-[#fbf9f7] px-4">
                <div className="size-14 rounded-2xl bg-[#ff5018]/10 text-[#ff5018] flex items-center justify-center">
                    <FileText className="size-6" />
                </div>
                <p className="text-sm font-semibold tracking-tight text-[#1b1017] text-center">Document not found</p>
                <Button
                    size="sm"
                    className="bg-[#ff5018] hover:bg-[#e6430f] text-white rounded-lg font-semibold"
                    onClick={() => router.push(`/dashboard/workspace/${workspaceId}/docs`)}
                >
                    <ArrowLeft className="size-4 mr-1" /> Back to Docs
                </Button>
            </div>
        )
    }

    return (
        <div className="h-full flex flex-col overflow-hidden bg-[#fbf9f7]">
            {/* Header */}
            <div className="flex items-center justify-between px-3 sm:px-6 h-14 border-b border-[#381d2a]/12 bg-white shrink-0 gap-2">
                <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
                    <Button
                        variant="ghost"
                        size="sm"
                        aria-label="Back to docs"
                        className="h-8 text-xs gap-1 rounded-lg text-[#1b1017]/60 hover:text-[#1b1017] hover:bg-[#f3eeea] px-2 shrink-0"
                        onClick={() => router.push(`/dashboard/workspace/${workspaceId}/docs`)}
                    >
                        <ArrowLeft className="size-3 sm:size-3.5" /> 
                        <span className="hidden xs:inline">Docs</span>
                    </Button>
                    <span className="text-[#1b1017]/30 hidden xs:inline">/</span>
                    <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
                        <div className={`size-5 sm:size-6 rounded-md flex items-center justify-center shrink-0 ${doc.type === "spreadsheet" ? "bg-green-50" : "bg-[#ff5018]/10"}`}>
                            {doc.type === "spreadsheet"
                                ? <FileSpreadsheet className="size-3 sm:size-3.5 text-green-700" />
                                : <FileText className="size-3 sm:size-3.5 text-[#ff5018]" />
                            }
                        </div>
                        {editingTitle ? (
                            <Input aria-label="Document title"
                                autoFocus
                                value={titleDraft}
                                maxLength={120}
                                onChange={(e) => setTitleDraft(e.target.value)}
                                onBlur={saveTitle}
                                onKeyDown={(e) => {
                                    if (e.key === "Enter") saveTitle()
                                    if (e.key === "Escape") setEditingTitle(false)
                                }}
                                className="h-8 w-48 sm:w-72 text-sm font-semibold rounded-lg"
                            />
                        ) : (
                            <button
                                title="Rename"
                                aria-label={`Rename document: ${doc.title}`}
                                onClick={() => { setTitleDraft(doc.title); setEditingTitle(true) }}
                                className="text-sm font-semibold tracking-tight text-[#1b1017] truncate rounded-md px-1.5 py-0.5 hover:bg-[#f3eeea]"
                            >
                                {doc.title}
                            </button>
                        )}
                    </div>
                </div>
                <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                    <DropdownMenu open={showShareDialog} onOpenChange={setShowShareDialog}>
                        <DropdownMenuTrigger asChild>
                            <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5 px-3 rounded-lg border-[#381d2a]/15 hover:bg-[#f3eeea]">
                                <Share2 className="size-3 sm:size-3.5" /> 
                                <span className="hidden xs:inline">Share</span>
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-52 sm:w-56 p-3 rounded-xl border-[#381d2a]/12">
                            <p className="text-xs font-semibold tracking-tight text-[#1b1017] mb-2">Share to channel</p>
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
                                className="w-full h-8 text-xs rounded-lg font-semibold bg-[#ff5018] hover:bg-[#e6430f] text-white"
                            >
                                Share
                            </Button>
                        </DropdownMenuContent>
                    </DropdownMenu>

                    <Button
                        onClick={handleDownloadPdf}
                        variant="outline"
                        size="sm"
                        className="h-8 text-xs gap-1.5 px-3 rounded-lg border-[#381d2a]/15 hover:bg-[#f3eeea]"
                    >
                        <Download className="size-3 sm:size-3.5" /> 
                        <span className="hidden xs:inline">PDF</span>
                    </Button>
                </div>
            </div>

            {/* Editor */}
            <div className="flex-1 overflow-hidden">
                <DocEditor
                    key={doc._id}
                    docId={doc._id}
                    template={template}
                    onTemplateUsed={clearTemplate}
                    roomId={doc.liveblocksRoomId}
                    userId={currentMember._id}
                    userName={currentUserName}
                    userColor={userColor}
                    userAvatar={currentUserAvatar}
                />
            </div>
        </div>
    )
}