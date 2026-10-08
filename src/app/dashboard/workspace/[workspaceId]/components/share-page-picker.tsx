"use client"

import { useMemo, useState } from "react"
import { useQuery } from "convex/react"
import { Database, FileText, Search } from "lucide-react"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { RenderIcon } from "@/features/pages/page-icons"
import { useWorkspaceId } from "@/hooks/use-workspace-id"
import { api } from "../../../../../../convex/_generated/api"

// Pick an existing page or database from the workspace to drop into a message as a link.
export const SharePagePicker = ({
    children,
    onPick,
}: {
    children: React.ReactNode
    onPick: (page: { id: string; title: string; url: string }) => void
}) => {
    const workspaceId = useWorkspaceId()
    const [open, setOpen] = useState(false)
    const [q, setQ] = useState("")
    const pages = useQuery(api.docs.tree, open ? { workspaceId } : "skip")

    const list = useMemo(() => {
        const all = [...(pages ?? [])].sort((a, b) => b.updatedAt - a.updatedAt)
        const needle = q.trim().toLowerCase()
        return (needle ? all.filter((p) => p.title.toLowerCase().includes(needle)) : all).slice(0, 40)
    }, [pages, q])

    return (
        <Popover open={open} onOpenChange={(o) => { setOpen(o); if (!o) setQ("") }}>
            <PopoverTrigger asChild>{children}</PopoverTrigger>
            <PopoverContent align="start" className="w-80 p-0">
                <div className="flex items-center gap-2 border-b border-plum/12 px-3 py-2">
                    <Search className="size-4 text-ink/50" />
                    <input
                        autoFocus
                        value={q}
                        onChange={(e) => setQ(e.target.value)}
                        placeholder="Search pages to share…"
                        className="w-full bg-transparent text-sm text-ink outline-none placeholder:text-ink/45"
                    />
                </div>
                <div className="max-h-72 overflow-y-auto p-1">
                    {pages === undefined ? (
                        <p className="px-3 py-6 text-center text-xs text-ink/55">Loading…</p>
                    ) : list.length === 0 ? (
                        <p className="px-3 py-6 text-center text-xs text-ink/55">{q ? "No pages match." : "No pages yet. Create one in Docs."}</p>
                    ) : (
                        list.map((p) => (
                            <button
                                key={p._id}
                                type="button"
                                onClick={() => {
                                    onPick({ id: p._id, title: p.title || "Untitled", url: `${window.location.origin}/dashboard/workspace/${workspaceId}/docs/${p._id}` })
                                    setOpen(false)
                                }}
                                className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left hover:bg-[#ff5018]/10"
                            >
                                <span className="flex size-7 shrink-0 items-center justify-center rounded-md border border-plum/12 bg-cream-soft text-ink/70">
                                    {p.icon ? <RenderIcon value={p.icon} className="size-4" /> : p.type === "database" ? <Database className="size-4" /> : <FileText className="size-4" />}
                                </span>
                                <span className="min-w-0 flex-1 truncate text-sm font-medium text-ink">{p.title || "Untitled"}</span>
                                <span className="shrink-0 text-[10px] uppercase tracking-wide text-ink/45">{p.type === "database" ? "Database" : "Page"}</span>
                            </button>
                        ))
                    )}
                </div>
            </PopoverContent>
        </Popover>
    )
}
