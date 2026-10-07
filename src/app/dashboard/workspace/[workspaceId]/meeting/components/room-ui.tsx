"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { Track, RoomEvent, Participant } from "livekit-client"
import {
    useTracks,
    useParticipants,
    useLocalParticipant,
    useRoomContext,
    useTrackToggle,
    useIsSpeaking,
    useIsMuted,
    useChat,
    VideoTrack,
    MediaDeviceMenu,
    RoomAudioRenderer,
    isTrackReference,
    TrackReferenceOrPlaceholder,
} from "@livekit/components-react"
import {
    Mic, MicOff, Video, VideoOff, MonitorUp, MonitorOff, MessageSquare, Users, PhoneOff,
    ChevronUp, MoreVertical, Pin, PinOff, Crown, Send, X, UserMinus, VolumeX, AlertCircle, Loader2, ChevronDown,
} from "lucide-react"
import { toast } from "sonner"
import { useQuery } from "convex/react"
import { api } from "../../../../../../../convex/_generated/api"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
    DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"

type Status = "starting" | "recording" | "error"
export type ModerateAction = "mute" | "stopVideo" | "muteAll" | "kick" | "endAll"

interface Props {
    roomName: string
    title: string
    startedAt: number
    status: Status
    errorMessage: string
    onRetry?: () => void
}

const COLORS = ["#ff5018", "#8b5cf6", "#0ea5e9", "#10b981", "#f59e0b", "#ec4899", "#14b8a6"]
const colorFor = (s: string) => {
    let h = 0
    for (const c of s) h = (h * 31 + c.charCodeAt(0)) >>> 0
    return COLORS[h % COLORS.length]
}
const initials = (name: string) =>
    name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]?.toUpperCase()).join("") || "?"
const isHostParticipant = (p: Participant) => {
    try { return !!JSON.parse(p.metadata || "{}").host } catch { return false }
}
const pad = (n: number) => String(n).padStart(2, "0")

// ---------------------------------------------------------------------------------------------

async function moderateRequest(room: string, action: ModerateAction, identity?: string) {
    try {
        const res = await fetch("/api/livekit/moderate", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ room, action, identity }),
        })
        const data = await res.json().catch(() => ({}))
        if (!res.ok) throw new Error(data.error || "Action failed")
        return true
    } catch (e) {
        toast.error(e instanceof Error ? e.message : "Action failed")
        return false
    }
}

// ---------------------------------------------------------------------------------------------

