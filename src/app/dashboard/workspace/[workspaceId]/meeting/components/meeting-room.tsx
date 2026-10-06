"use client"

import "@livekit/components-styles"
import {
    LiveKitRoom,
    VideoConference,
    RoomAudioRenderer,
    useLocalParticipant,
    useRoomContext,
} from "@livekit/components-react"
import { useEffect, useRef, useState } from "react"
import { Mic, AlertCircle } from "lucide-react"

interface MeetingRoomProps {
    token: string
    serverUrl: string
    onDisconnect: (transcript: string) => void
}

// Global singleton state
let globalWebSocket: WebSocket | null = null
let globalMediaRecorder: MediaRecorder | null = null
let globalTranscript = ""
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

const MeetingRoomInner = ({ onDisconnect }: { onDisconnect: (transcript: string) => void }) => {
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
                                const speaker = localParticipant?.identity || "Speaker"
                                const entry = `[${time}] ${speaker}: ${transcript}\n`
                                
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
        const handleDisconnected = () => {
            console.log("📴 ROOM DISCONNECTED - STOPPING ALL RECORDING")
            
            cleanupGlobals()

            setTimeout(() => {
                const finalTranscript = globalTranscript.trim()
                console.log("📄 Final transcript:", finalTranscript.length, "chars")
                console.log("📄 Content:", finalTranscript.substring(0, 200))
                
                const transcriptToSend = finalTranscript
                globalTranscript = "" // Reset
                
                onDisconnect(transcriptToSend)
            }, 500)
        }

        room.on("disconnected", handleDisconnected)
        
        return () => {
            room.off("disconnected", handleDisconnected)
        }
    }, [room, onDisconnect])

    return (
        <div className="h-full w-full relative bg-[#2a1420]">
            <VideoConference />
            <RoomAudioRenderer />
            
            <div className="absolute top-4 left-4 z-50">
                {status === "recording" && (
                    <div className="flex items-center gap-2 bg-green-600/95 text-white px-3 py-1.5 rounded-lg text-xs font-medium shadow-sm">
                        <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-white"></span>
                        </span>
                        Recording • {audioChunksSent} chunks
                    </div>
                )}
                
                {status === "starting" && (
                    <div className="flex items-center gap-2 bg-[#ff5018] text-white px-3 py-1.5 rounded-lg text-xs font-medium shadow-sm">
                        <Mic className="size-3 animate-pulse" />
                        Initializing...
                    </div>
                )}
                
                {status === "error" && (
                    <div className="flex flex-col gap-2 bg-red-600/95 text-white p-3 rounded-xl text-xs shadow-sm max-w-sm">
                        <div className="flex items-center gap-2">
                            <AlertCircle className="size-4" />
                            <span className="font-semibold">Error</span>
                        </div>
                        <p className="text-[11px]">{errorMessage}</p>
                    </div>
                )}
            </div>

            <div className="absolute bottom-4 left-4 z-50 bg-[#2a1420]/90 border border-white/10 text-white/80 text-[10px] px-3 py-2 rounded-lg font-mono">
                <div>Status: <strong>{status}</strong></div>
                <div>Chunks sent: <strong>{audioChunksSent}</strong></div>
                <div>Transcript: <strong>{transcriptLength} chars</strong></div>
            </div>
        </div>
    )
}

export const MeetingRoom = ({ token, serverUrl, onDisconnect }: MeetingRoomProps) => {
    return (
        <LiveKitRoom
            token={token}
            serverUrl={serverUrl}
            connect={true}
            video={true}
            audio={true}
            className="h-full w-full bg-[#2a1420]"
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
            <MeetingRoomInner onDisconnect={onDisconnect} />
        </LiveKitRoom>
    )
}