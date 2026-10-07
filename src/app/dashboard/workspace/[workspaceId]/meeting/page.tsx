"use client"

import { useState, useCallback } from "react"
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
import { cn } from "@/lib/utils"
import { format } from "date-fns"
import { Loader, Video, Plus, Sparkles, Clock, Users, AlertTriangle, ArrowLeft } from "lucide-react"
import { useMutation } from "convex/react"
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
    const { data: members } = useGetMembers({ workspaceId })
    const { data: meetings, isLoading } = useGetMeetings({ workspaceId })
    const { data: channels } = useGetChannels({ workspaceId })
    const { mutate: createMeeting, isPending: isCreating } = useCreateMeeting()
    const endMeeting = useMutation(api.meetings.end)
    const saveSummary = useMutation(api.meetings.saveSummary)
    const createMessage = useMutation(api.messages.create)

    const [token, setToken] = useState<string | null>(null)
    const [serverUrl, setServerUrl] = useState<string | null>(null)
    const [activeMeetingId, setActiveMeetingId] = useState<Id<"meetings"> | null>(null)
    const [showCreate, setShowCreate] = useState(false)
    const [title, setTitle] = useState("")
    const [selectedChannelId, setSelectedChannelId] = useState("")
    const [isGenerating, setIsGenerating] = useState(false)
    const [selectedMeeting, setSelectedMeeting] = useState<NonNullable<typeof meetings>[number] | null>(null)
    const [generationError, setGenerationError] = useState<string | null>(null)
    const [showMobileDetail, setShowMobileDetail] = useState(false)

    const currentUserName = members?.find(m => m._id === currentMember?._id)?.user.name ?? "Someone"

    const handleJoin = async (roomName: string, meetingId: Id<"meetings">) => {
        try {
            const res = await fetch(
                `/api/livekit?room=${encodeURIComponent(roomName)}&username=${encodeURIComponent(currentUserName)}`
            )
            const data = await res.json()
            if (data.error) throw new Error(data.error)
            setToken(data.token)
            setServerUrl(data.url)
            setActiveMeetingId(meetingId)
        } catch (e) {
            toast.error("Failed to join meeting")
        }
    }

    const handleCreate = async () => {
        if (!title.trim()) return toast.error("Title is required")
        const roomName = `${workspaceId}-${Date.now()}`

        createMeeting({ workspaceId, title, roomName }, {
            onSuccess: async (id) => {
                if (!id) return
                setShowCreate(false)

                if (selectedChannelId) {
                    const meetingUrl = `${window.location.origin}/dashboard/workspace/${workspaceId}/meeting`
                    const body = JSON.stringify({
                        ops: [
                            { insert: `🎥 ${currentUserName} started a meeting: "${title}"\n` },
                            { insert: "Click below to join:\n" },
                            {
                                attributes: { link: meetingUrl },
                                insert: "🔗 Join Meeting"
                            },
                            { insert: "\n" }
                        ]
                    })
                    await createMessage({
                        workspaceId,
                        channelId: selectedChannelId as Id<"channels">,
                        body,
                    }).catch(console.error)
                }

                setTitle("")
                setSelectedChannelId("")
                await handleJoin(roomName, id)
            },
            onError: (e) => toast.error(e.message)
        })
    }

    const handleDisconnect = useCallback(async (transcript: string) => {
        const meetingId = activeMeetingId
        console.log("=== MEETING DISCONNECT ===")
        console.log("Meeting ID:", meetingId)
        console.log("Transcript length:", transcript?.length)
        console.log("Transcript preview:", transcript?.substring(0, 200))

        if (meetingId) {
            try {
                await endMeeting({ id: meetingId })
                console.log("Meeting ended successfully")
            } catch (e) {
                console.error("Failed to end meeting:", e)
            }
        }

        setToken(null)
        setServerUrl(null)
        setGenerationError(null)

        const hasValidTranscript = transcript && transcript.trim().length > 20

        if (hasValidTranscript) {
            setIsGenerating(true)
            toast.info("Generating AI summary...")
            
            try {
                console.log("Calling AI summary API...")
                const res = await fetch("/api/ai-summary", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ transcript: transcript.trim() })
                })
                
                const data = await res.json()
                console.log("AI summary response:", data)
                
                if (data.error) {
                    throw new Error(data.error)
                }

                if (meetingId && data.summary) {
                    await saveSummary({
                        id: meetingId,
                        summary: data.summary,
                        transcript: transcript.trim(),
                    })
                    console.log("Summary saved successfully")
                }
                
                toast.success("AI summary generated!")
            } catch (e: unknown) {
                console.error("Summary generation failed:", e)
                setGenerationError((e instanceof Error && e.message) || "Failed to generate summary")
                toast.error("Failed to generate summary. You can add it manually later.")
                
                if (meetingId) {
                    await saveSummary({
                        id: meetingId,
                        summary: "Summary generation failed. You can add a transcript and regenerate.",
                        transcript: transcript.trim(),
                    }).catch(console.error)
                }
            } finally {
                setIsGenerating(false)
                
                const checkInterval = setInterval(() => {
                    const meeting = meetings?.find(m => m._id === meetingId)
                    if (meeting?.endedAt) {
                        clearInterval(checkInterval)
                        setSelectedMeeting(meeting)
                        setActiveMeetingId(null)
                        console.log("✅ Auto-selected updated meeting for viewing")
                    }
                }, 500)
                
                setTimeout(() => {
                    clearInterval(checkInterval)
                    setActiveMeetingId(null)
                    const meeting = meetings?.find(m => m._id === meetingId)
                    if (meeting) {
                        setSelectedMeeting(meeting)
                        console.log("⚠️ Force-selected meeting after timeout")
                    }
                }, 5000)
            }
        } else {
            console.log("No valid transcript captured")
            
            if (meetingId) {
                await saveSummary({
                    id: meetingId,
                    summary: "No transcript was captured for this meeting. You can add one manually to generate a summary.",
                    transcript: "",
                }).catch(console.error)
            }
            
            toast.info("No transcript captured. You can add one manually from the meeting details.")
            
            const checkInterval = setInterval(() => {
                const meeting = meetings?.find(m => m._id === meetingId)
                if (meeting?.endedAt) {
                    clearInterval(checkInterval)
                    setSelectedMeeting(meeting)
                    setActiveMeetingId(null)
                    console.log("✅ Auto-selected updated meeting for viewing")
                }
            }, 500)
            
            setTimeout(() => {
                clearInterval(checkInterval)
                setActiveMeetingId(null)
                const meeting = meetings?.find(m => m._id === meetingId)
                if (meeting) {
                    setSelectedMeeting(meeting)
                    console.log("⚠️ Force-selected meeting after timeout")
                }
            }, 5000)
        }
    }, [activeMeetingId, endMeeting, saveSummary, meetings])

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
                    onDisconnect={handleDisconnect}
                />
            </div>
        )
    }

    // Generating summary screen
    if (isGenerating) {
        return (
            <div className="h-full flex items-center justify-center flex-col gap-3 px-4 bg-[#fbf9f7]">
                <div className="size-14 rounded-2xl bg-[#ff5018]/10 text-[#ff5018] flex items-center justify-center">
                    <Sparkles className="size-6 text-[#ff5018] animate-pulse" />
                </div>
                <p className="font-semibold tracking-tight text-center text-[#1b1017]">Generating AI summary...</p>
                <p className="text-sm text-[#1b1017]/60 text-center">This will just take a moment</p>
            </div>
        )
    }

    return (
        <div className="h-full flex flex-col bg-[#fbf9f7]">
            {/* Header */}
            <div className="flex items-center justify-between px-4 sm:px-6 h-14 border-b bg-white shrink-0">
                <div className="flex items-center gap-2">
                    {showMobileDetail && (
                        <Button
                            variant="ghost"
                            size="sm"
                            className="md:hidden -ml-2 h-7 px-2"
                            onClick={handleBackToList}
                        >
                            <ArrowLeft className="size-4" />
                        </Button>
                    )}
                    <div className="size-8 rounded-lg bg-[#ff5018]/10 flex items-center justify-center">
                        <Video className="size-4 text-[#ff5018]" />
                    </div>
                    <h1 className="tracking-tight text-[17px] font-semibold text-[#1b1017]">Meetings</h1>
                </div>
                <Button
                    onClick={() => setShowCreate(true)}
                    className="bg-[#ff5018] hover:bg-[#e6430f] text-white h-8 rounded-lg font-semibold text-xs px-2.5 sm:px-3"
                >
                    <Plus className="size-3.5 sm:size-4 sm:mr-1" /> 
                    <span className="hidden sm:inline">New Meeting</span>
                </Button>
            </div>

            {/* Error banner */}
            {generationError && (
                <div className="mx-4 sm:mx-6 mt-3 sm:mt-4 p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-2">
                    <AlertTriangle className="size-4 text-amber-600 shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                        <p className="text-xs sm:text-sm font-medium text-amber-800">Summary generation had an issue</p>
                        <p className="text-[10px] sm:text-xs text-amber-600 mt-0.5">{generationError}</p>
                        <p className="text-[10px] sm:text-xs text-amber-600 mt-1">You can add a transcript manually from the meeting details.</p>
                    </div>
                    <button 
                        onClick={() => setGenerationError(null)}
                        className="text-amber-600 hover:text-amber-800 text-lg shrink-0"
                    >
                        ×
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
                    <div className="flex-1 flex flex-col items-center justify-center gap-3 text-[#1b1017]/60 px-4">
                        <div className="size-14 rounded-2xl bg-[#ff5018]/10 text-[#ff5018] flex items-center justify-center">
                            <Video className="size-6 text-[#ff5018]" />
                        </div>
                        <p className="font-semibold tracking-tight text-[#1b1017] text-center">No meetings yet</p>
                        <p className="text-sm text-center">Start a meeting to talk with your team</p>
                        <Button onClick={() => setShowCreate(true)} size="sm" className="bg-[#ff5018] hover:bg-[#e6430f] text-white rounded-lg font-semibold">
                            <Plus className="size-4 mr-1" /> Start a Meeting
                        </Button>
                    </div>
                ) : (
                    <>
                        {/* Left panel: meeting list - Hidden on mobile when detail is shown */}
                        <div className={cn(
                            "w-full md:w-80 border-r bg-white flex flex-col overflow-y-auto shrink-0 p-3 gap-2",
                            showMobileDetail && "hidden md:flex"
                        )}>
                            {meetings?.map(meeting => (
                                <div
                                    key={meeting._id}
                                    onClick={() => handleSelectMeeting(meeting)}
                                    className={cn(
                                        "flex flex-col gap-1 px-3 sm:px-4 py-3 bg-white rounded-xl border cursor-pointer hover:border-[#ff5018]/40 hover:shadow-sm transition-colors",
                                        selectedMeeting?._id === meeting._id && "border-[#ff5018]/60 bg-[#f7f2ee]"
                                    )}
                                >
                                    <div className="flex items-center justify-between gap-2">
                                        <p className="text-sm font-semibold tracking-tight truncate text-[#1b1017]">{meeting.title}</p>
                                        {!meeting.endedAt && (
                                            <Badge className="bg-red-50 text-red-700 border-transparent rounded-md px-2 py-0.5 text-[11px] font-medium shrink-0">
                                                <span className="size-1.5 rounded-full bg-red-500 animate-pulse mr-1.5" />
                                                Live
                                            </Badge>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-2 text-xs text-[#1b1017]/60 flex-wrap">
                                        <span className="flex items-center gap-1">
                                            <Clock className="size-3" />
                                            {format(meeting.startedAt, "MMM d · h:mm a")}
                                        </span>
                                        {meeting.endedAt && (
                                            <span>· {Math.round((meeting.endedAt - meeting.startedAt) / 60000)} min</span>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-1.5 mt-0.5">
                                        <Avatar className="size-4 rounded-md">
                                            <AvatarImage src={meeting.creator?.user?.image} />
                                            <AvatarFallback className="text-[8px] rounded-md bg-[#381d2a] text-white">
                                                {meeting.creator?.user?.name?.[0] ?? "?"}
                                            </AvatarFallback>
                                        </Avatar>
                                        <span className="text-[11px] text-[#1b1017]/60 truncate">
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
                                            <h2 className="text-lg sm:text-xl font-semibold tracking-tight text-[#1b1017] break-words">{selectedMeeting.title}</h2>
                                            <div className="flex items-center gap-2 sm:gap-3 text-xs text-[#1b1017]/60 mt-1 flex-wrap">
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
                                        {!selectedMeeting.endedAt && (
                                            <Button
                                                onClick={() => handleJoin(selectedMeeting.roomName, selectedMeeting._id)}
                                                className="bg-[#ff5018] hover:bg-[#e6430f] text-white h-8 rounded-lg font-semibold text-xs shrink-0 w-full sm:w-auto"
                                            >
                                                <Video className="size-3.5 mr-1" /> Join Meeting
                                            </Button>
                                        )}
                                    </div>

                                    {/* Summary component */}
                                    <MeetingSummary meeting={selectedMeeting} />
                                </div>
                            ) : (
                                <div className="flex flex-col items-center justify-center h-full text-[#1b1017]/60 gap-3 px-4">
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

            {/* Create dialog */}
            <Dialog open={showCreate} onOpenChange={setShowCreate}>
                <DialogContent className="max-w-sm mx-4">
                    <DialogHeader>
                        <DialogTitle className="text-[17px] font-semibold tracking-tight">Start a Meeting</DialogTitle>
                    </DialogHeader>
                    <div className="flex flex-col gap-3 mt-2">
                        <Input
                            placeholder="Meeting title..."
                            value={title}
                            onChange={e => setTitle(e.target.value)}
                            onKeyDown={e => e.key === "Enter" && handleCreate()}
                            className="text-sm rounded-lg focus-visible:ring-[#ff5018]/40 focus-visible:border-[#ff5018]"
                        />
                        <div>
                            <label className="text-xs font-medium text-[#1b1017]/60 mb-1 block">
                                Post to channel (optional)
                            </label>
                            <Select value={selectedChannelId} onValueChange={setSelectedChannelId}>
                                <SelectTrigger className="h-9 text-xs rounded-lg">
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
                        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-700">
                            <p className="font-medium">Tip for transcripts</p>
                            <p className="mt-1">Keep this tab in focus during the meeting for best transcript capture. You can also add transcripts manually after the meeting.</p>
                        </div>
                        <Button
                            onClick={handleCreate}
                            disabled={isCreating}
                            className="bg-[#ff5018] hover:bg-[#e6430f] text-white text-sm rounded-lg font-semibold"
                        >
                            {isCreating
                                ? <Loader className="size-4 animate-spin" />
                                : <><Video className="size-4 mr-2" /> Start Meeting</>
                            }
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    )
}