function Tile({
    trackRef, amHost, roomName, pinned, onPin, onKick, className,
}: {
    trackRef: TrackReferenceOrPlaceholder
    amHost: boolean
    roomName: string
    pinned: boolean
    onPin: () => void
    onKick: (p: Participant) => void
    className?: string
}) {
    const p = trackRef.participant
    const name = p.name || p.identity
    const speaking = useIsSpeaking(p)
    const micMuted = useIsMuted({ participant: p, source: Track.Source.Microphone })
    const isScreen = trackRef.source === Track.Source.ScreenShare
    const hasVideo = isTrackReference(trackRef) && !trackRef.publication.isMuted && !!trackRef.publication.track && trackRef.publication.track.mediaStreamTrack?.readyState !== "ended"
    const host = isHostParticipant(p)
    const showMenu = amHost && !p.isLocal && !isScreen

    return (
        <div
            className={cn(
                "group relative min-h-0 min-w-0 overflow-hidden rounded-2xl bg-[#2a1420] ring-2 transition-shadow",
                speaking && !isScreen ? "ring-[#ff5018] shadow-[0_0_0_4px_rgba(255,80,24,0.18)]" : "ring-white/5",
                className
            )}
            onDoubleClick={onPin}
        >
            {hasVideo ? (
                <VideoTrack
                    trackRef={trackRef}
                    className={cn(
                        "absolute inset-0 h-full w-full",
                        isScreen ? "object-contain bg-black" : "object-cover",
                        p.isLocal && !isScreen && "-scale-x-100"
                    )}
                />
            ) : (
                <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-[#381d2a] to-[#2a1420]">
                    <div
                        className={cn(
                            "flex items-center justify-center rounded-full font-semibold text-white shadow-lg transition-transform",
                            "size-16 text-xl sm:size-24 sm:text-3xl",
                            speaking && "scale-105"
                        )}
                        style={{ backgroundColor: colorFor(p.identity) }}
                    >
                        {initials(name)}
                    </div>
                </div>
            )}

            {/* bottom label */}
            <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between gap-2">
                <div className="flex min-w-0 items-center gap-1.5 rounded-lg bg-black/55 px-2 py-1 text-xs text-white backdrop-blur">
                    {!isScreen && (micMuted
                        ? <MicOff className="size-3.5 shrink-0 text-red-400" />
                        : <Mic className={cn("size-3.5 shrink-0", speaking ? "text-[#ff5018]" : "text-white/80")} />)}
                    {isScreen && <MonitorUp className="size-3.5 shrink-0 text-white/80" />}
                    <span className="truncate">
                        {isScreen ? `${name}'s screen` : name}{p.isLocal && !isScreen ? " (You)" : ""}
                    </span>
                    {host && !isScreen && <Crown className="size-3 shrink-0 text-amber-300" />}
                </div>
            </div>

            {/* hover actions */}
            <div className="absolute right-2 top-2 flex gap-1 opacity-100 transition-opacity sm:opacity-0 sm:group-hover:opacity-100 focus-within:opacity-100">
                <button type="button" aria-label={pinned ? "Unpin participant" : "Pin participant"}
                    onClick={onPin}
                    title={pinned ? "Unpin" : "Pin"}
                    className="flex size-8 items-center justify-center rounded-lg bg-black/55 text-white backdrop-blur hover:bg-black/75"
                >
                    {pinned ? <PinOff className="size-4" /> : <Pin className="size-4" />}
                </button>
                {showMenu && (
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <button type="button" aria-label="Participant options" className="flex size-8 items-center justify-center rounded-lg bg-black/55 text-white backdrop-blur hover:bg-black/75">
                                <MoreVertical className="size-4" />
                            </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48">
                            <DropdownMenuItem onClick={() => moderateRequest(roomName, "mute", p.identity)}>
                                <MicOff className="mr-2 size-4" /> Mute
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => moderateRequest(roomName, "stopVideo", p.identity)}>
                                <VideoOff className="mr-2 size-4" /> Turn off camera
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="text-red-600 dark:text-red-400 focus:text-red-600 dark:focus:text-red-400" onClick={() => onKick(p)}>
                                <UserMinus className="mr-2 size-4" /> Remove from meeting
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                )}
            </div>
        </div>
    )
}

// ---------------------------------------------------------------------------------------------

function Stage({
    amHost, roomName, onKick,
}: { amHost: boolean; roomName: string; onKick: (p: Participant) => void }) {
    const tracks = useTracks(
        [
            { source: Track.Source.Camera, withPlaceholder: true },
            { source: Track.Source.ScreenShare, withPlaceholder: false },
        ],
        { onlySubscribed: false }
    )
    const [pinnedId, setPinnedId] = useState<string | null>(null)

    const keyOf = (t: TrackReferenceOrPlaceholder) => `${t.participant.identity}:${t.source}`
    const screens = tracks.filter((t) => t.source === Track.Source.ScreenShare)
    const cams = tracks.filter((t) => t.source === Track.Source.Camera)

    const focus =
        tracks.find((t) => keyOf(t) === pinnedId) ??
        (screens.length > 0 ? screens[0] : undefined)

    const togglePin = (t: TrackReferenceOrPlaceholder) =>
        setPinnedId((cur) => (cur === keyOf(t) ? null : keyOf(t)))

    const tile = (t: TrackReferenceOrPlaceholder, className?: string) => (
        <Tile
            key={keyOf(t)}
            trackRef={t}
            amHost={amHost}
            roomName={roomName}
            pinned={pinnedId === keyOf(t)}
            onPin={() => togglePin(t)}
            onKick={onKick}
            className={className}
        />
    )

    if (focus) {
        const rest = tracks.filter((t) => keyOf(t) !== keyOf(focus))
        return (
            <div className="flex h-full min-h-0 flex-col gap-3 lg:flex-row">
                <div className="min-h-0 flex-1">{tile(focus, "h-full w-full")}</div>
                {rest.length > 0 && (
                    <div className="flex shrink-0 gap-3 overflow-auto lg:w-56 lg:flex-col">
                        {rest.map((t) => tile(t, "aspect-video h-24 shrink-0 lg:h-auto lg:w-full"))}
                    </div>
                )}
            </div>
        )
    }

    const n = cams.length
    const cols = n <= 1 ? 1 : n <= 4 ? 2 : n <= 9 ? 3 : 4
    const rows = Math.ceil(n / cols)
    return (
        <div
            className="grid h-full min-h-0 gap-3"
            style={{
                gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
                gridTemplateRows: `repeat(${rows}, minmax(0, 1fr))`,
            }}
        >
            {cams.map((t) => tile(t, "h-full w-full"))}
        </div>
    )
}

