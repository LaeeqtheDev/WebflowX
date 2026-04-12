"use client"

import { format } from "date-fns"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { 
    Clock, 
    Users, 
    ChevronDown, 
    ChevronUp, 
    Sparkles, 
    Pencil, 
    Check, 
    X, 
    RefreshCw,
    FileText,
    Loader2
} from "lucide-react"
import { useState } from "react"
import { useMutation } from "convex/react"
import { toast } from "sonner"
import { api } from "../../../../../../../convex/_generated/api"
import { Id } from "../../../../../../../convex/_generated/dataModel"
import { Textarea } from "@/components/ui/textarea"
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog"

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
    const [isGenerating, setIsGenerating] = useState(false)
    const [showTranscriptDialog, setShowTranscriptDialog] = useState(false)
    const [manualTranscript, setManualTranscript] = useState("")
    
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

    const generateSummary = async (transcript: string) => {
        if (!transcript || transcript.length < 10) {
            toast.error("Transcript is too short to generate a summary")
            return
        }

        setIsGenerating(true)
        try {
            const res = await fetch("/api/ai-summary", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ transcript })
            })
            
            const data = await res.json()
            
            if (data.error) {
                throw new Error(data.error)
            }

            await saveSummary({
                id: meeting._id,
                summary: data.summary,
                transcript: transcript,
            })
            
            setEditedSummary(data.summary)
            toast.success("AI summary generated!")
            setShowTranscriptDialog(false)
            setManualTranscript("")
        } catch (e: any) {
            console.error("Summary generation error:", e)
            toast.error(e.message || "Failed to generate summary")
        } finally {
            setIsGenerating(false)
        }
    }

    const handleRegenerateSummary = () => {
        if (meeting.transcript && meeting.transcript.length > 10) {
            generateSummary(meeting.transcript)
        } else {
            setShowTranscriptDialog(true)
        }
    }

    const handleManualTranscriptSubmit = () => {
        if (manualTranscript.trim().length < 10) {
            toast.error("Please enter a longer transcript")
            return
        }
        generateSummary(manualTranscript.trim())
    }

    return (
        <>
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
                {meeting.summary && meeting.summary !== "No transcript was captured for this meeting." ? (
                    <div className="bg-linear-to-br from-orange-50 to-amber-50 border border-orange-100 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-1.5">
                                <Sparkles className="size-3.5 text-[#ff5018]" />
                                <span className="text-xs font-semibold text-[#ff5018]">AI Summary</span>
                            </div>
                            <div className="flex items-center gap-2">
                                {!isEditing && (
                                    <>
                                        <button
                                            onClick={handleRegenerateSummary}
                                            disabled={isGenerating}
                                            className="text-[10px] text-muted-foreground hover:text-[#ff5018] flex items-center gap-1 transition-colors disabled:opacity-50"
                                        >
                                            {isGenerating ? (
                                                <Loader2 className="size-3 animate-spin" />
                                            ) : (
                                                <RefreshCw className="size-3" />
                                            )}
                                            {isGenerating ? "Generating..." : "Regenerate"}
                                        </button>
                                        <span className="text-muted-foreground">·</span>
                                        <button
                                            onClick={() => setIsEditing(true)}
                                            className="text-[10px] text-muted-foreground hover:text-[#ff5018] flex items-center gap-1 transition-colors"
                                        >
                                            <Pencil className="size-3" /> Edit
                                        </button>
                                    </>
                                )}
                                {isEditing && (
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
                    <div className="bg-muted/50 rounded-lg p-4 flex flex-col gap-3">
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Sparkles className="size-3.5" />
                            No summary available for this meeting.
                        </div>
                        <Button
                            onClick={() => setShowTranscriptDialog(true)}
                            disabled={isGenerating}
                            variant="outline"
                            size="sm"
                            className="w-fit text-xs"
                        >
                            {isGenerating ? (
                                <>
                                    <Loader2 className="size-3 mr-1.5 animate-spin" />
                                    Generating...
                                </>
                            ) : (
                                <>
                                    <FileText className="size-3 mr-1.5" />
                                    Add Transcript & Generate Summary
                                </>
                            )}
                        </Button>
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
                            {showTranscript ? "Hide" : "Show"} transcript ({meeting.transcript.length} chars)
                        </button>
                        {showTranscript && (
                            <div className="mt-2 bg-muted/30 rounded-lg p-3 text-xs text-muted-foreground whitespace-pre-wrap max-h-48 overflow-y-auto leading-relaxed font-mono">
                                {meeting.transcript}
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Manual Transcript Dialog */}
            <Dialog open={showTranscriptDialog} onOpenChange={setShowTranscriptDialog}>
                <DialogContent className="max-w-lg">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <FileText className="size-5 text-[#ff5018]" />
                            Add Meeting Transcript
                        </DialogTitle>
                        <DialogDescription>
                            Paste or type the meeting transcript below. The AI will analyze it and generate a summary.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="flex flex-col gap-4 mt-2">
                        <Textarea
                            placeholder="Paste your meeting transcript here...

Example:
[10:00 AM] John: Let's discuss the Q4 roadmap
[10:01 AM] Sarah: I think we should focus on the mobile app
[10:02 AM] John: Agreed, let's prioritize that..."
                            value={manualTranscript}
                            onChange={e => setManualTranscript(e.target.value)}
                            className="min-h-50 text-sm font-mono"
                        />
                        <div className="flex items-center justify-between">
                            <span className="text-xs text-muted-foreground">
                                {manualTranscript.length} characters
                            </span>
                            <div className="flex gap-2">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                        setShowTranscriptDialog(false)
                                        setManualTranscript("")
                                    }}
                                >
                                    Cancel
                                </Button>
                                <Button
                                    onClick={handleManualTranscriptSubmit}
                                    disabled={isGenerating || manualTranscript.trim().length < 10}
                                    size="sm"
                                    className="bg-[#ff5018]/80 hover:bg-[#ff5018] text-white"
                                >
                                    {isGenerating ? (
                                        <>
                                            <Loader2 className="size-3 mr-1.5 animate-spin" />
                                            Generating...
                                        </>
                                    ) : (
                                        <>
                                            <Sparkles className="size-3 mr-1.5" />
                                            Generate Summary
                                        </>
                                    )}
                                </Button>
                            </div>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </>
    )
}