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
import { Loader, Video, Plus, Sparkles, Clock, Users, AlertTriangle } from "lucide-react"
import { useMutation } from "convex/react"
import { api } from "../../../../../../convex/_generated/api"
import { Id } from "../../../../../../convex/_generated/dataModel"
import { useRouter } from "next/navigation"
import { useCreateMeeting } from "@/features/meetings/use-create-meetings"
import { useGetMeetings } from "@/features/meetings/use-get-meetings"
import { MeetingRoom } from "./components/meeting-room"
import { MeetingSummary } from "./components/meeting-summary"

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
    const [selectedMeeting, setSelectedMeeting] = useState<any>(null)
    const [generationError, setGenerationError] = useState<string | null>(null)

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

        // Check if we have a meaningful transcript
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
            } catch (e: any) {
                console.error("Summary generation failed:", e)
                setGenerationError(e.message || "Failed to generate summary")
                toast.error("Failed to generate summary. You can add it manually later.")
                
                // Still save the transcript even if summary failed
                if (meetingId) {
                    await saveSummary({
                        id: meetingId,
                        summary: "Summary generation failed. You can add a transcript and regenerate.",
                        transcript: transcript.trim(),
                    }).catch(console.error)
                }
            } finally {
                setIsGenerating(false)
                
                // ✅ Wait for Convex to refetch and update the meeting data
                // Check periodically until we see the updated meeting with endedAt
                const checkInterval = setInterval(() => {
                    const meeting = meetings?.find(m => m._id === meetingId)
                    if (meeting?.endedAt) {
                        // Meeting has been updated with endedAt timestamp
                        clearInterval(checkInterval)
                        setSelectedMeeting(meeting)
                        setActiveMeetingId(null)
                        console.log("✅ Auto-selected updated meeting for viewing")
                    }
                }, 500) // Check every 500ms
                
                // Safety timeout - stop checking after 5 seconds
                setTimeout(() => {
                    clearInterval(checkInterval)
                    setActiveMeetingId(null)
                    // Force select the meeting even if not updated yet
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
            
            // ✅ Wait for Convex to refetch and update the meeting data
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
                // Force select the meeting even if not updated yet
                const meeting = meetings?.find(m => m._id === meetingId)
                if (meeting) {
                    setSelectedMeeting(meeting)
                    console.log("⚠️ Force-selected meeting after timeout")
                }
            }, 5000)
        }
    }, [activeMeetingId, endMeeting, saveSummary, meetings])

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
            <div className="h-full flex items-center justify-center flex-col gap-4">
                <Sparkles className="size-8 text-[#ff5018] animate-pulse" />
                <p className="text-sm font-medium">Generating AI summary...</p>
                <p className="text-xs text-muted-foreground">This will just take a moment</p>
            </div>
        )
    }

    return (
        <div className="h-full flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b shrink-0">
                <div className="flex items-center gap-2">
                    <Video className="size-5 text-[#ff5018]" />
                    <h1 className="text-lg font-bold">Meetings</h1>
                </div>
                <Button
                    onClick={() => setShowCreate(true)}
                    className="bg-[#ff5018]/80 hover:bg-[#ff5018] text-white h-8 text-xs"
                >
                    <Plus className="size-4 mr-1" /> New Meeting
                </Button>
            </div>

            {/* Error banner */}
            {generationError && (
                <div className="mx-6 mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-2">
                    <AlertTriangle className="size-4 text-amber-600 shrink-0 mt-0.5" />
                    <div className="flex-1">
                        <p className="text-sm font-medium text-amber-800">Summary generation had an issue</p>
                        <p className="text-xs text-amber-600 mt-0.5">{generationError}</p>
                        <p className="text-xs text-amber-600 mt-1">You can add a transcript manually from the meeting details.</p>
                    </div>
                    <button 
                        onClick={() => setGenerationError(null)}
                        className="text-amber-600 hover:text-amber-800"
                    >
                        ×
                    </button>
                </div>
            )}

            {/* Body */}
            <div className="flex-1 flex overflow-hidden">
                {isLoading ? (
                    <div className="flex-1 flex items-center justify-center">
                        <Loader className="size-6 animate-spin text-[#ff5018]" />
                    </div>
                ) : meetings?.length === 0 ? (
                    <div className="flex-1 flex flex-col items-center justify-center gap-3 text-muted-foreground">
                        <Video className="size-12" />
                        <p className="text-sm">No meetings yet</p>
                        <Button onClick={() => setShowCreate(true)} variant="outline" size="sm">
                            <Plus className="size-4 mr-1" /> Start a Meeting
                        </Button>
                    </div>
                ) : (
                    <>
                        {/* Left panel: meeting list */}
                        <div className="w-72 border-r flex flex-col overflow-y-auto shrink-0">
                            {meetings?.map(meeting => (
                                <div
                                    key={meeting._id}
                                    onClick={() => setSelectedMeeting(meeting)}
                                    className={cn(
                                        "flex flex-col gap-1 px-4 py-3 border-b cursor-pointer hover:bg-muted/40 transition-colors",
                                        selectedMeeting?._id === meeting._id && "bg-muted/60 border-l-2 border-l-[#ff5018]"
                                    )}
                                >
                                    <div className="flex items-center justify-between gap-2">
                                        <p className="text-sm font-medium truncate">{meeting.title}</p>
                                        {!meeting.endedAt && (
                                            <Badge className="bg-red-100 text-red-600 border-red-200 text-[10px] animate-pulse shrink-0">
                                                🔴 Live
                                            </Badge>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                        <span className="flex items-center gap-1">
                                            <Clock className="size-3" />
                                            {format(meeting.startedAt, "MMM d · h:mm a")}
                                        </span>
                                        {meeting.endedAt && (
                                            <span>· {Math.round((meeting.endedAt - meeting.startedAt) / 60000)} min</span>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-1.5 mt-0.5">
                                        <Avatar className="size-4">
                                            <AvatarImage src={(meeting as any).creator?.user?.image} />
                                            <AvatarFallback className="text-[8px]">
                                                {(meeting as any).creator?.user?.name?.[0] ?? "?"}
                                            </AvatarFallback>
                                        </Avatar>
                                        <span className="text-[11px] text-muted-foreground truncate">
                                            {(meeting as any).creator?.user?.name}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Right panel: meeting detail */}
                        <div className="flex-1 overflow-y-auto p-6">
                            {selectedMeeting ? (
                                <div className="flex flex-col gap-4">
                                    {/* Meeting header */}
                                    <div className="flex items-start justify-between">
                                        <div>
                                            <h2 className="text-xl font-bold">{selectedMeeting.title}</h2>
                                            <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1 flex-wrap">
                                                <span className="flex items-center gap-1">
                                                    <Clock className="size-3" />
                                                    {format(selectedMeeting.startedAt, "MMM d, yyyy · h:mm a")}
                                                </span>
                                                {selectedMeeting.endedAt && (
                                                    <span className="flex items-center gap-1">
                                                        ⏱ {Math.round((selectedMeeting.endedAt - selectedMeeting.startedAt) / 60000)} min
                                                    </span>
                                                )}
                                                {selectedMeeting.participants?.length > 0 && (
                                                    <span className="flex items-center gap-1">
                                                        <Users className="size-3" />
                                                        {selectedMeeting.participants.length} participants
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                        {!selectedMeeting.endedAt && (
                                            <Button
                                                onClick={() => handleJoin(selectedMeeting.roomName, selectedMeeting._id)}
                                                className="bg-[#ff5018]/80 hover:bg-[#ff5018] text-white h-8 text-xs shrink-0"
                                            >
                                                <Video className="size-3.5 mr-1" /> Join Meeting
                                            </Button>
                                        )}
                                    </div>

                                    {/* Summary component */}
                                    <MeetingSummary meeting={selectedMeeting} />
                                </div>
                            ) : (
                                <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-3">
                                    <Video className="size-10" />
                                    <p className="text-sm">Select a meeting to view details</p>
                                </div>
                            )}
                        </div>
                    </>
                )}
            </div>

            {/* Create dialog */}
            <Dialog open={showCreate} onOpenChange={setShowCreate}>
                <DialogContent className="max-w-sm">
                    <DialogHeader>
                        <DialogTitle>Start a Meeting</DialogTitle>
                    </DialogHeader>
                    <div className="flex flex-col gap-3 mt-2">
                        <Input
                            placeholder="Meeting title..."
                            value={title}
                            onChange={e => setTitle(e.target.value)}
                            onKeyDown={e => e.key === "Enter" && handleCreate()}
                        />
                        <div>
                            <label className="text-xs text-muted-foreground mb-1 block">
                                Post to channel (optional)
                            </label>
                            <Select value={selectedChannelId} onValueChange={setSelectedChannelId}>
                                <SelectTrigger className="h-8 text-xs">
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
                        <div className="bg-amber-50 border border-amber-200 rounded-md p-2 text-xs text-amber-700">
                            <p className="font-medium">💡 Tip for transcripts</p>
                            <p className="mt-1">Keep this tab in focus during the meeting for best transcript capture. You can also add transcripts manually after the meeting.</p>
                        </div>
                        <Button
                            onClick={handleCreate}
                            disabled={isCreating}
                            className="bg-[#ff5018]/80 hover:bg-[#ff5018] text-white"
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