// ---------------------------------------------------------------------------------------------

function PersonRow({
    p, amHost, roomName, onKick,
}: { p: Participant; amHost: boolean; roomName: string; onKick: (p: Participant) => void }) {
    const name = p.name || p.identity
    const micMuted = useIsMuted({ participant: p, source: Track.Source.Microphone })
    const camOff = useIsMuted({ participant: p, source: Track.Source.Camera })
    const speaking = useIsSpeaking(p)
    return (
        <div className="flex items-center gap-3 rounded-xl px-2 py-2 hover:bg-white/5">
            <div
                className={cn("flex size-9 shrink-0 items-center justify-center rounded-full text-sm font-semibold text-white ring-2", speaking ? "ring-[#ff5018]" : "ring-transparent")}
                style={{ backgroundColor: colorFor(p.identity) }}
            >
                {initials(name)}
            </div>
            <div className="min-w-0 flex-1">
                <p className="flex items-center gap-1.5 truncate text-sm text-white">
                    <span className="truncate">{name}{p.isLocal ? " (You)" : ""}</span>
                    {isHostParticipant(p) && <Crown className="size-3 shrink-0 text-amber-300" />}
                </p>
            </div>
            <div className="flex items-center gap-1.5 text-white/60">
                {micMuted ? <MicOff className="size-4 text-red-400" /> : <Mic className="size-4" />}
                {camOff ? <VideoOff className="size-4 text-red-400" /> : <Video className="size-4" />}
            </div>
            {amHost && !p.isLocal && (
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <button type="button" aria-label="Participant options" className="flex size-8 items-center justify-center rounded-lg text-white/70 hover:bg-white/10 hover:text-white">
                            <MoreVertical className="size-4" />
                        </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48">
                        <DropdownMenuItem onClick={() => moderateRequest(roomName, "mute", p.identity)}>
                            <MicOff className="mr-2 size-4" /> Mute
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => moderateRequest(roomName, "stopVideo", p.identity)}>
                            <VideoOff className="mr-2 size-4" /> Turn off camera
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="text-red-600 dark:text-red-400 focus:text-red-600 dark:focus:text-red-400" onClick={() => onKick(p)}>
                            <UserMinus className="mr-2 size-4" /> Remove from meeting
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            )}
        </div>
    )
}

