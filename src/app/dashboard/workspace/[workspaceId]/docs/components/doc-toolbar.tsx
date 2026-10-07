"use client"

import { Editor } from "@tiptap/react"
import { cn } from "@/lib/utils"
import { useRef, useState } from "react"

import { toast } from "sonner"
import {
    Bold, Italic, Underline, Strikethrough, AlignLeft, AlignCenter,
    AlignRight, List, ListOrdered, ImageIcon, Table, Undo, Redo,
    Code, Plus, Trash2,
    ArrowLeftFromLine, ArrowRightFromLine, ArrowUpFromLine, ArrowDownFromLine,
    Merge, Split, Quote, SquareCode, Minus, ListChecks, Link2, Unlink, Sparkles, Loader2, RemoveFormatting
} from "lucide-react"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
    DropdownMenuSeparator,
    DropdownMenuLabel
} from "@/components/ui/dropdown-menu"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { useDocImageUpload } from "./use-doc-image-upload"

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
            "p-1.5 rounded-lg text-sm text-[#1b1017]/70 transition-colors hover:bg-[#f3eeea] hover:text-[#1b1017] min-w-8 h-8 flex items-center justify-center",
            active && "bg-[#ff5018]/10 text-[#ff5018] hover:bg-[#ff5018]/15 hover:text-[#ff5018]",
            disabled && "opacity-40 cursor-not-allowed"
        )}
    >
        {children}
    </button>
)

const Divider = () => <div className="w-px h-5 bg-[#381d2a]/12 mx-1.5" />

