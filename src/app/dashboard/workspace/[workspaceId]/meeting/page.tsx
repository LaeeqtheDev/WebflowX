"use client"

import { usePermissions } from "@/hooks/use-permissions"
import { useState, useCallback, useEffect, useRef, useMemo } from "react"
import { useConfirm } from "../../hooks/use-confirm"
import { errorMessage } from "@/lib/error-message"
import { segmentsToBody, takeLastSegments } from "./segments"
import { useWorkspaceId } from "@/hooks/use-workspace-id"
import { useCurrentMember } from "@/features/members/api/use-current-member"
import { useGetMembers } from "@/features/members/api/use-get-members"
import { useGetChannels } from "@/features/channels/api/use-get-channels"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "sonner"
import { useLimitHandler } from "@/hooks/use-limit-handler"
import { cn } from "@/lib/utils"
import { format } from "date-fns"
import { Loader, Video, Plus, Sparkles, Clock, Users, AlertTriangle, ArrowLeft, Phone, CalendarClock, Trash2 } from "lucide-react"
import { useMutation, useConvex } from "convex/react"
import { api } from "../../../../../../convex/_generated/api"
import { Id } from "../../../../../../convex/_generated/dataModel"
import { useRouter } from "next/navigation"
import { useCreateMeeting } from "@/features/meetings/use-create-meetings"
import { useGetMeetings } from "@/features/meetings/use-get-meetings"
import dynamic from "next/dynamic"

// LiveKit and the summary view are only needed once a meeting is open.
const MeetingRoom = dynamic(() => import("./components/meeting-room").then((m) => m.MeetingRoom), {
    ssr: false,
    loading: () => <div className="flex h-full items-center justify-center"><Loader className="size-6 animate-spin text-[#ff5018]" /></div>,
})
const MeetingSummary = dynamic(() => import("./components/meeting-summary").then((m) => m.MeetingSummary), { ssr: false })