function SidePanel({
    tab, setTab, onClose, amHost, roomName, onKick,
}: {
    tab: "people" | "chat"
    setTab: (t: "people" | "chat") => void
    onClose: () => void
    amHost: boolean
    roomName: string
    onKick: (p: Participant) => void
}) {
    const participants = useParticipants()
    const { chatMessages, send, isSending } = useChat()
    const [draft, setDraft] = useState("")
    const endRef = useRef<HTMLDivElement>(null)
    const [muting, setMuting] = useState(false)

    useEffect(() => {
        if (tab === "chat") endRef.current?.scrollIntoView({ behavior: "smooth" })
    }, [chatMessages.length, tab])

    const sorted = useMemo(
        () => [...participants].sort((a, b) => Number(b.isLocal) - Number(a.isLocal)),
        [participants]
    )

    const submit = async () => {
        const text = draft.trim()
        if (!text) return
        setDraft("")
        await send(text)
    }

    return (
        <aside className="absolute inset-y-0 right-0 z-30 flex w-full flex-col border-l border-white/10 bg-[#1b1017] sm:static sm:w-80 sm:shrink-0">
            <div className="flex items-center gap-1 border-b border-white/10 p-2">
                {(["people", "chat"] as const).map((t) => (
                    <button
                        key={t}
                        onClick={() => setTab(t)}
                        className={cn(
                            "flex-1 rounded-lg px-3 py-2 text-sm font-medium capitalize transition-colors",
                            tab === t ? "bg-white/10 text-white" : "text-white/55 hover:text-white"
                        )}
                    >
                        {t === "people" ? `People (${participants.length})` : "Chat"}
                    </button>
                ))}
                <button type="button" onClick={onClose} aria-label="Close panel" className="flex size-9 items-center justify-center rounded-lg text-white/60 hover:bg-white/10 hover:text-white">
                    <X className="size-4" />
                </button>
            </div>

            {tab === "people" ? (
                <div className="flex min-h-0 flex-1 flex-col">
                    {amHost && (
                        <div className="p-3">
                            <Button
                                variant="outline"
                                disabled={muting}
                                onClick={async () => {
                                    setMuting(true)
                                    const ok = await moderateRequest(roomName, "muteAll")
                                    setMuting(false)
                                    if (ok) toast.success("Everyone else was muted")
                                }}
                                className="w-full border-white/15 bg-transparent text-white hover:bg-white/10 hover:text-white"
                            >
                                {muting ? <Loader2 className="mr-2 size-4 animate-spin" /> : <VolumeX className="mr-2 size-4" />}
                                Mute everyone
                            </Button>
                        </div>
                    )}
                    <div className="min-h-0 flex-1 space-y-0.5 overflow-y-auto px-2 pb-3">
                        {sorted.map((p) => (
                            <PersonRow key={p.identity} p={p} amHost={amHost} roomName={roomName} onKick={onKick} />
                        ))}
                    </div>
                </div>
            ) : (
                <div className="flex min-h-0 flex-1 flex-col">
                    <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-3">
                        {chatMessages.length === 0 && (
                            <p className="mt-10 text-center text-sm text-white/45">No messages yet. Say hi 👋</p>
                        )}
                        {chatMessages.map((m, i) => {
                            const mine = m.from?.isLocal
                            return (
                                <div key={m.id ?? i} className={cn("flex flex-col", mine ? "items-end" : "items-start")}>
                                    <span className="mb-0.5 text-[11px] text-white/45">
                                        {mine ? "You" : m.from?.name || m.from?.identity} ·{" "}
                                        {new Date(m.timestamp).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}
                                    </span>
                                    <span className={cn("max-w-[85%] whitespace-pre-wrap break-words rounded-2xl px-3 py-2 text-sm", mine ? "bg-[#ff5018] text-white" : "bg-white/10 text-white")}>
                                        {m.message}
                                    </span>
                                </div>
                            )
                        })}
                        <div ref={endRef} />
                    </div>
                    <form
                        onSubmit={(e) => { e.preventDefault(); void submit() }}
                        className="flex items-center gap-2 border-t border-white/10 p-3"
                    >
                        <input aria-label="Message everyone"
                            value={draft}
                            onChange={(e) => setDraft(e.target.value)}
                            maxLength={1000}
                            placeholder="Message everyone"
                            className="h-10 min-w-0 flex-1 rounded-xl border border-white/10 bg-white/5 px-3 text-sm text-white placeholder:text-white/40 focus:border-[#ff5018] focus:outline-none"
                        />
                        <button
                            type="submit"
                            aria-label="Send message"
                            disabled={isSending || !draft.trim()}
                            className="flex size-10 items-center justify-center rounded-xl bg-[#ff5018] text-white transition-opacity disabled:opacity-40"
                        >
                            <Send className="size-4" />
                        </button>
                    </form>
                </div>
            )}
        </aside>
    )
}

