"use client"

import { Editor } from "@tiptap/react"
import { cn } from "@/lib/utils"
import { useRef, useState, useEffect } from "react"
import { useMutation, useQuery } from "convex/react"

import { toast } from "sonner"
import {
    Bold, Italic, Underline, Strikethrough, AlignLeft, AlignCenter,
    AlignRight, List, ListOrdered, ImageIcon, Table, Undo, Redo,
    Code, Plus, Trash2,
    ArrowLeftFromLine, ArrowRightFromLine, ArrowUpFromLine, ArrowDownFromLine,
    Merge, Split
} from "lucide-react"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
    DropdownMenuSeparator,
    DropdownMenuLabel
} from "@/components/ui/dropdown-menu"
import { api } from "../../../../../../../convex/_generated/api"

interface DocToolbarProps {
    editor: Editor
}

const ToolbarButton = ({
    onClick, active, disabled, children, title
}: {
    onClick: () => void
    active?: boolean
    disabled?: boolean
    children: React.ReactNode
    title?: string
}) => (
    <button
        onClick={onClick}
        disabled={disabled}
        title={title}
        className={cn(
            "p-1.5 rounded text-sm transition-colors hover:bg-muted min-w-7 flex items-center justify-center",
            active && "bg-muted text-[#ff5018]",
            disabled && "opacity-40 cursor-not-allowed"
        )}
    >
        {children}
    </button>
)

const Divider = () => <div className="w-px h-5 bg-border mx-1" />

