"use client"

import "@livekit/components-styles"
import {
    LiveKitRoom,
    VideoConference,
    RoomAudioRenderer,
    useLocalParticipant,
    useRoomContext,
} from "@livekit/components-react"
import { useEffect, useRef, useState, useCallback } from "react"
import { Mic, MicOff, AlertCircle } from "lucide-react"

// TypeScript declarations for Speech Recognition API
interface ISpeechRecognition extends EventTarget {
    continuous: boolean
    interimResults: boolean
    lang: string
    maxAlternatives: number
    start(): void
    stop(): void
    abort(): void
    onstart: ((this: ISpeechRecognition, ev: Event) => void) | null
    onend: ((this: ISpeechRecognition, ev: Event) => void) | null
    onerror: ((this: ISpeechRecognition, ev: ISpeechRecognitionErrorEvent) => void) | null
    onresult: ((this: ISpeechRecognition, ev: ISpeechRecognitionEvent) => void) | null
}

interface ISpeechRecognitionErrorEvent extends Event {
    error: string
    message?: string
}

interface ISpeechRecognitionEvent extends Event {
    resultIndex: number
    results: ISpeechRecognitionResultList
}

interface ISpeechRecognitionResultList {
    length: number
    item(index: number): ISpeechRecognitionResult
    [index: number]: ISpeechRecognitionResult
}

interface ISpeechRecognitionResult {
    isFinal: boolean
    length: number
    item(index: number): ISpeechRecognitionAlternative
    [index: number]: ISpeechRecognitionAlternative
}

interface ISpeechRecognitionAlternative {
    transcript: string
    confidence: number
}

interface ISpeechRecognitionConstructor {
    new(): ISpeechRecognition
}

declare global {
    interface Window {
        SpeechRecognition?: ISpeechRecognitionConstructor
        webkitSpeechRecognition?: ISpeechRecognitionConstructor
    }
}

interface MeetingRoomProps {
    token: string
    serverUrl: string
    onDisconnect: (transcript: string) => void
}