export const DocToolbar = ({ editor }: DocToolbarProps) => {
    const imageInputRef = useRef<HTMLInputElement>(null)
    const uploadImage = useDocImageUpload()
    const [linkOpen, setLinkOpen] = useState(false)
    const [linkUrl, setLinkUrl] = useState("")
    const [aiBusy, setAiBusy] = useState(false)

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (imageInputRef.current) imageInputRef.current.value = ""
        if (!file) return
        const src = await uploadImage(file)
        if (src) editor.chain().focus().setImage({ src }).run()
    }

    const applyLink = () => {
        const url = linkUrl.trim()
        if (!url) {
            editor.chain().focus().extendMarkRange("link").unsetLink().run()
        } else {
            const href = /^(https?:\/\/|mailto:)/i.test(url) ? url : `https://${url}`
            editor.chain().focus().extendMarkRange("link").setLink({ href }).run()
        }
        setLinkOpen(false)
    }

    const runAi = async (command: string) => {
        const { from, to, empty } = editor.state.selection
        if (empty) return toast.info("Select some text first, then pick an AI action")
        const text = editor.state.doc.textBetween(from, to, "\n")
        if (text.length > 12000) return toast.error("Selection is too long for AI (max ~12,000 characters)")
        setAiBusy(true)
        try {
            const res = await fetch("/api/ai-editor", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ text, command }),
            })
            const data = await res.json()
            if (!res.ok || !data.result) throw new Error(data.error || "AI request failed")
            editor.chain().focus().insertContentAt({ from, to }, data.result).run()
        } catch (e) {
            toast.error(e instanceof Error ? e.message : "AI request failed")
        } finally {
            setAiBusy(false)
        }
    }

    const addTable = () => {
        editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()
    }

    return (
        <div className="flex items-center gap-0.5 px-3 sm:px-4 py-2 bg-white overflow-x-auto sticky top-0 z-10 [&>*]:shrink-0">
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

            <ToolbarButton
                onClick={() => editor.chain().focus().toggleTaskList().run()}
                active={editor.isActive("taskList")}
                title="Checklist"
            >
                <ListChecks className="size-4" />
            </ToolbarButton>

            <Divider />

            {/* Blocks */}
            <ToolbarButton
                onClick={() => editor.chain().focus().toggleBlockquote().run()}
                active={editor.isActive("blockquote")}
                title="Quote"
            >
                <Quote className="size-4" />
            </ToolbarButton>
            <ToolbarButton
                onClick={() => editor.chain().focus().toggleCodeBlock().run()}
                active={editor.isActive("codeBlock")}
                title="Code block"
            >
                <SquareCode className="size-4" />
            </ToolbarButton>
            <ToolbarButton
                onClick={() => editor.chain().focus().setHorizontalRule().run()}
                title="Divider line"
            >
                <Minus className="size-4" />
            </ToolbarButton>

            {/* Link */}
            <Popover
                open={linkOpen}
                onOpenChange={(o) => {
                    setLinkOpen(o)
                    if (o) setLinkUrl((editor.getAttributes("link").href as string | undefined) ?? "")
                }}
            >
                <PopoverTrigger asChild>
                    <button
                        title="Link"
                        className={cn(
                            "p-1.5 rounded-lg text-sm text-[#1b1017]/70 transition-colors hover:bg-[#f3eeea] hover:text-[#1b1017] min-w-8 h-8 flex items-center justify-center",
                            editor.isActive("link") && "bg-[#ff5018]/10 text-[#ff5018]"
                        )}
                    >
                        <Link2 className="size-4" />
                    </button>
                </PopoverTrigger>
                <PopoverContent align="start" className="w-72 p-3 rounded-xl">
                    <form onSubmit={(e) => { e.preventDefault(); applyLink() }} className="flex flex-col gap-2">
                        <input
                            autoFocus
                            value={linkUrl}
                            onChange={(e) => setLinkUrl(e.target.value)}
                            placeholder="Paste a link…"
                            className="h-9 rounded-lg border border-[#381d2a]/15 px-3 text-sm focus:border-[#ff5018] focus:outline-none"
                        />
                        <div className="flex gap-2">
                            <button type="submit" className="h-8 flex-1 rounded-lg bg-[#ff5018] text-xs font-semibold text-white hover:bg-[#e6430f]">
                                {editor.isActive("link") ? "Update" : "Add link"}
                            </button>
                            {editor.isActive("link") && (
                                <button
                                    type="button"
                                    onClick={() => { editor.chain().focus().extendMarkRange("link").unsetLink().run(); setLinkOpen(false) }}
                                    className="flex h-8 items-center gap-1 rounded-lg border border-[#381d2a]/15 px-3 text-xs hover:bg-[#f3eeea]"
                                >
                                    <Unlink className="size-3.5" /> Remove
                                </button>
                            )}
                        </div>
                    </form>
                </PopoverContent>
            </Popover>

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
                            "p-1.5 rounded-lg text-sm text-[#1b1017]/70 transition-colors hover:bg-[#f3eeea] hover:text-[#1b1017] min-w-8 h-8 flex items-center justify-center gap-1",
                            editor.isActive("table") && "bg-[#ff5018]/10 text-[#ff5018] hover:bg-[#ff5018]/15 hover:text-[#ff5018]"
                        )}
                        title="Table options"
                    >
                        <Table className="size-4" />
                    </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="text-xs w-48 rounded-xl border-[#381d2a]/12">
                    <DropdownMenuLabel className="text-[11px] font-medium text-[#1b1017]/50">Insert</DropdownMenuLabel>
                    <DropdownMenuItem onClick={addTable}>
                        <Plus className="size-3.5 mr-2" /> Insert Table
                    </DropdownMenuItem>

                    <DropdownMenuSeparator />
                    <DropdownMenuLabel className="text-[11px] font-medium text-[#1b1017]/50">Columns</DropdownMenuLabel>
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
                    <DropdownMenuLabel className="text-[11px] font-medium text-[#1b1017]/50">Rows</DropdownMenuLabel>
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
                    <DropdownMenuLabel className="text-[11px] font-medium text-[#1b1017]/50">Cells</DropdownMenuLabel>
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

            <ToolbarButton
                onClick={() => editor.chain().focus().unsetAllMarks().clearNodes().run()}
                title="Clear formatting"
            >
                <RemoveFormatting className="size-4" />
            </ToolbarButton>

            <Divider />

            {/* AI writing helper */}
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <button
                        title="AI writing help (select text first)"
                        disabled={aiBusy}
                        className="h-8 flex items-center gap-1.5 rounded-lg px-2.5 text-xs font-semibold text-[#ff5018] bg-[#ff5018]/10 hover:bg-[#ff5018]/15 disabled:opacity-60"
                    >
                        {aiBusy ? <Loader2 className="size-3.5 animate-spin" /> : <Sparkles className="size-3.5" />} AI
                    </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="text-xs w-48 rounded-xl">
                    <DropdownMenuLabel className="text-[11px] font-medium text-[#1b1017]/50">On selected text</DropdownMenuLabel>
                    {([
                        ["improve", "Improve writing"],
                        ["grammar", "Fix grammar"],
                        ["shorter", "Make shorter"],
                        ["longer", "Make longer"],
                        ["formal", "Make formal"],
                        ["casual", "Make casual"],
                        ["summarize", "Summarize"],
                    ] as const).map(([cmd, label]) => (
                        <DropdownMenuItem key={cmd} onClick={() => runAi(cmd)}>{label}</DropdownMenuItem>
                    ))}
                </DropdownMenuContent>
            </DropdownMenu>

            <Divider />

            {/* Text color */}
            <input
                type="color"
                onChange={(e) => editor.chain().focus().setColor(e.target.value).run()}
                value={editor.getAttributes("textStyle").color ?? "#000000"}
                className="size-7 rounded-lg cursor-pointer border border-[#381d2a]/15 bg-transparent p-0.5"
                title="Text color"
            />
        </div>
    )
}