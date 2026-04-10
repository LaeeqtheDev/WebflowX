"use client"

import { useParams, useRouter } from "next/navigation"
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
import { useState } from "react"
import { useGetDocs } from "@/features/docs/use-get-docs"
import { DocEditor } from "../components/doc-editor"

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

    const handleDownloadPdf = () => {
        const content = document.querySelector(".ProseMirror")
        if (!content) return toast.error("Nothing to download")

        const printWindow = window.open("", "_blank")
        if (!printWindow) return

        printWindow.document.write(`
            <html>
                <head>
                    <title>${doc?.title ?? "Document"}</title>
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
                        blockquote { border-left: 3px solid #ddd; margin: 0; padding-left: 1em; color: #666; }
                        @media print { body { margin: 20px; } }
                    </style>
                </head>
                <body>
                    <h1>${doc?.title ?? "Document"}</h1>
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
            <div className="h-full flex items-center justify-center bg-gray-50">
                <Loader className="size-5 animate-spin text-[#ff5018]" />
            </div>
        )
    }

    if (!doc) {
        return (
            <div className="h-full flex flex-col items-center justify-center gap-3 text-muted-foreground bg-gray-50">
                <FileText className="size-10" />
                <p className="text-sm">Document not found</p>
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => router.push(`/dashboard/workspace/${workspaceId}/docs`)}
                >
                    <ArrowLeft className="size-4 mr-1" /> Back to Docs
                </Button>
            </div>
        )
    }

    return (
        <div className="h-full flex flex-col overflow-hidden bg-gray-50">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-3 border-b bg-white shrink-0 shadow-sm">
                <div className="flex items-center gap-3">
                    <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs gap-1 text-muted-foreground hover:text-foreground"
                        onClick={() => router.push(`/dashboard/workspace/${workspaceId}/docs`)}
                    >
                        <ArrowLeft className="size-3.5" /> Docs
                    </Button>
                    <span className="text-muted-foreground">/</span>
                    <div className="flex items-center gap-2">
                        <div className={`size-6 rounded flex items-center justify-center ${doc.type === "spreadsheet" ? "bg-green-50" : "bg-blue-50"}`}>
                            {doc.type === "spreadsheet"
                                ? <FileSpreadsheet className="size-3.5 text-green-600" />
                                : <FileText className="size-3.5 text-blue-500" />
                            }
                        </div>
                        <span className="text-sm font-semibold">{doc.title}</span>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <DropdownMenu open={showShareDialog} onOpenChange={setShowShareDialog}>
                        <DropdownMenuTrigger asChild>
                            <Button variant="outline" size="sm" className="h-7 text-xs gap-1.5">
                                <Share2 className="size-3.5" /> Share
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-56 p-3">
                            <p className="text-xs font-semibold mb-2">Share to channel</p>
                            <Select value={shareChannelId} onValueChange={setShareChannelId}>
                                <SelectTrigger className="h-7 text-xs mb-2">
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
                                className="w-full h-7 text-xs bg-[#ff5018]/80 hover:bg-[#ff5018] text-white"
                            >
                                Share
                            </Button>
                        </DropdownMenuContent>
                    </DropdownMenu>

                    <Button
                        onClick={handleDownloadPdf}
                        variant="outline"
                        size="sm"
                        className="h-7 text-xs gap-1.5"
                    >
                        <Download className="size-3.5" /> PDF
                    </Button>
                </div>
            </div>

            {/* Editor */}
            <div className="flex-1 overflow-hidden">
                <DocEditor
                    key={doc._id}
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