export default function MeetingPage() {
    const workspaceId = useWorkspaceId()
    const router = useRouter()
    const { data: currentMember } = useCurrentMember({ workspaceId })
    const perms = usePermissions()
    const { data: members } = useGetMembers({ workspaceId })
    const { data: meetings, isLoading } = useGetMeetings({ workspaceId })
    const { data: channels } = useGetChannels({ workspaceId })
    const { mutate: createMeeting, isPending: isCreating } = useCreateMeeting()
    const { handleLimitError } = useLimitHandler()
    const joinMeeting = useMutation(api.meetings.join)
    const leaveMeeting = useMutation(api.meetings.leave)
    const endForEveryone = useMutation(api.meetings.endForEveryone)
    const convex = useConvex()
    const saveSummary = useMutation(api.meetings.saveSummary)
    const createMessage = useMutation(api.messages.create)

    const [token, setToken] = useState<string | null>(null)
    const [serverUrl, setServerUrl] = useState<string | null>(null)
    const [activeMeetingId, setActiveMeetingId] = useState<Id<"meetings"> | null>(null)
    const [showCreate, setShowCreate] = useState(false)
    const [title, setTitle] = useState("")
    const [createMode, setCreateMode] = useState<"workspace" | "oneToOne">("workspace")
    const [inviteeId, setInviteeId] = useState("")
    const [scheduleOn, setScheduleOn] = useState(false)
    const [scheduleAt, setScheduleAt] = useState("")
    const removeMeeting = useMutation(api.meetings.remove)
    const [ConfirmDelete, confirmDelete] = useConfirm("Delete this meeting?", "Its summary and transcript are removed for everyone. This can't be undone.")
    // re-evaluated every 20s so "Upcoming" turns into "Join" without a refresh
    const [nowTs, setNowTs] = useState(() => Date.now())
    useEffect(() => { const t = setInterval(() => setNowTs(Date.now()), 20_000); return () => clearInterval(t) }, [])
    const canStartWorkspace = perms.can("startMeetings")
    const openCreate = (mode: "workspace" | "oneToOne") => { setCreateMode(mode); setShowCreate(true) }
    const callable = (members ?? []).filter((m) => m._id !== currentMember?._id && m.role !== "guest")
    const [selectedChannelId, setSelectedChannelId] = useState("")
    const [isGenerating, setIsGenerating] = useState(false)
    const [selectedMeetingId, setSelectedMeetingId] = useState<Id<"meetings"> | null>(null)
    // Always derive from live data so summaries/end state appear instantly without a refresh
    const selectedMeeting = meetings?.find(m => m._id === selectedMeetingId) ?? null
    const setSelectedMeeting = (m: { _id: Id<"meetings"> } | null) => setSelectedMeetingId(m?._id ?? null)
    // Opened from the calendar (?meeting=<id>): jump straight to that meeting once the list is loaded
    const deepLinked = useRef(false)
    useEffect(() => {
        if (deepLinked.current || !meetings) return
        const wanted = new URLSearchParams(window.location.search).get("meeting")
        if (!wanted) { deepLinked.current = true; return }
        deepLinked.current = true
        const found = meetings.find((m) => m._id === wanted)
        if (found) {
            // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time selection from the link
            setSelectedMeetingId(found._id)
            setShowMobileDetail(true)
        } else {
            toast.info("That meeting is older than the list shows or was removed")
        }
    }, [meetings])
    const [generationError, setGenerationError] = useState<string | null>(null)
    const [showMobileDetail, setShowMobileDetail] = useState(false)

    const currentUserName = members?.find(m => m._id === currentMember?._id)?.user.name ?? "Someone"

    const activeMeeting = meetings?.find((m) => m._id === activeMeetingId)
    const isUpcoming = (m: { scheduledFor?: number; endedAt?: number }) => !!m.scheduledFor && !m.endedAt && m.scheduledFor > nowTs
    // upcoming meetings first (soonest on top), then the rest newest first
    const ordered = useMemo(() => {
        const list = meetings ?? []
        const up = list.filter((m) => !!m.scheduledFor && !m.endedAt && m.scheduledFor > nowTs).sort((a, b) => (a.scheduledFor ?? 0) - (b.scheduledFor ?? 0))
        const rest = list.filter((m) => !up.includes(m))
        return [...up, ...rest]
    }, [meetings, nowTs])

    const handleJoin = async (roomName: string, meetingId: Id<"meetings">) => {
        try {
            // register in the call first (also rejects meetings that already ended)
            await joinMeeting({ id: meetingId })
            const res = await fetch(
                `/api/livekit?room=${encodeURIComponent(roomName)}`
            )
            const data = await res.json()
            if (data.error) throw new Error(data.error)
            setToken(data.token)
            setServerUrl(data.url)
            setActiveMeetingId(meetingId)
        } catch (e) {
            const msg = errorMessage(e)
            toast.error(msg.includes("ended") ? "This meeting has already ended" : msg && msg !== "Failed to fetch" ? msg : "Failed to join meeting")
        }
    }

    const handleCreate = async () => {
        const oneToOne = createMode === "oneToOne"
        let meetingTitle = title.trim()
        if (oneToOne) {
            if (!inviteeId) return toast.error("Choose who to call")
            const other = members?.find((m) => m._id === inviteeId)
            meetingTitle = `${currentUserName} & ${other?.user.name ?? "teammate"}`
        } else if (!meetingTitle) {
            return toast.error("Title is required")
        }
        let scheduledFor: number | undefined
        if (!oneToOne && scheduleOn) {
            const at = new Date(scheduleAt).getTime()
            if (!scheduleAt || Number.isNaN(at) || at < Date.now() + 60_000) return toast.error("Pick a time in the future")
            scheduledFor = at
        }
        const roomName = `${workspaceId}-${Date.now()}`

        createMeeting({ workspaceId, title: meetingTitle, roomName, kind: createMode, inviteeId: oneToOne ? (inviteeId as Id<"members">) : undefined, scheduledFor }, {
            onSuccess: async (id) => {
                if (!id) return
                setShowCreate(false)

                if (selectedChannelId && !oneToOne) {
                    const meetingUrl = `${window.location.origin}/dashboard/workspace/${workspaceId}/meeting`
                    const headline = scheduledFor
                        ? `📅 ${currentUserName} scheduled a meeting: "${meetingTitle}" for ${format(scheduledFor, "EEE d MMM, h:mm a")}\n`
                        : `🎥 ${currentUserName} started a meeting: "${meetingTitle}"\n`
                    const body = JSON.stringify({
                        ops: [
                            { insert: headline },
                            { insert: scheduledFor ? "Open the meetings page to join when it starts:\n" : "Click below to join:\n" },
                            { attributes: { link: meetingUrl }, insert: scheduledFor ? "🔗 Meetings" : "🔗 Join Meeting" },
                            { insert: "\n" }
                        ]
                    })
                    await createMessage({ workspaceId, channelId: selectedChannelId as Id<"channels">, body }).catch(console.error)
                }

                setTitle("")
                setSelectedChannelId("")
                setInviteeId("")
                setScheduleOn(false)
                setScheduleAt("")
                if (scheduledFor) {
                    toast.success(`Scheduled for ${format(scheduledFor, "EEE d MMM, h:mm a")}`)
                    setSelectedMeetingId(id)
                    return
                }
                if (oneToOne) toast.info("Calling... they get a notification and can join from the Meetings page.")
                await handleJoin(roomName, id)
            },
            onError: (e) => {
                if (handleLimitError(e, "Couldn't start the meeting")) { setShowCreate(false); return }
                toast.error(errorMessage(e) || "Couldn't start the meeting")
            }
        })
    }

    const handleDelete = async (meetingId: Id<"meetings">) => {
        const ok = await confirmDelete()
        if (!ok) return
        try {
            await removeMeeting({ id: meetingId })
            setSelectedMeetingId(null)
            setShowMobileDetail(false)
            toast.success("Meeting deleted")
        } catch (e) {
            toast.error(errorMessage(e))
        }
    }

    // Builds the merged transcript of everyone in the call and turns it into one AI summary.
    // Runs once per meeting, from whoever leaves last (or the host ending it for everyone).
    const finalizeSummary = useCallback(async (meetingId: Id<"meetings">) => {
        setGenerationError(null)
        setSelectedMeetingId(meetingId)

        const transcript = ((await convex.query(api.meetings.getTranscript, { id: meetingId })) ?? "").trim()

        if (transcript.length <= 20) {
            await saveSummary({
                id: meetingId,
                summary: "No transcript was captured for this meeting. You can add one manually to generate a summary.",
                transcript: "",
            }).catch(console.error)
            toast.info("No transcript captured. You can add one manually from the meeting details.")
            return
        }

        setIsGenerating(true)
        try {
            // Reserve the summary against the plan limit (and skip if one was already generated)
            const claim = await convex.mutation(api.meetings.claimSummary, { id: meetingId, auto: true })
            if (!claim.allowed) return

            toast.info("Generating AI summary...")
            const res = await fetch("/api/ai-summary", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ transcript, meetingId })
            })
            const data = await res.json()
            if (data.error) throw new Error(data.error)

            await saveSummary({ id: meetingId, summary: data.summary, transcript })
            toast.success("AI summary generated!")
        } catch (e: unknown) {
            const message = errorMessage(e)
            if (message.startsWith("LIMIT_REACHED:aiSummaries")) {
                await saveSummary({
                    id: meetingId,
                    summary: "Your plan's monthly AI summary limit was reached, so no summary was generated. The transcript was saved.",
                    transcript,
                }).catch(console.error)
                handleLimitError(e)
            } else {
                setGenerationError(message || "Failed to generate summary")
                toast.error("Failed to generate summary. You can regenerate it from the meeting details.")
                await saveSummary({
                    id: meetingId,
                    summary: `Summary generation failed${message ? ` (${message.slice(0, 200)})` : ""}. You can regenerate it from the meeting details.`,
                    transcript,
                }).catch(console.error)
            }
        } finally {
            setIsGenerating(false)
        }
    }, [convex, saveSummary, handleLimitError])

    const handleDisconnect = useCallback(async (_transcript: string, reason: "left" | "removed" | "ended" | "lost" = "left") => {
        const meetingId = activeMeetingId
        const segments = takeLastSegments()

        setToken(null)
        setServerUrl(null)
        setActiveMeetingId(null)

        if (!meetingId) return
        if (meetingId) setSelectedMeetingId(meetingId)
        if (reason === "removed") toast.error("You were removed from the meeting by the host")
        if (reason === "ended") toast.info("The host ended the meeting")
        if (reason === "lost") toast.error("You lost connection to the meeting. You can rejoin from the list.")

        // Save my part; the server tells us whether I was the last one in the call
        let ended = false
        try {
            const res = await leaveMeeting({
                id: meetingId,
                transcript: segments.length > 0 ? segmentsToBody(segments) : undefined,
            })
            ended = res.ended
        } catch (e) {
            console.error("Failed to leave meeting:", e)
            toast.error("Could not save your part of the meeting")
            return
        }

        if (!ended) {
            if (reason === "left") toast.info("You left the meeting. The summary is created when the last person leaves.")
            return
        }

        await finalizeSummary(meetingId)
    }, [activeMeetingId, leaveMeeting, finalizeSummary])

    const handleEndForEveryone = async (meetingId: Id<"meetings">) => {
        try {
            await endForEveryone({ id: meetingId })
            toast.success("Meeting ended")
            await finalizeSummary(meetingId)
        } catch (e) {
            toast.error(errorMessage(e))
        }
    }

    const handleSelectMeeting = (meeting: NonNullable<typeof meetings>[number]) => {
        setSelectedMeeting(meeting)
        setShowMobileDetail(true)
    }

    const handleBackToList = () => {
        setShowMobileDetail(false)
        setSelectedMeeting(null)
    }

    // Active call
    if (token && serverUrl) {
        return (
            <div className="h-full w-full relative">
                <MeetingRoom
                    token={token}
                    serverUrl={serverUrl}
                    roomName={activeMeeting?.roomName ?? ""}
                    title={activeMeeting?.title ?? "Meeting"}
                    startedAt={activeMeeting?.startedAt ?? Date.now()}
                    endsAt={activeMeeting?.kind === "oneToOne" ? activeMeeting.startedAt + 15 * 60_000 : undefined}
                    onDisconnect={handleDisconnect}
                />
            </div>
        )
    }

    // Generating summary screen
    if (isGenerating) {
        return (
            <div className="h-full flex items-center justify-center flex-col gap-3 px-4 bg-cream-soft">
                <div className="size-14 rounded-2xl bg-[#ff5018]/10 text-[#ff5018] flex items-center justify-center">
                    <Sparkles className="size-6 text-[#ff5018] animate-pulse" />
                </div>
                <p className="font-semibold tracking-tight text-center text-ink">Generating AI summary...</p>
                <p className="text-sm text-ink/60 text-center">This will just take a moment</p>
            </div>
        )
    }

    return (
        <div className="h-full flex flex-col bg-cream-soft">
            {/* Header */}
            <div className="flex items-center justify-between px-4 sm:px-6 h-14 border-b bg-surface shrink-0">
                <div className="flex items-center gap-2">
                    {showMobileDetail && (
                        <Button
                            variant="ghost"
                            size="sm"
                            className="md:hidden -ml-2 h-7 px-2"
                            aria-label="Back to meetings list"
                            onClick={handleBackToList}
                        >
                            <ArrowLeft className="size-4" />
                        </Button>
                    )}
                    <div className="size-8 rounded-lg bg-[#ff5018]/10 flex items-center justify-center">
                        <Video className="size-4 text-[#ff5018]" />
                    </div>
                    <h1 className="tracking-tight text-[17px] font-semibold text-ink">Meetings</h1>
                </div>
                <div className="flex items-center gap-2">
                    <Button
                        variant="outline"
                        onClick={() => openCreate("oneToOne")}
                        className="h-8 rounded-lg font-semibold text-xs px-2.5 sm:px-3"
                    >
                        <Phone className="size-3.5 sm:size-4 sm:mr-1" />
                        <span className="hidden sm:inline">Call someone</span>
                    </Button>
                    {canStartWorkspace && (
                        <Button
                            onClick={() => openCreate("workspace")}
                            className="bg-[#ff5018] hover:bg-[#e6430f] text-white h-8 rounded-lg font-semibold text-xs px-2.5 sm:px-3"
                        >
                            <Plus className="size-3.5 sm:size-4 sm:mr-1" />
                            <span className="hidden sm:inline">New Meeting</span>
                        </Button>
                    )}
                </div>
            </div>

            {/* Error banner */}
            {generationError && (
                <div className="mx-4 sm:mx-6 mt-3 sm:mt-4 p-3 bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/30 rounded-xl flex items-start gap-2">
                    <AlertTriangle className="size-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                        <p className="text-xs sm:text-sm font-medium text-amber-800 dark:text-amber-200">Summary generation had an issue</p>
                        <p className="text-[10px] sm:text-xs text-amber-600 dark:text-amber-400 mt-0.5">{generationError}</p>
                        <p className="text-[10px] sm:text-xs text-amber-600 dark:text-amber-400 mt-1">You can add a transcript manually from the meeting details.</p>
                    </div>
                    <button 
                        type="button"
                        aria-label="Dismiss"
                        onClick={() => setGenerationError(null)}
                        className="text-amber-600 dark:text-amber-400 hover:text-amber-800 dark:hover:text-amber-200 text-lg shrink-0"
                    >
                        <span aria-hidden="true">×</span>
                    </button>
                </div>
            )}

            {/* Body */}
            <div className="flex-1 flex overflow-hidden">
                {isLoading ? (
                    <div className="flex-1 flex items-center justify-center">
                        <div className="size-14 rounded-2xl bg-[#ff5018]/10 text-[#ff5018] flex items-center justify-center">
                            <Loader className="size-6 animate-spin text-[#ff5018]" />
                        </div>
                    </div>
                ) : meetings?.length === 0 ? (
                    <div className="flex-1 flex flex-col items-center justify-center gap-3 text-ink/60 px-4">
                        <div className="size-14 rounded-2xl bg-[#ff5018]/10 text-[#ff5018] flex items-center justify-center">
                            <Video className="size-6 text-[#ff5018]" />
                        </div>
                        <p className="font-semibold tracking-tight text-ink text-center">No meetings yet</p>
                        <p className="text-sm text-center">{canStartWorkspace ? "Start or schedule a meeting with your team, or call one person for up to 15 minutes" : "Moderators start team meetings. You can call one person for up to 15 minutes."}</p>
                        <div className="flex gap-2">
                            {canStartWorkspace && (
                                <Button onClick={() => openCreate("workspace")} size="sm" className="bg-[#ff5018] hover:bg-[#e6430f] text-white rounded-lg font-semibold">
                                    <Plus className="size-4 mr-1" /> Start a Meeting
                                </Button>
                            )}
                            <Button onClick={() => openCreate("oneToOne")} size="sm" variant="outline" className="rounded-lg font-semibold">
                                <Phone className="size-4 mr-1" /> Call someone
                            </Button>
                        </div>
                    </div>
                ) : (
                    <>
                        {/* Left panel: meeting list - Hidden on mobile when detail is shown */}
                        <div className={cn(
                            "w-full md:w-80 border-r bg-surface flex flex-col overflow-y-auto shrink-0 p-3 gap-2",
                            showMobileDetail && "hidden md:flex"
                        )}>
                            {ordered.map(meeting => (
                                <div
                                    key={meeting._id}
                                    onClick={() => handleSelectMeeting(meeting)}
                                    className={cn(
                                        "flex flex-col gap-1 px-3 sm:px-4 py-3 bg-surface rounded-xl border cursor-pointer hover:border-[#ff5018]/40 hover:shadow-sm transition-colors",
                                        selectedMeeting?._id === meeting._id && "border-[#ff5018]/60 bg-cream"
                                    )}
                                >
                                    <div className="flex items-center justify-between gap-2">
                                        <p className="text-sm font-semibold tracking-tight truncate text-ink">{meeting.title}</p>
                                        {isUpcoming(meeting) && (
                                            <Badge className="bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-300 border-transparent rounded-md px-2 py-0.5 text-[11px] font-medium shrink-0">
                                                <CalendarClock className="size-3 mr-1" /> Upcoming
                                            </Badge>
                                        )}
                                        {!meeting.endedAt && !isUpcoming(meeting) && (
                                            <Badge className="bg-red-50 dark:bg-red-500/10 text-red-700 dark:text-red-300 border-transparent rounded-md px-2 py-0.5 text-[11px] font-medium shrink-0">
                                                <span className="size-1.5 rounded-full bg-red-500 animate-pulse mr-1.5" />
                                                Live{(meeting.activeMembers?.length ?? 0) > 0 ? ` · ${meeting.activeMembers?.length} in call` : ""}
                                            </Badge>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-2 text-xs text-ink/60 flex-wrap">
                                        <span className="flex items-center gap-1">
                                            <Clock className="size-3" />
                                            {format(meeting.startedAt, "MMM d · h:mm a")}
                                        </span>
                                        {meeting.kind === "oneToOne" && <span>· One-to-one</span>}
                                        {meeting.endedAt && (
                                            <span>· {Math.round((meeting.endedAt - meeting.startedAt) / 60000)} min</span>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-1.5 mt-0.5">
                                        <Avatar className="size-4 rounded-md">
                                            <AvatarImage src={meeting.creator?.user?.image} />
                                            <AvatarFallback className="text-[8px] rounded-md bg-[#381d2a] dark:bg-[#4a2838] text-white">
                                                {meeting.creator?.user?.name?.[0] ?? "?"}
                                            </AvatarFallback>
                                        </Avatar>
                                        <span className="text-[11px] text-ink/60 truncate">
                                            {meeting.creator?.user?.name}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Right panel: meeting detail - Full screen on mobile when shown */}
                        <div className={cn(
                            "flex-1 overflow-y-auto p-4 sm:p-6",
                            !showMobileDetail && !selectedMeeting && "hidden md:block"
                        )}>
                            {selectedMeeting ? (
                                <div className="flex flex-col gap-4">
                                    {/* Meeting header */}
                                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                                        <div className="min-w-0">
                                            <h2 className="text-lg sm:text-xl font-semibold tracking-tight text-ink break-words">{selectedMeeting.title}</h2>
                                            <div className="flex items-center gap-2 sm:gap-3 text-xs text-ink/60 mt-1 flex-wrap">
                                                <span className="flex items-center gap-1">
                                                    <Clock className="size-3" />
                                                    {format(selectedMeeting.startedAt, "MMM d, yyyy · h:mm a")}
                                                </span>
                                                {selectedMeeting.endedAt && (
                                                    <span className="flex items-center gap-1">
                                                        <Clock className="size-3" /> {Math.round((selectedMeeting.endedAt - selectedMeeting.startedAt) / 60000)} min
                                                    </span>
                                                )}
                                                {(selectedMeeting.participants?.length ?? 0) > 0 && (
                                                    <span className="flex items-center gap-1">
                                                        <Users className="size-3" />
                                                        {selectedMeeting.participants?.length} participants
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                        <div className="flex flex-col sm:flex-row gap-2 shrink-0 w-full sm:w-auto">
                                            {!selectedMeeting.endedAt && (() => {
                                                const early = !!selectedMeeting.scheduledFor && nowTs < selectedMeeting.scheduledFor - 10 * 60_000
                                                return (
                                                    <Button
                                                        onClick={() => handleJoin(selectedMeeting.roomName, selectedMeeting._id)}
                                                        disabled={early}
                                                        title={early ? "You can join 10 minutes before it starts" : undefined}
                                                        className="bg-[#ff5018] hover:bg-[#e6430f] text-white h-8 rounded-lg font-semibold text-xs w-full sm:w-auto"
                                                    >
                                                        <Video className="size-3.5 mr-1" /> {early ? "Not open yet" : "Join Meeting"}
                                                    </Button>
                                                )
                                            })()}
                                            {!selectedMeeting.endedAt && !isUpcoming(selectedMeeting) && (perms.can("moderateMeetings") || selectedMeeting.createdBy === currentMember?._id) && (
                                                <Button
                                                    variant="outline"
                                                    onClick={() => handleEndForEveryone(selectedMeeting._id)}
                                                    className="h-8 rounded-lg font-semibold text-xs w-full sm:w-auto"
                                                >
                                                    End for everyone
                                                </Button>
                                            )}
                                            {(selectedMeeting.endedAt || isUpcoming(selectedMeeting)) &&
                                                (selectedMeeting.createdBy === currentMember?._id || (selectedMeeting.kind !== "oneToOne" && perms.can("moderateMeetings"))) && (
                                                <Button
                                                    variant="outline"
                                                    onClick={() => handleDelete(selectedMeeting._id)}
                                                    className="h-8 rounded-lg font-semibold text-xs w-full sm:w-auto text-red-600 hover:text-red-700"
                                                >
                                                    <Trash2 className="size-3.5 mr-1" /> {selectedMeeting.endedAt ? "Delete" : "Cancel meeting"}
                                                </Button>
                                            )}
                                        </div>
                                    </div>

                                    {/* Summary component */}
                                    {isUpcoming(selectedMeeting) ? (
                                        <div className="rounded-xl border bg-surface p-4 text-sm text-ink/70 flex items-start gap-3">
                                            <CalendarClock className="size-5 text-[#ff5018] shrink-0 mt-0.5" />
                                            <div>
                                                <p className="font-semibold text-ink">Scheduled for {format(selectedMeeting.scheduledFor!, "EEEE d MMMM, h:mm a")}</p>
                                                <p className="mt-1">Everyone in the workspace can join from 10 minutes before the start. The transcript and summary appear here afterwards.</p>
                                            </div>
                                        </div>
                                    ) : (
                                        <MeetingSummary meeting={selectedMeeting} />
                                    )}
                                </div>
                            ) : (
                                <div className="flex flex-col items-center justify-center h-full text-ink/60 gap-3 px-4">
                                    <div className="size-14 rounded-2xl bg-[#ff5018]/10 text-[#ff5018] flex items-center justify-center">
                                        <Video className="size-6 text-[#ff5018]" />
                                    </div>
                                    <p className="text-sm text-center">Select a meeting to view details</p>
                                </div>
                            )}
                        </div>
                    </>
                )}
            </div>

            <ConfirmDelete />
            {/* Create dialog */}
            <Dialog open={showCreate} onOpenChange={setShowCreate}>
                <DialogContent className="max-w-sm mx-4">
                    <DialogHeader>
                        <DialogTitle className="text-[17px] font-semibold tracking-tight">
                            {createMode === "oneToOne" ? "Call someone" : scheduleOn ? "Schedule a Meeting" : "Start a Meeting"}
                        </DialogTitle>
                    </DialogHeader>
                    <div className="flex flex-col gap-3 mt-2">
                        {createMode === "oneToOne" ? (
                            <>
                                <div>
                                    <label className="text-xs font-medium text-ink/60 mb-1 block">Who do you want to call?</label>
                                    <Select value={inviteeId} onValueChange={setInviteeId}>
                                        <SelectTrigger aria-label="Person to call" className="h-9 text-xs rounded-lg">
                                            <SelectValue placeholder="Choose a teammate..." />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {callable.map((m) => (
                                                <SelectItem key={m._id} value={m._id} className="text-xs">{m.user.name}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="bg-cream border rounded-lg p-3 text-xs text-ink/70">
                                    <p className="font-medium text-ink">Private, up to 15 minutes</p>
                                    <p className="mt-1">Only you two can see or join this call. It ends by itself at 15 minutes.</p>
                                </div>
                            </>
                        ) : (
                            <>
                                <Input aria-label="Meeting title"
                                    placeholder="Meeting title..."
                                    value={title}
                                    onChange={e => setTitle(e.target.value)}
                                    onKeyDown={e => e.key === "Enter" && handleCreate()}
                                    className="text-sm rounded-lg focus-visible:ring-[#ff5018]/40 focus-visible:border-[#ff5018]"
                                />
                                <label className="flex items-center gap-2 text-xs font-medium text-ink/70 cursor-pointer">
                                    <input type="checkbox" checked={scheduleOn} onChange={(e) => setScheduleOn(e.target.checked)} className="accent-[#ff5018]" />
                                    Schedule for later
                                </label>
                                {scheduleOn && (
                                    <Input aria-label="Meeting date and time" type="datetime-local" value={scheduleAt} min={format(new Date(nowTs + 60_000), "yyyy-MM-dd'T'HH:mm")}
                                        onChange={(e) => setScheduleAt(e.target.value)} className="text-sm rounded-lg" />
                                )}
                                <div>
                                    <label className="text-xs font-medium text-ink/60 mb-1 block">
                                        Post to channel (optional)
                                    </label>
                                    <Select value={selectedChannelId} onValueChange={setSelectedChannelId}>
                                        <SelectTrigger aria-label="Channel" className="h-9 text-xs rounded-lg">
                                            <SelectValue placeholder="Select a channel..." />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {channels?.map(c => (
                                                <SelectItem key={c._id} value={c._id} className="text-xs">
                                                    # {c.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                {!scheduleOn && (
                                    <div className="bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/30 rounded-lg p-3 text-xs text-amber-700 dark:text-amber-300">
                                        <p className="font-medium">Tip for transcripts</p>
                                        <p className="mt-1">Keep this tab in focus during the meeting for best transcript capture. You can also add transcripts manually after the meeting.</p>
                                    </div>
                                )}
                            </>
                        )}
                        <Button
                            onClick={handleCreate}
                            disabled={isCreating}
                            className="bg-[#ff5018] hover:bg-[#e6430f] text-white text-sm rounded-lg font-semibold"
                        >
                            {isCreating
                                ? <Loader className="size-4 animate-spin" />
                                : createMode === "oneToOne"
                                    ? <><Phone className="size-4 mr-2" /> Call now</>
                                    : scheduleOn
                                        ? <><CalendarClock className="size-4 mr-2" /> Schedule Meeting</>
                                        : <><Video className="size-4 mr-2" /> Start Meeting</>
                            }
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    )
}
