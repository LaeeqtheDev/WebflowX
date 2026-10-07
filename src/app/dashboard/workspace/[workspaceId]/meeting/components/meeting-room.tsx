"use client"

import "@livekit/components-styles"
import {
    LiveKitRoom,
    useLocalParticipant,
    useRoomContext,
} from "@livekit/components-react"
import { useEffect, useRef, useState } from "react"
import { DisconnectReason } from "livekit-client"
import { MeetingStage } from "./room-ui"
import { TranscriptSegment, setLastSegments } from "../segments"

interface MeetingRoomProps {
    token: string
    serverUrl: string
    roomName: string
    title: string
    startedAt: number
    onDisconnect: (transcript: string, reason: "left" | "removed" | "ended") => void
}

// Global singleton state
let globalWebSocket: WebSocket | null = null
let globalMediaRecorder: MediaRecorder | null = null
let globalTranscript = ""
let globalSegments: TranscriptSegment[] = []
let isInitializing = false  // Lock to prevent double init

const cleanupGlobals = () => {
    console.log("🧹 Cleaning up globals...")
    
    if (globalMediaRecorder) {
        try {
            if (globalMediaRecorder.state === 'recording') {
                globalMediaRecorder.stop()
            }
            const stream = globalMediaRecorder.stream
            if (stream) {
                stream.getTracks().forEach(track => track.stop())
            }
        } catch (e) {
            console.log("MediaRecorder cleanup error:", e)
        }
        globalMediaRecorder = null
    }
    
    if (globalWebSocket) {
        try {
            if (globalWebSocket.readyState === WebSocket.OPEN) {
                globalWebSocket.send(JSON.stringify({ type: 'CloseStream' }))
                globalWebSocket.close(1000, 'Cleanup')
            }
        } catch (e) {
            console.log("WebSocket cleanup error:", e)
        }
        globalWebSocket = null
    }
    
    isInitializing = false
}

