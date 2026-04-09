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
import { Loader, Video, Plus, Sparkles, Clock, Users } from "lucide-react"
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

        if (meetingId) {
            await endMeeting({ id: meetingId })
        }

        setToken(null)
        setServerUrl(null)

        if (transcript && transcript.length > 20) {
            setIsGenerating(true)
            toast.info("Generating AI summary...")
            try {
                const res = await fetch("/api/ai-summary", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ transcript })
                })
                const data = await res.json()
                if (data.error) throw new Error(data.error)

                if (meetingId) {
                    await saveSummary({
                        id: meetingId,
                        summary: data.summary,
                        transcript,
                    })
                }
                toast.success("AI summary generated!")
            } catch (e) {
                toast.error("Failed to generate summary")
            } finally {
                setIsGenerating(false)
                setActiveMeetingId(null)
            }
        } else {
            if (meetingId) {
                await saveSummary({
                    id: meetingId,
                    summary: "No transcript was captured for this meeting.",
                    transcript: "",
                }).catch(console.error)
            }
            setActiveMeetingId(null)
        }
    }, [activeMeetingId, endMeeting, saveSummary])

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