// ---------------------------------------------------------------------------------------------

function CtrlButton({
    active = true, danger, onClick, label, children, disabled, badge, caption, className,
}: {
    active?: boolean; danger?: boolean; onClick?: () => void; label: string
    children: React.ReactNode; disabled?: boolean; badge?: number; caption?: string; className?: string
}) {
    return (
        <div className="flex flex-col items-center gap-1">
            <button
                onClick={onClick}
                disabled={disabled}
                title={label}
                aria-label={label}
                className={cn(
                    "relative flex size-12 items-center justify-center rounded-full text-white outline-none transition-all focus-visible:ring-2 focus-visible:ring-[#ff5018] active:scale-95 disabled:opacity-50",
                    danger ? "bg-red-600 hover:bg-red-500"
                        : active ? "bg-white/10 hover:bg-white/20"
                            : "bg-red-500 hover:bg-red-400",
                    className
                )}
            >
                {children}
                {!!badge && (
                    <span className="absolute -right-0.5 -top-0.5 flex min-w-4 items-center justify-center rounded-full bg-[#ff5018] px-1 text-[10px] font-bold">
                        {badge > 9 ? "9+" : badge}
                    </span>
                )}
            </button>
            {caption && <span className="hidden text-[11px] font-medium text-white/60 sm:block">{caption}</span>}
        </div>
    )
}

// the button and its device picker share one rounded pill
function SplitCtrl({
    active, onClick, label, caption, disabled, kind, children,
}: {
    active: boolean; onClick: () => void; label: string; caption: string; disabled?: boolean
    kind: "audioinput" | "videoinput"; children: React.ReactNode
}) {
    return (
        <div className="flex flex-col items-center gap-1">
            <div className={cn("flex items-center rounded-full transition-colors", active ? "bg-white/10" : "bg-red-500")}>
                <button
                    onClick={onClick}
                    disabled={disabled}
                    title={label}
                    aria-label={label}
                    className="flex size-12 items-center justify-center rounded-full text-white outline-none transition-all hover:bg-white/15 focus-visible:ring-2 focus-visible:ring-[#ff5018] active:scale-95 disabled:opacity-50"
                >
                    {children}
                </button>
                <div className="relative hidden pr-1 sm:block">
                    <MediaDeviceMenu
                        kind={kind}
                        aria-label={kind === "audioinput" ? "Choose microphone" : "Choose camera"}
                        className="!flex !h-9 !w-7 !items-center !justify-center !rounded-full !border-0 !bg-transparent !p-0 !text-white hover:!bg-white/20"
                    >
                        <ChevronUp className="size-4" />
                    </MediaDeviceMenu>
                </div>
            </div>
            <span className="hidden text-[11px] font-medium text-white/60 sm:block">{caption}</span>
        </div>
    )
}