// Inner component that has access to room context
const MeetingRoomInner = ({ onDisconnect }: { onDisconnect: (transcript: string) => void }) => {
    const room = useRoomContext()
    const { localParticipant } = useLocalParticipant()
    
    const transcriptRef = useRef<string>("")
    const recognitionRef = useRef<ISpeechRecognition | null>(null)
    const [status, setStatus] = useState<"starting" | "recording" | "paused" | "error" | "unsupported">("starting")
    const [errorMessage, setErrorMessage] = useState<string>("")
    const stoppedRef = useRef(false)
    const restartTimeoutRef = useRef<NodeJS.Timeout | null>(null)

    // Check for speech recognition support
    const getSpeechRecognition = useCallback((): ISpeechRecognitionConstructor | null => {
        if (typeof window === "undefined") return null
        return window.SpeechRecognition || window.webkitSpeechRecognition || null
    }, [])

    // Initialize and start recognition
    const initRecognition = useCallback(() => {
        const SpeechRecognition = getSpeechRecognition()
        
        if (!SpeechRecognition) {
            console.error("Speech Recognition not supported in this browser")
            setStatus("unsupported")
            setErrorMessage("Speech recognition not supported. Try Chrome or Edge.")
            return null
        }

        // Clean up existing
        if (recognitionRef.current) {
            try { 
                recognitionRef.current.stop() 
            } catch (e) {
                console.log("Error stopping previous recognition:", e)
            }
        }

        const recognition = new SpeechRecognition()
        
        // Configuration
        recognition.continuous = true
        recognition.interimResults = false
        recognition.lang = "en-US"
        recognition.maxAlternatives = 1

        recognition.onstart = () => {
            console.log("✅ Speech recognition STARTED")
            setStatus("recording")
            setErrorMessage("")
        }

        recognition.onresult = (event: ISpeechRecognitionEvent) => {
            console.log("📝 Speech result received, results:", event.results.length)
            
            for (let i = event.resultIndex; i < event.results.length; i++) {
                const result = event.results[i]
                if (result.isFinal) {
                    const text = result[0].transcript.trim()
                    if (text) {
                        const timestamp = new Date().toLocaleTimeString("en-US", { 
                            hour: "2-digit", 
                            minute: "2-digit" 
                        })
                        const speaker = localParticipant?.identity || "Speaker"
                        const entry = `[${timestamp}] ${speaker}: ${text}\n`
                        
                        console.log("📝 Adding to transcript:", entry)
                        transcriptRef.current += entry
                    }
                }
            }
        }

        recognition.onerror = (event: ISpeechRecognitionErrorEvent) => {
            console.log("❌ Speech recognition error:", event.error, event.message)
            
            if (event.error === "not-allowed") {
                setStatus("error")
                setErrorMessage("Microphone permission denied. Please allow access and refresh.")
                return
            }
            
            if (event.error === "no-speech") {
                console.log("No speech detected, continuing...")
                return
            }
            
            if (event.error === "audio-capture") {
                setStatus("error")
                setErrorMessage("No microphone found. Please connect one and refresh.")
                return
            }
            
            if (event.error === "aborted") {
                console.log("Recognition aborted")
                return
            }
            
            if (event.error === "network") {
                setErrorMessage("Network error. Retrying...")
            } else {
                setErrorMessage(`Error: ${event.error}. Retrying...`)
            }
            
            if (!stoppedRef.current) {
                scheduleRestart()
            }
        }

        recognition.onend = () => {
            console.log("🔄 Speech recognition ENDED, stopped:", stoppedRef.current)
            
            if (!stoppedRef.current) {
                setStatus("paused")
                scheduleRestart()
            }
        }

        recognitionRef.current = recognition
        return recognition
    }, [getSpeechRecognition, localParticipant])

    // Schedule a restart with debouncing
    const scheduleRestart = useCallback(() => {
        if (restartTimeoutRef.current) {
            clearTimeout(restartTimeoutRef.current)
        }
        
        restartTimeoutRef.current = setTimeout(() => {
            if (!stoppedRef.current && recognitionRef.current) {
                console.log("🔄 Attempting to restart recognition...")
                try {
                    recognitionRef.current.start()
                } catch (e: unknown) {
                    const error = e as Error
                    console.log("Restart failed:", error.message)
                    if (!error.message?.includes("already started")) {
                        const newRecognition = initRecognition()
                        if (newRecognition) {
                            try {
                                newRecognition.start()
                            } catch (e2) {
                                console.error("Failed to start new recognition:", e2)
                            }
                        }
                    }
                }
            }
        }, 300)
    }, [initRecognition])

    // Manual start button handler
    const handleManualStart = useCallback(() => {
        console.log("👆 Manual start requested")
        stoppedRef.current = false
        
        const recognition = initRecognition()
        if (recognition) {
            try {
                recognition.start()
                console.log("Manual start initiated")
            } catch (e) {
                console.error("Manual start failed:", e)
            }
        }
    }, [initRecognition])

    // Initialize on mount
    useEffect(() => {
        console.log("🎬 MeetingRoom mounted, initializing speech recognition...")
        stoppedRef.current = false
        
        // Request microphone permission first
        navigator.mediaDevices.getUserMedia({ audio: true })
            .then((stream) => {
                console.log("✅ Microphone permission granted")
                stream.getTracks().forEach(track => track.stop())
                
                setTimeout(() => {
                    const recognition = initRecognition()
                    if (recognition) {
                        try {
                            recognition.start()
                            console.log("🎤 Speech recognition start() called")
                        } catch (e) {
                            console.error("Failed to start recognition:", e)
                            setStatus("error")
                            setErrorMessage("Failed to start speech recognition")
                        }
                    }
                }, 1000)
            })
            .catch((err) => {
                console.error("❌ Microphone permission denied:", err)
                setStatus("error")
                setErrorMessage("Microphone access denied. Please allow and refresh.")
            })

        const handleVisibility = () => {
            if (document.visibilityState === "visible" && !stoppedRef.current) {
                console.log("👁️ Tab visible, checking recognition...")
                if (status !== "recording") {
                    scheduleRestart()
                }
            }
        }

        document.addEventListener("visibilitychange", handleVisibility)

        return () => {
            console.log("🛑 MeetingRoom unmounting, cleaning up...")
            stoppedRef.current = true
            document.removeEventListener("visibilitychange", handleVisibility)
            
            if (restartTimeoutRef.current) {
                clearTimeout(restartTimeoutRef.current)
            }
            
            if (recognitionRef.current) {
                try { 
                    recognitionRef.current.stop() 
                } catch (e) {
                    console.log("Cleanup stop error:", e)
                }
                recognitionRef.current = null
            }
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    // Handle room disconnect
    useEffect(() => {
        const handleDisconnected = () => {
            console.log("📴 Room disconnected")
            stoppedRef.current = true
            
            if (restartTimeoutRef.current) {
                clearTimeout(restartTimeoutRef.current)
            }
            
            if (recognitionRef.current) {
                try { 
                    recognitionRef.current.stop() 
                } catch (e) {
                    // ignore
                }
                recognitionRef.current = null
            }

            setTimeout(() => {
                const finalTranscript = transcriptRef.current.trim()
                console.log("📄 Final transcript length:", finalTranscript.length)
                console.log("📄 Final transcript:", finalTranscript || "(empty)")
                onDisconnect(finalTranscript)
            }, 500)
        }

        room.on("disconnected", handleDisconnected)
        
        return () => {
            room.off("disconnected", handleDisconnected)
        }
    }, [room, onDisconnect])

    // Status indicator component
    const StatusIndicator = () => {
        switch (status) {
            case "recording":
                return (
                    <div className="flex items-center gap-2 bg-green-500/90 text-white px-3 py-1.5 rounded-full text-xs shadow-lg">
                        <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-white"></span>
                        </span>
                        Recording transcript...
                    </div>
                )
            case "paused":
                return (
                    <div className="flex items-center gap-2 bg-yellow-500/90 text-white px-3 py-1.5 rounded-full text-xs shadow-lg">
                        <MicOff className="size-3" />
                        <span>Transcript paused</span>
                        <button 
                            onClick={handleManualStart}
                            className="ml-1 bg-white/20 hover:bg-white/30 px-2 py-0.5 rounded text-[10px]"
                        >
                            Restart
                        </button>
                    </div>
                )
            case "error":
                return (
                    <div className="flex items-center gap-2 bg-red-500/90 text-white px-3 py-1.5 rounded-full text-xs shadow-lg max-w-md">
                        <AlertCircle className="size-3 shrink-0" />
                        <span className="truncate">{errorMessage}</span>
                    </div>
                )
            case "unsupported":
                return (
                    <div className="flex items-center gap-2 bg-gray-500/90 text-white px-3 py-1.5 rounded-full text-xs shadow-lg">
                        <AlertCircle className="size-3" />
                        Browser doesn&apos;t support speech recognition
                    </div>
                )
            case "starting":
            default:
                return (
                    <div className="flex items-center gap-2 bg-blue-500/90 text-white px-3 py-1.5 rounded-full text-xs shadow-lg">
                        <Mic className="size-3 animate-pulse" />
                        Starting transcript...
                    </div>
                )
        }
    }

    return (
        <div className="h-full w-full relative">
            <VideoConference />
            <RoomAudioRenderer />
            
            {/* Recording status indicator */}
            <div className="absolute top-4 left-4 z-50">
                <StatusIndicator />
            </div>

            {/* Debug info */}
            <div className="absolute bottom-4 left-4 z-50 bg-black/70 text-white text-[10px] px-2 py-1 rounded font-mono max-w-xs">
                Transcript: {transcriptRef.current.length} chars
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
            className="h-full w-full"
            data-lk-theme="default"
        >
            <MeetingRoomInner onDisconnect={onDisconnect} />
        </LiveKitRoom>
    )
}