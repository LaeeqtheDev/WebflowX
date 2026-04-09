"use client"

import { format } from "date-fns"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Clock, Users, ChevronDown, ChevronUp, Sparkles, Pencil, Check, X } from "lucide-react"
import { useState } from "react"
import { useMutation } from "convex/react"

import { toast } from "sonner"
import { api } from "../../../../../../../convex/_generated/api"
import { Id } from "../../../../../../../convex/_generated/dataModel"

type Meeting = {
    _id: Id<"meetings">
    title: string
    startedAt: number
    endedAt?: number
    summary?: string
    transcript?: string
    participants?: string[]
    creator: { user: { name?: string; image?: string } | null } | null
}

interface MeetingSummaryProps {
    meeting: Meeting
}

export const MeetingSummary = ({ meeting }: MeetingSummaryProps) => {
    const [showTranscript, setShowTranscript] = useState(false)
    const [isEditing, setIsEditing] = useState(false)
    const [editedSummary, setEditedSummary] = useState(meeting.summary ?? "")
    const saveSummary = useMutation(api.meetings.saveSummary)

    const duration = meeting.endedAt
        ? Math.round((meeting.endedAt - meeting.startedAt) / 60000)
        : null

    const handleSave = async () => {
        try {
            await saveSummary({
                id: meeting._id,
                summary: editedSummary,
                transcript: meeting.transcript,
            })
            toast.success("Summary updated")
            setIsEditing(false)
        } catch (e) {
            toast.error("Failed to update summary")
        }
    }

    const handleCancel = () => {
        setEditedSummary(meeting.summary ?? "")
        setIsEditing(false)
    }

    return (
        <div className="border rounded-xl p-5 flex flex-col gap-4 hover:shadow-sm transition-shadow bg-white">
            {/* Header */}
            <div className="flex items-start justify-between">
                <div className="flex flex-col gap-1.5">
                    <div className="flex items-center gap-2">
                        <h3 className="font-semibold">{meeting.title}</h3>
                        {!meeting.endedAt && (
                            <Badge className="bg-red-100 text-red-600 border-red-200 text-[10px] animate-pulse">
                                🔴 Live
                            </Badge>
                        )}
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                            <Clock className="size-3" />
                            {format(meeting.startedAt, "MMM d, yyyy · h:mm a")}
                        </span>
                        {duration !== null && (
                            <span className="flex items-center gap-1">
                                ⏱ {duration} min
                            </span>
                        )}
                        {meeting.participants && meeting.participants.length > 0 && (
                            <span className="flex items-center gap-1">
                                <Users className="size-3" />
                                {meeting.participants.length} participants
                            </span>
                        )}
                    </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                    <Avatar className="size-7">
                        <AvatarImage src={meeting.creator?.user?.image} />
                        <AvatarFallback className="text-[10px]">
                            {meeting.creator?.user?.name?.[0] ?? "?"}
                        </AvatarFallback>
                    </Avatar>
                    <span className="text-xs text-muted-foreground">
                        {meeting.creator?.user?.name}
                    </span>
                </div>
            </div>

            {/* AI Summary */}
            {meeting.summary ? (
                <div className="bg-linear-to-br from-orange-50 to-amber-50 border border-orange-100 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-1.5">
                            <Sparkles className="size-3.5 text-[#ff5018]" />
                            <span className="text-xs font-semibold text-[#ff5018]">AI Summary</span>
                        </div>
                        {!isEditing ? (
                            <button
                                onClick={() => setIsEditing(true)}
                                className="text-[10px] text-muted-foreground hover:text-[#ff5018] flex items-center gap-1 transition-colors"
                            >
                                <Pencil className="size-3" /> Edit
                            </button>
                        ) : (
                            <div className="flex items-center gap-1">
                                <button
                                    onClick={handleSave}
                                    className="text-[10px] text-green-600 hover:text-green-700 flex items-center gap-1"
                                >
                                    <Check className="size-3" /> Save
                                </button>
                                <span className="text-muted-foreground">·</span>
                                <button
                                    onClick={handleCancel}
                                    className="text-[10px] text-muted-foreground hover:text-destructive flex items-center gap-1"
                                >
                                    <X className="size-3" /> Cancel
                                </button>
                            </div>
                        )}
                    </div>
                    {isEditing ? (
                        <textarea
                            value={editedSummary}
                            onChange={e => setEditedSummary(e.target.value)}
                            className="w-full text-xs text-muted-foreground bg-white/70 border border-orange-200 rounded-md p-2 resize-none h-48 outline-none focus:border-[#ff5018] transition-colors leading-relaxed"
                        />
                    ) : (
                        <div className="text-xs text-muted-foreground whitespace-pre-wrap leading-relaxed">
                            {meeting.summary}
                        </div>
                    )}
                </div>
            ) : meeting.endedAt ? (
                <div className="bg-muted/50 rounded-lg p-3 text-xs text-muted-foreground flex items-center gap-2">
                    <Sparkles className="size-3.5" />
                    No summary available for this meeting.
                </div>
            ) : null}

            {/* Transcript toggle */}
            {meeting.transcript && meeting.transcript.length > 0 && (
                <div>
                    <button
                        onClick={() => setShowTranscript(v => !v)}
                        className="text-xs text-muted-foreground flex items-center gap-1 hover:text-foreground transition-colors"
                    >
                        {showTranscript
                            ? <ChevronUp className="size-3" />
                            : <ChevronDown className="size-3" />}
                        {showTranscript ? "Hide" : "Show"} transcript
                    </button>
                    {showTranscript && (
                        <div className="mt-2 bg-muted/30 rounded-lg p-3 text-xs text-muted-foreground whitespace-pre-wrap max-h-48 overflow-y-auto leading-relaxed">
                            {meeting.transcript}
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}