export const DocToolbar = ({ editor }: DocToolbarProps) => {
    const imageInputRef = useRef<HTMLInputElement>(null)
    const generateUploadUrl = useMutation(api.upload.generateUploadUrl)
    const [pendingStorageId, setPendingStorageId] = useState<string | null>(null)

    const storageUrl = useQuery(
        api.upload.getStorageUrl,
        pendingStorageId ? { storageId: pendingStorageId as any } : "skip"
    )

    useEffect(() => {
        if (storageUrl && pendingStorageId) {
            editor.chain().focus().setImage({ src: storageUrl }).run()
            setPendingStorageId(null)
            toast.dismiss()
            toast.success("Image uploaded!")
        }
    }, [storageUrl, pendingStorageId, editor])

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        try {
            toast.loading("Uploading image...")
            const reader = new FileReader()
            reader.onload = (event) => {
                const base64 = event.target?.result as string
                editor.chain().focus().setImage({ src: base64 }).run()
                toast.dismiss()
                toast.success("Image uploaded!")
            }
            reader.readAsDataURL(file)
        } catch (e) {
            toast.dismiss()
            toast.error("Failed to upload image")
        }

        if (imageInputRef.current) imageInputRef.current.value = ""
    }

    const addTable = () => {
        editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()
    }

    return (
        <div className="flex items-center gap-0.5 px-3 py-1.5 border-b bg-white flex-wrap sticky top-0 z-10 shadow-sm">
            {/* Hidden image input */}
            <input
                ref={imageInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleImageUpload}
            />

            {/* Undo/Redo */}
            <ToolbarButton onClick={() => editor.chain().focus().undo().run()} title="Undo">
                <Undo className="size-4" />
            </ToolbarButton>
            <ToolbarButton onClick={() => editor.chain().focus().redo().run()} title="Redo">
                <Redo className="size-4" />
            </ToolbarButton>

            <Divider />

            {/* Headings */}
            <ToolbarButton
                onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
                active={editor.isActive("heading", { level: 1 })}
                title="Heading 1"
            >
                <span className="text-xs font-bold">H1</span>
            </ToolbarButton>
            <ToolbarButton
                onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
                active={editor.isActive("heading", { level: 2 })}
                title="Heading 2"
            >
                <span className="text-xs font-bold">H2</span>
            </ToolbarButton>
            <ToolbarButton
                onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
                active={editor.isActive("heading", { level: 3 })}
                title="Heading 3"
            >
                <span className="text-xs font-bold">H3</span>
            </ToolbarButton>

            <Divider />

            {/* Text formatting */}
            <ToolbarButton
                onClick={() => editor.chain().focus().toggleBold().run()}
                active={editor.isActive("bold")}
                title="Bold"
            >
                <Bold className="size-4" />
            </ToolbarButton>
            <ToolbarButton
                onClick={() => editor.chain().focus().toggleItalic().run()}
                active={editor.isActive("italic")}
                title="Italic"
            >
                <Italic className="size-4" />
            </ToolbarButton>
            <ToolbarButton
                onClick={() => editor.chain().focus().toggleUnderline().run()}
                active={editor.isActive("underline")}
                title="Underline"
            >
                <Underline className="size-4" />
            </ToolbarButton>
            <ToolbarButton
                onClick={() => editor.chain().focus().toggleStrike().run()}
                active={editor.isActive("strike")}
                title="Strikethrough"
            >
                <Strikethrough className="size-4" />
            </ToolbarButton>
            <ToolbarButton
                onClick={() => editor.chain().focus().toggleCode().run()}
                active={editor.isActive("code")}
                title="Inline code"
            >
                <Code className="size-4" />
            </ToolbarButton>

            <Divider />

            {/* Alignment */}
            <ToolbarButton
                onClick={() => editor.chain().focus().setTextAlign("left").run()}
                active={editor.isActive({ textAlign: "left" })}
                title="Align left"
            >
                <AlignLeft className="size-4" />
            </ToolbarButton>
            <ToolbarButton
                onClick={() => editor.chain().focus().setTextAlign("center").run()}
                active={editor.isActive({ textAlign: "center" })}
                title="Align center"
            >
                <AlignCenter className="size-4" />
            </ToolbarButton>
            <ToolbarButton
                onClick={() => editor.chain().focus().setTextAlign("right").run()}
                active={editor.isActive({ textAlign: "right" })}
                title="Align right"
            >
                <AlignRight className="size-4" />
            </ToolbarButton>

            <Divider />

            {/* Lists */}
            <ToolbarButton
                onClick={() => editor.chain().focus().toggleBulletList().run()}
                active={editor.isActive("bulletList")}
                title="Bullet list"
            >
                <List className="size-4" />
            </ToolbarButton>
            <ToolbarButton
                onClick={() => editor.chain().focus().toggleOrderedList().run()}
                active={editor.isActive("orderedList")}
                title="Ordered list"
            >
                <ListOrdered className="size-4" />
            </ToolbarButton>

            <Divider />

            {/* Image upload */}
            <ToolbarButton
                onClick={() => imageInputRef.current?.click()}
                title="Upload image"
            >
                <ImageIcon className="size-4" />
            </ToolbarButton>

            {/* Table dropdown */}
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <button
                        className={cn(
                            "p-1.5 rounded text-sm transition-colors hover:bg-muted flex items-center gap-1",
                            editor.isActive("table") && "bg-muted text-[#ff5018]"
                        )}
                        title="Table options"
                    >
                        <Table className="size-4" />
                    </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="text-xs w-48">
                    <DropdownMenuLabel className="text-[10px] text-muted-foreground">Insert</DropdownMenuLabel>
                    <DropdownMenuItem onClick={addTable}>
                        <Plus className="size-3.5 mr-2" /> Insert Table
                    </DropdownMenuItem>

                    <DropdownMenuSeparator />
                    <DropdownMenuLabel className="text-[10px] text-muted-foreground">Columns</DropdownMenuLabel>
                    <DropdownMenuItem
                        onClick={() => editor.chain().focus().addColumnBefore().run()}
                        disabled={!editor.can().addColumnBefore()}
                    >
                        <ArrowLeftFromLine className="size-3.5 mr-2" /> Add column before
                    </DropdownMenuItem>
                    <DropdownMenuItem
                        onClick={() => editor.chain().focus().addColumnAfter().run()}
                        disabled={!editor.can().addColumnAfter()}
                    >
                        <ArrowRightFromLine className="size-3.5 mr-2" /> Add column after
                    </DropdownMenuItem>
                    <DropdownMenuItem
                        onClick={() => editor.chain().focus().deleteColumn().run()}
                        disabled={!editor.can().deleteColumn()}
                        className="text-destructive"
                    >
                        <Trash2 className="size-3.5 mr-2" /> Delete column
                    </DropdownMenuItem>

                    <DropdownMenuSeparator />
                    <DropdownMenuLabel className="text-[10px] text-muted-foreground">Rows</DropdownMenuLabel>
                    <DropdownMenuItem
                        onClick={() => editor.chain().focus().addRowBefore().run()}
                        disabled={!editor.can().addRowBefore()}
                    >
                        <ArrowUpFromLine className="size-3.5 mr-2" /> Add row before
                    </DropdownMenuItem>
                    <DropdownMenuItem
                        onClick={() => editor.chain().focus().addRowAfter().run()}
                        disabled={!editor.can().addRowAfter()}
                    >
                        <ArrowDownFromLine className="size-3.5 mr-2" /> Add row after
                    </DropdownMenuItem>
                    <DropdownMenuItem
                        onClick={() => editor.chain().focus().deleteRow().run()}
                        disabled={!editor.can().deleteRow()}
                        className="text-destructive"
                    >
                        <Trash2 className="size-3.5 mr-2" /> Delete row
                    </DropdownMenuItem>

                    <DropdownMenuSeparator />
                    <DropdownMenuLabel className="text-[10px] text-muted-foreground">Cells</DropdownMenuLabel>
                    <DropdownMenuItem
                        onClick={() => editor.chain().focus().mergeCells().run()}
                        disabled={!editor.can().mergeCells()}
                    >
                        <Merge className="size-3.5 mr-2" /> Merge cells
                    </DropdownMenuItem>
                    <DropdownMenuItem
                        onClick={() => editor.chain().focus().splitCell().run()}
                        disabled={!editor.can().splitCell()}
                    >
                        <Split className="size-3.5 mr-2" /> Split cell
                    </DropdownMenuItem>
                    <DropdownMenuItem
                        onClick={() => editor.chain().focus().toggleHeaderRow().run()}
                        disabled={!editor.can().toggleHeaderRow()}
                    >
                        Header row
                    </DropdownMenuItem>
                    <DropdownMenuItem
                        onClick={() => editor.chain().focus().toggleHeaderColumn().run()}
                        disabled={!editor.can().toggleHeaderColumn()}
                    >
                        Header column
                    </DropdownMenuItem>

                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                        onClick={() => editor.chain().focus().deleteTable().run()}
                        disabled={!editor.can().deleteTable()}
                        className="text-destructive"
                    >
                        <Trash2 className="size-3.5 mr-2" /> Delete table
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>

            <Divider />

            {/* Text color */}
            <input
                type="color"
                onChange={(e) => editor.chain().focus().setColor(e.target.value).run()}
                value={editor.getAttributes("textStyle").color ?? "#000000"}
                className="w-6 h-6 rounded cursor-pointer border border-muted bg-transparent"
                title="Text color"
            />
        </div>
    )
}