function ControlBar({
    amHost, panel, togglePanel, unread, onEndAll,
}: {
    amHost: boolean
    panel: "people" | "chat" | null
    togglePanel: (t: "people" | "chat") => void
    unread: number
    onEndAll: () => void
}) {
    const room = useRoomContext()
    const mic = useTrackToggle({ source: Track.Source.Microphone })
    const cam = useTrackToggle({ source: Track.Source.Camera })
    const screen = useTrackToggle({ source: Track.Source.ScreenShare })

    return (
        <div className="flex justify-center px-3 pb-4 pt-2">
            <div className="flex max-w-full items-start justify-center gap-2 overflow-x-auto rounded-3xl border border-white/10 bg-[#1e1019]/95 px-3 py-2.5 shadow-2xl backdrop-blur sm:gap-3 sm:px-4">
                <SplitCtrl label={mic.enabled ? "Mute" : "Unmute"} caption={mic.enabled ? "Mute" : "Unmute"} active={mic.enabled} onClick={() => mic.toggle()} disabled={mic.pending} kind="audioinput">
                    {mic.enabled ? <Mic className="size-5" /> : <MicOff className="size-5" />}
                </SplitCtrl>
                <SplitCtrl label={cam.enabled ? "Turn off camera" : "Turn on camera"} caption={cam.enabled ? "Stop video" : "Start video"} active={cam.enabled} onClick={() => cam.toggle()} disabled={cam.pending} kind="videoinput">
                    {cam.enabled ? <Video className="size-5" /> : <VideoOff className="size-5" />}
                </SplitCtrl>
                <CtrlButton label={screen.enabled ? "Stop sharing" : "Share screen"} caption={screen.enabled ? "Stop share" : "Share"} active={!screen.enabled} onClick={() => screen.toggle()} disabled={screen.pending} className={screen.enabled ? "!bg-[#ff5018] hover:!bg-[#e6430f]" : undefined}>
                    {screen.enabled ? <MonitorOff className="size-5" /> : <MonitorUp className="size-5" />}
                </CtrlButton>
                <div className="mx-1 hidden h-12 w-px self-start bg-white/10 sm:block" />
                <CtrlButton label="People" caption="People" active={panel !== "people"} onClick={() => togglePanel("people")} className={panel === "people" ? "!bg-[#ff5018] hover:!bg-[#e6430f]" : undefined}>
                    <Users className="size-5" />
                </CtrlButton>
                <CtrlButton label="Chat" caption="Chat" active={panel !== "chat"} onClick={() => togglePanel("chat")} badge={panel === "chat" ? 0 : unread} className={panel === "chat" ? "!bg-[#ff5018] hover:!bg-[#e6430f]" : undefined}>
                    <MessageSquare className="size-5" />
                </CtrlButton>
                <div className="mx-1 hidden h-12 w-px self-start bg-white/10 sm:block" />

                {amHost ? (
                    <div className="flex flex-col items-center gap-1">
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <button className="flex h-12 items-center gap-1.5 rounded-full bg-red-600 px-5 text-sm font-semibold text-white outline-none transition-all hover:bg-red-500 focus-visible:ring-2 focus-visible:ring-white active:scale-95" aria-label="Leave">
                                    <PhoneOff className="size-5" />
                                    <span className="hidden sm:inline">Leave</span>
                                    <ChevronDown className="size-4" />
                                </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" side="top" className="w-52">
                                <DropdownMenuItem onClick={() => room.disconnect()}>
                                    <PhoneOff className="mr-2 size-4" /> Leave meeting
                                </DropdownMenuItem>
                                <DropdownMenuItem className="text-red-600 dark:text-red-400 focus:text-red-600 dark:focus:text-red-400" onClick={onEndAll}>
                                    <X className="mr-2 size-4" /> End for everyone
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                        <span className="hidden text-[11px] font-medium text-transparent select-none sm:block">.</span>
                    </div>
                ) : (
                    <div className="flex flex-col items-center gap-1">
                        <button onClick={() => room.disconnect()} aria-label="Leave" className="flex h-12 items-center gap-1.5 rounded-full bg-red-600 px-5 text-sm font-semibold text-white outline-none transition-all hover:bg-red-500 focus-visible:ring-2 focus-visible:ring-white active:scale-95">
                            <PhoneOff className="size-5" />
                            <span className="hidden sm:inline">Leave</span>
                        </button>
                        <span className="hidden text-[11px] font-medium text-transparent select-none sm:block">.</span>
                    </div>
                )}
            </div>
        </div>
    )
}

// ---------------------------------------------------------------------------------------------