const MeetingRoomInner = ({ onDisconnect, roomName, title, startedAt }: Pick<MeetingRoomProps, "onDisconnect" | "roomName" | "title" | "startedAt">) => {
    const room = useRoomContext()
    const { localParticipant } = useLocalParticipant()
    
    const [status, setStatus] = useState<"starting" | "recording" | "error">("starting")
    const [errorMessage, setErrorMessage] = useState<string>("")
    const [audioChunksSent, setAudioChunksSent] = useState(0)
    const [transcriptLength, setTranscriptLength] = useState(0)
    const hasInitializedRef = useRef(false)

    useEffect(() => {
        // Only initialize ONCE per component lifecycle
        if (hasInitializedRef.current) {
            console.log("⏭️ Already initialized, skipping")
            return
        }
        
        // Check if another instance is initializing
        if (isInitializing) {
            console.log("⏭️ Another instance is initializing, waiting...")
            const checkInterval = setInterval(() => {
                if (!isInitializing && globalWebSocket && globalWebSocket.readyState === WebSocket.OPEN) {
                    console.log("✅ Using existing connection")
                    setStatus("recording")
                    clearInterval(checkInterval)
                    hasInitializedRef.current = true
                }
            }, 100)
            return () => clearInterval(checkInterval)
        }
        
        // If already running AND active, use it
        if (globalWebSocket && globalWebSocket.readyState === WebSocket.OPEN && globalMediaRecorder) {
            console.log("✅ Using existing Deepgram connection")
            setStatus("recording")
            hasInitializedRef.current = true
            return
        }
        
        // If globals exist but are closed/dead, clean them up first
        if (globalWebSocket || globalMediaRecorder) {
            console.log("🧹 Cleaning up stale globals before starting new connection")
            cleanupGlobals()
        }
        
        console.log("🎬 Starting NEW Deepgram instance...")
        isInitializing = true
        hasInitializedRef.current = true
        
        const initDeepgram = async () => {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
                console.log("✅ Microphone OK")
                
                const response = await fetch('/api/deepgram-token')
                const data = await response.json()
                if (data.error) throw new Error(data.error)
                console.log("✅ API key OK")
                
                const params = new URLSearchParams({
                    'model': 'nova-2',
                    'language': 'en-US',
                    'smart_format': 'true',
                })
                
                const wsUrl = `wss://api.deepgram.com/v1/listen?${params.toString()}`
                const ws = new WebSocket(wsUrl, ['token', data.key])
                
                let chunkCount = 0
                
                ws.onopen = () => {
                    console.log("✅✅✅ WebSocket CONNECTED")
                    setStatus("recording")
                    isInitializing = false
                    
                    const mimeType = 'audio/webm;codecs=opus'
                    const mediaRecorder = new MediaRecorder(stream, { mimeType })
                    
                    mediaRecorder.ondataavailable = (event) => {
                        if (event.data.size > 0 && ws.readyState === WebSocket.OPEN) {
                            chunkCount++
                            ws.send(event.data)
                            setAudioChunksSent(chunkCount)
                        }
                    }
                    
                    mediaRecorder.start(1000)
                    globalMediaRecorder = mediaRecorder
                    console.log("✅ MediaRecorder started")
                }
                
                ws.onmessage = (message) => {
                    const data = JSON.parse(message.data)
                    
                    if (data.type === 'Results') {
                        const alternatives = data.channel?.alternatives || []
                        
                        if (alternatives.length > 0) {
                            const transcript = alternatives[0]?.transcript
                            
                            if (transcript && transcript.trim()) {
                                const time = new Date().toLocaleTimeString("en-US", { 
                                    hour: "2-digit", 
                                    minute: "2-digit" 
                                })
                                const speaker = localParticipant?.name || localParticipant?.identity || "Speaker"
                                const entry = `[${time}] ${speaker}: ${transcript}\n`
                                globalSegments.push({ t: Date.now(), speaker, text: transcript.trim() })
                                
                                console.log("✅ TRANSCRIPT:", transcript)
                                globalTranscript += entry
                                setTranscriptLength(globalTranscript.length)
                            }
                        }
                    }
                }
                
                ws.onerror = (error) => {
                    console.error("❌ WebSocket error")
                    setStatus("error")
                    setErrorMessage("Connection error")
                    isInitializing = false
                }
                
                ws.onclose = (event) => {
                    console.log("🔌 WebSocket closed:", event.code)
                }
                
                globalWebSocket = ws
                
            } catch (error: unknown) {
                console.error("❌ Init error:", error)
                setStatus("error")
                setErrorMessage(error instanceof Error ? error.message : String(error))
                isInitializing = false
            }
        }
        
        initDeepgram()
        
        return () => {
            console.log("🧹 Component cleanup (NOT stopping recording)")
            // Don't cleanup here - let disconnect handler do it
        }
    }, [localParticipant])

    // Handle room disconnect - the ONLY place we stop recording
    useEffect(() => {
        const handleDisconnected = (disconnectReason?: DisconnectReason) => {
            console.log("📴 ROOM DISCONNECTED - STOPPING ALL RECORDING")
            
            cleanupGlobals()

            setTimeout(() => {
                const finalTranscript = globalTranscript.trim()
                console.log("📄 Final transcript:", finalTranscript.length, "chars")
                console.log("📄 Content:", finalTranscript.substring(0, 200))
                
                // hand the segments over through a shared slot the page reads in onDisconnect
                setLastSegments(globalSegments)
                globalSegments = []
                const transcriptToSend = finalTranscript
                globalTranscript = "" // Reset
                
                const reason =
                    disconnectReason === DisconnectReason.PARTICIPANT_REMOVED ? "removed"
                        : disconnectReason === DisconnectReason.ROOM_DELETED ? "ended"
                            : "left"
                onDisconnect(transcriptToSend, reason)
            }, 500)
        }

        room.on("disconnected", handleDisconnected)
        
        return () => {
            room.off("disconnected", handleDisconnected)
        }
    }, [room, onDisconnect])

    return (
        <MeetingStage
            roomName={roomName}
            title={title}
            startedAt={startedAt}
            status={status}
            errorMessage={errorMessage}
        />
    )
}

export const MeetingRoom = ({ token, serverUrl, roomName, title, startedAt, onDisconnect }: MeetingRoomProps) => {
    return (
        <LiveKitRoom
            token={token}
            serverUrl={serverUrl}
            connect={true}
            video={true}
            audio={true}
            className="h-full w-full bg-[#150c11]"
            data-lk-theme="default"
            style={{
                "--lk-bg": "#2a1420",
                "--lk-bg2": "#381d2a",
                "--lk-bg3": "#402633",
                "--lk-control-bg": "#381d2a",
                "--lk-control-hover-bg": "#4a2a3a",
                "--lk-accent-bg": "#ff5018",
                "--lk-accent2": "#e6430f",
                "--lk-accent3": "#e6430f",
                "--lk-danger": "#dc2626",
                "--lk-border-radius": "1rem",
                "--lk-control-border-radius": "9999px",
            } as React.CSSProperties}
        >
            <MeetingRoomInner onDisconnect={onDisconnect} roomName={roomName} title={title} startedAt={startedAt} />
        </LiveKitRoom>
    )
}