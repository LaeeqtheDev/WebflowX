"use client"
import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useQuery } from "convex/react"
import { Hash } from "lucide-react"
import {
    Home20Regular, Chat20Regular, Alert20Regular, TaskListSquareLtr20Regular, Notebook20Regular,
    DocumentText20Regular, Video20Regular, CommentMultiple20Regular, Send20Regular,
} from "@fluentui/react-icons"
import { FileSpreadsheet, Lock, Megaphone, Table2 } from "lucide-react"
import { CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { api } from "../../../../../../convex/_generated/api"
import { useWorkspaceId } from "@/hooks/use-workspace-id"
import { useGetChannels } from "@/features/channels/api/use-get-channels"
import { useGetMembers } from "@/features/members/api/use-get-members"
import { useCurrentMember } from "@/features/members/api/use-current-member"
import { useQuickSwitcher } from "@/features/workspaces/store/use-quick-switcher"
import { cleanChannelName } from "./channel-icon"

const SECTIONS = [
    { label: "Home", path: "", icon: Home20Regular },
    { label: "Direct messages", path: "/dms", icon: Chat20Regular },
    { label: "Activity", path: "/activity", icon: Alert20Regular },
    { label: "Threads", path: "/threads", icon: CommentMultiple20Regular },
    { label: "Drafts & sent", path: "/drafts", icon: Send20Regular },
    { label: "Tasks", path: "/tasks", icon: TaskListSquareLtr20Regular },
    { label: "Notes", path: "/notes", icon: Notebook20Regular },
    { label: "Docs", path: "/docs", icon: DocumentText20Regular },
    { label: "Meetings", path: "/meeting", icon: Video20Regular },
]

// Ctrl/Cmd+K jump-to box: channels, people and sections in one search. Also powers "New message".
export const QuickSwitcher = () => {
    const router = useRouter()
    const workspaceId = useWorkspaceId()
    const [{ open, mode }, setState] = useQuickSwitcher()
    const { data: channels } = useGetChannels({ workspaceId })
    const { data: members } = useGetMembers({ workspaceId })
    const { data: me } = useCurrentMember({ workspaceId })
    // pages are only fetched while the box is open
    const pages = useQuery(api.docs.get, open && mode === "all" ? { workspaceId } : "skip")

    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if (!(e.metaKey || e.ctrlKey) || e.key.toLowerCase() !== "k") return
            // Ctrl+K inserts a link while writing a message, so leave it to the editor
            if ((e.target as HTMLElement | null)?.closest?.(".ql-editor")) return
            e.preventDefault()
            setState((s) => ({ open: !s.open, mode: "all" }))
        }
        window.addEventListener("keydown", onKey)
        return () => window.removeEventListener("keydown", onKey)
    }, [setState])

    const go = (path: string) => {
        setState({ open: false, mode: "all" })
        router.push(`/dashboard/workspace/${workspaceId}${path}`)
    }

    const people = (members ?? []).filter((m) => m._id !== me?._id)

    return (
        <CommandDialog
            open={open}
            onOpenChange={(o) => setState({ open: o, mode: "all" })}
            title={mode === "dm" ? "New message" : "Jump to"}
            description="Search channels, people and pages"
            showCloseButton={false}
        >
            <CommandInput placeholder={mode === "dm" ? "Who do you want to message?" : "Jump to a channel, person or page…"} />
            <CommandList>
                <CommandEmpty>Nothing found.</CommandEmpty>
                {mode === "all" && (
                    <>
                        <CommandGroup heading="Channels">
                            {(channels ?? []).map((c) => {
                                const Icon = c.isPrivate ? Lock : c.readOnly ? Megaphone : Hash
                                return (
                                    <CommandItem key={c._id} value={`channel ${cleanChannelName(c.name)}`} onSelect={() => go(`/channel/${c._id}`)}>
                                        <Icon className="size-4 text-muted-foreground" aria-hidden />
                                        {cleanChannelName(c.name)}
                                    </CommandItem>
                                )
                            })}
                        </CommandGroup>
                    </>
                )}
                <CommandGroup heading="People">
                    {people.map((m) => (
                        <CommandItem key={m._id} value={`person ${m.user.name ?? ""} ${m.user.email ?? ""}`} onSelect={() => go(`/member/${m._id}`)}>
                            <Avatar className="size-5 rounded-md">
                                <AvatarImage className="rounded-md" src={m.user.image} alt="" />
                                <AvatarFallback className="rounded-md bg-[#ff5018] text-white text-[10px]">
                                    {(m.user.name ?? "?").charAt(0).toUpperCase()}
                                </AvatarFallback>
                            </Avatar>
                            {m.user.name}
                            {m.user.title ? <span className="ml-1 truncate text-xs text-muted-foreground">{m.user.title}</span> : null}
                        </CommandItem>
                    ))}
                </CommandGroup>
                {mode === "all" && (pages?.length ?? 0) > 0 && (
                    <CommandGroup heading="Pages">
                        {(pages ?? []).slice(0, 200).map((d) => (
                            <CommandItem key={d._id} value={`page ${d.title} ${d._id}`} onSelect={() => go(`/docs/${d._id}`)}>
                                {d.icon
                                    ? <span className="w-4 text-center text-sm leading-none" aria-hidden>{d.icon}</span>
                                    : d.type === "database" ? <Table2 className="size-4 text-muted-foreground" aria-hidden />
                                    : d.type === "spreadsheet" ? <FileSpreadsheet className="size-4 text-muted-foreground" aria-hidden />
                                    : <DocumentText20Regular className="size-4 text-muted-foreground" aria-hidden />}
                                <span className="truncate">{d.title || "Untitled"}</span>
                            </CommandItem>
                        ))}
                    </CommandGroup>
                )}
                {mode === "all" && (
                    <CommandGroup heading="Go to">
                        {SECTIONS.map((s) => (
                            <CommandItem key={s.label} value={`go ${s.label}`} onSelect={() => go(s.path)}>
                                <s.icon className="size-4 text-muted-foreground" aria-hidden />
                                {s.label}
                            </CommandItem>
                        ))}
                    </CommandGroup>
                )}
            </CommandList>
        </CommandDialog>
    )
}