export function MeetingStage({ roomName, title, startedAt, status, errorMessage, onRetry }: Props) {
    const room = useRoomContext()
    const { localParticipant } = useLocalParticipant()
    const participants = useParticipants()
    const { chatMessages } = useChat()

    const amHost = isHostParticipant(localParticipant)
    const [panel, setPanel] = useState<"people" | "chat" | null>(null)
    const [seen, setSeen] = useState(0)
    const [kickTarget, setKickTarget] = useState<Participant | null>(null)
    const [kicking, setKicking] = useState(false)
    const [endOpen, setEndOpen] = useState(false)
    const [now, setNow] = useState(() => Date.now())

    // If the server says this person may no longer be in the call (removed from the workspace,
    // kicked, or the meeting was ended by an admin), drop out even if the LiveKit token is still valid.
    const access = useQuery(api.meetings.authorizeRoom, { roomName })
    const hadAccess = useRef(false)
    useEffect(() => {
        if (access) hadAccess.current = true
        else if (access === null && hadAccess.current) {
            hadAccess.current = false
            toast.error("You're no longer allowed in this meeting")
            room.disconnect()
        }
    }, [access, room])

    useEffect(() => {
        const id = setInterval(() => setNow(Date.now()), 1000)
        return () => clearInterval(id)
    }, [])

    // chat unread counter: everything is "seen" while the chat tab is open
    const unread = panel === "chat" ? 0 : Math.max(0, chatMessages.length - seen)
    const changePanel = useCallback((next: "people" | "chat" | null) => {
        if (panel === "chat" && next !== "chat") setSeen(chatMessages.length)
        setPanel(next)
    }, [panel, chatMessages.length])

    // join / leave / moderation notices
    const selfToggleRef = useRef(0)
    useEffect(() => {
        const joined = (p: Participant) => toast(`${p.name || p.identity} joined`, { duration: 2000 })
        const left = (p: Participant) => toast(`${p.name || p.identity} left`, { duration: 2000 })
        const muted = (pub: { source: Track.Source }, p: Participant) => {
            if (!p.isLocal || Date.now() - selfToggleRef.current < 1500) return
            if (pub.source === Track.Source.Microphone) toast.info("The host muted you")
            if (pub.source === Track.Source.Camera) toast.info("The host turned off your camera")
        }
        room.on(RoomEvent.ParticipantConnected, joined)
        room.on(RoomEvent.ParticipantDisconnected, left)
        room.on(RoomEvent.TrackMuted, muted)
        return () => {
            room.off(RoomEvent.ParticipantConnected, joined)
            room.off(RoomEvent.ParticipantDisconnected, left)
            room.off(RoomEvent.TrackMuted, muted)
        }
    }, [room])

    // anything the local user toggles on purpose shouldn't look like a host action
    useEffect(() => {
        const mark = () => { selfToggleRef.current = Date.now() }
        window.addEventListener("click", mark, true)
        window.addEventListener("keydown", mark, true)
        return () => {
            window.removeEventListener("click", mark, true)
            window.removeEventListener("keydown", mark, true)
        }
    }, [])

    const togglePanel = useCallback((t: "people" | "chat") => changePanel(panel === t ? null : t), [changePanel, panel])

    const secs = Math.max(0, Math.floor((now - startedAt) / 1000))
    const h = Math.floor(secs / 3600)
    const elapsed = `${h > 0 ? `${h}:` : ""}${pad(Math.floor((secs % 3600) / 60))}:${pad(secs % 60)}`

    const confirmKick = async () => {
        if (!kickTarget) return
        setKicking(true)
        const ok = await moderateRequest(roomName, "kick", kickTarget.identity)
        setKicking(false)
        if (ok) toast.success(`${kickTarget.name || kickTarget.identity} was removed`)
        setKickTarget(null)
    }

    return (
        <div className="relative flex h-full w-full flex-col bg-[#150c11] text-white">
            {/* header */}
            <div className="flex h-14 shrink-0 items-center justify-between gap-3 px-4">
                <div className="flex min-w-0 items-center gap-3">
                    <h2 className="truncate text-sm font-semibold sm:text-base">{title || "Meeting"}</h2>
                    <span className="hidden rounded-md bg-white/10 px-2 py-0.5 font-mono text-xs text-white/70 sm:inline">{elapsed}</span>
                </div>
                <div className="flex shrink-0 items-center gap-2 text-xs">
                    {status === "recording" && (
                        <span className="flex items-center gap-1.5 rounded-full bg-emerald-500/15 px-2.5 py-1 text-emerald-300" title="Your speech is being transcribed for the AI summary">
                            <span className="relative flex size-2">
                                <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                                <span className="relative inline-flex size-2 rounded-full bg-emerald-400" />
                            </span>
                            Transcribing
                        </span>
                    )}
                    {status === "starting" && (
                        <span className="flex items-center gap-1.5 rounded-full bg-[#ff5018]/15 px-2.5 py-1 text-[#ff8a63]">
                            <Loader2 className="size-3 animate-spin" /> Starting transcript
                        </span>
                    )}
                    {status === "error" && (
                        <button type="button" onClick={onRetry} className="flex items-center gap-1.5 rounded-full bg-red-500/15 px-2.5 py-1 text-red-300 hover:bg-red-500/25" title={errorMessage}>
                            <AlertCircle className="size-3.5" /> Transcript off · Retry
                        </button>
                    )}
                    <button
                        type="button"
                        onClick={() => togglePanel("people")}
                        aria-label={`Show people, ${participants.length} in meeting`}
                        className="flex items-center gap-1.5 rounded-full bg-white/10 px-2.5 py-1 text-white/80 hover:bg-white/20"
                    >
                        <Users className="size-3.5" /> {participants.length}
                    </button>
                </div>
            </div>

            {status === "error" && (
                <div role="alert" className="mx-4 mb-2 flex items-start gap-2 rounded-xl border border-red-400/30 bg-red-500/10 px-3 py-2 text-xs text-red-200">
                    <AlertCircle className="mt-0.5 size-4 shrink-0" />
                    <p className="flex-1">{errorMessage || "Live captions couldn't start."} The meeting itself isn&apos;t affected, but the AI summary needs a transcript.</p>
                    {onRetry && <button type="button" onClick={onRetry} className="shrink-0 rounded-md bg-white/10 px-2 py-1 font-semibold text-white hover:bg-white/20">Retry</button>}
                </div>
            )}

            {/* body */}
            <div className="relative flex min-h-0 flex-1">
                <div className="min-h-0 min-w-0 flex-1 px-3 pb-1 sm:px-4">
                    <Stage amHost={amHost} roomName={roomName} onKick={setKickTarget} />
                </div>
                {panel && (
                    <SidePanel
                        tab={panel}
                        setTab={changePanel}
                        onClose={() => changePanel(null)}
                        amHost={amHost}
                        roomName={roomName}
                        onKick={setKickTarget}
                    />
                )}
            </div>

            <ControlBar
                amHost={amHost}
                panel={panel}
                togglePanel={togglePanel}
                unread={unread}
                onEndAll={() => setEndOpen(true)}
            />

            <RoomAudioRenderer />

            {/* kick confirm */}
            <Dialog open={!!kickTarget} onOpenChange={(o) => !o && setKickTarget(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Remove {kickTarget?.name || kickTarget?.identity}?</DialogTitle>
                        <DialogDescription>
                            They will be disconnected and won&apos;t be able to rejoin this meeting.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setKickTarget(null)}>Cancel</Button>
                        <Button variant="destructive" disabled={kicking} onClick={confirmKick}>
                            {kicking && <Loader2 className="mr-2 size-4 animate-spin" />} Remove
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* end for everyone confirm */}
            <Dialog open={endOpen} onOpenChange={setEndOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>End meeting for everyone?</DialogTitle>
                        <DialogDescription>
                            Everyone will be disconnected and the AI summary will be created.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setEndOpen(false)}>Cancel</Button>
                        <Button
                            variant="destructive"
                            onClick={async () => {
                                setEndOpen(false)
                                await moderateRequest(roomName, "endAll")
                            }}
                        >
                            End for everyone
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
