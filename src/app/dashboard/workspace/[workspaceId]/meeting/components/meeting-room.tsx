"use client"

import "@livekit/components-styles"
import {
    LiveKitRoom,
    useConnectionState,
    useLocalParticipant,
    useRoomContext,
} from "@livekit/components-react"
import { useEffect, useRef, useState } from "react"
import { ConnectionState, DisconnectReason } from "livekit-client"
import { toast } from "sonner"
import { MeetingStage } from "./room-ui"
import { TranscriptSegment, setLastSegments } from "../segments"

interface MeetingRoomProps {
    token: string
    serverUrl: string
    roomName: string
    title: string
    startedAt: number
    /** One-to-one calls stop at this time (epoch ms). */
    endsAt?: number
    onDisconnect: (transcript: string, reason: "left" | "removed" | "ended" | "lost") => void
}

// Transcription lives outside React so it survives re-renders. Each person's browser transcribes their own microphone.
type DgStatus = "starting" | "recording" | "error"
let globalWebSocket: WebSocket | null = null
let globalMediaRecorder: MediaRecorder | null = null
let globalStream: MediaStream | null = null
let globalTranscript = ""
let globalSegments: TranscriptSegment[] = []
let keepAliveTimer: ReturnType<typeof setInterval> | null = null
let reconnectTimer: ReturnType<typeof setTimeout> | null = null
let closing = false      // true once we are stopping on purpose, so a closed socket isn't re-opened
let generation = 0       // bumps on every (re)start so late callbacks from an old attempt are ignored
let attempts = 0

const stopSocket = () => {
    if (keepAliveTimer) { clearInterval(keepAliveTimer); keepAliveTimer = null }
    if (reconnectTimer) { clearTimeout(reconnectTimer); reconnectTimer = null }
    if (globalMediaRecorder) {
        try { if (globalMediaRecorder.state !== "inactive") globalMediaRecorder.stop() } catch { /* already stopped */ }
        globalMediaRecorder = null
    }
    if (globalWebSocket) {
        const ws = globalWebSocket
        globalWebSocket = null
        ws.onclose = null
        ws.onerror = null
        try {
            if (ws.readyState === WebSocket.OPEN) { ws.send(JSON.stringify({ type: "CloseStream" })); ws.close(1000, "done") }
            else if (ws.readyState === WebSocket.CONNECTING) ws.close()
        } catch { /* already closed */ }
    }
}

const cleanupGlobals = () => {
    closing = true // late replies from the speech service are still kept for a moment so the last sentence isn't lost
    stopSocket()
    if (globalStream) {
        globalStream.getTracks().forEach((t) => t.stop())
        globalStream = null
    }
}

type Hooks = {
    setStatus: (s: DgStatus, message?: string) => void
    onText: () => void
    speaker: () => string
    roomConnected: () => boolean
}

const MIME_CHOICES = ["audio/webm;codecs=opus", "audio/webm", "audio/ogg;codecs=opus", "audio/mp4"]

async function startTranscription(h: Hooks) {
    closing = false
    const gen = ++generation
    stopSocket()
    h.setStatus("starting")
    const fail = (message: string) => {
        if (gen !== generation) return
        console.error("[transcript]", message)
        h.setStatus("error", message)
    }

    try {
        if (!globalStream || globalStream.getAudioTracks().every((t) => t.readyState !== "live")) {
            try {
                globalStream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } })
            } catch {
                return fail("The browser blocked the microphone for transcription. Allow it from the lock icon in the address bar, then press Retry.")
            }
        }
        if (gen !== generation || closing) return

        const res = await fetch("/api/deepgram-token", { cache: "no-store" })
        const data = await res.json().catch(() => ({}))
        if (gen !== generation || closing) return
        if (!res.ok || !data.key) return fail(data.error || `Couldn't start live captions (${res.status}).`)

        const mime = MIME_CHOICES.find((m) => typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(m))
        if (!mime) return fail("This browser can't record audio for live captions. Try Chrome, Edge or Safari 14.1+.")

        const params = new URLSearchParams({ model: "nova-2", language: "en-US", smart_format: "true", punctuate: "true" })
        const ws = new WebSocket(`wss://api.deepgram.com/v1/listen?${params.toString()}`, [data.type === "bearer" ? "bearer" : "token", data.key])
        globalWebSocket = ws

        ws.onopen = () => {
            if (gen !== generation || closing || !globalStream) return
            attempts = 0
            h.setStatus("recording")
            const rec = new MediaRecorder(globalStream, { mimeType: mime })
            rec.ondataavailable = (e) => {
                if (e.data.size > 0 && ws.readyState === WebSocket.OPEN) ws.send(e.data)
            }
            rec.start(500)
            globalMediaRecorder = rec
            // Deepgram drops idle sockets; this keeps a quiet stretch from ending the transcript
            keepAliveTimer = setInterval(() => {
                if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ type: "KeepAlive" }))
            }, 8000)
        }

        ws.onmessage = (m) => {
            if (gen !== generation) return
            let msg
            try { msg = JSON.parse(m.data) } catch { return }
            if (msg.type !== "Results" || msg.is_final === false) return
            const line = msg.channel?.alternatives?.[0]?.transcript?.trim()
            if (!line) return
            const speaker = h.speaker()
            const time = new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })
            globalSegments.push({ t: Date.now(), speaker, text: line })
            globalTranscript += `[${time}] ${speaker}: ${line}\n`
            h.onText()
        }

        ws.onerror = () => { /* onclose follows and decides what to do */ }

        ws.onclose = (ev) => {
            if (gen !== generation || closing) return
            stopSocket()
            // 1008 / 4xx close codes mean the credentials were refused: retrying the same way won't help
            if (ev.code === 1008 || ev.code === 4001 || ev.code === 4401) {
                return fail("Live captions were refused by the speech service. Check the Deepgram key on the server.")
            }
            if (!h.roomConnected() || attempts >= 5) return fail("Live captions disconnected. Press Retry to reconnect.")
            attempts++
            h.setStatus("starting")
            reconnectTimer = setTimeout(() => { void startTranscription(h) }, Math.min(1000 * 2 ** attempts, 15000))
        }
    } catch (e) {
        fail(e instanceof Error ? e.message : "Couldn't start live captions.")
    }
}

const MeetingRoomInner = ({ onDisconnect, roomName, title, startedAt, endsAt }: Pick<MeetingRoomProps, "onDisconnect" | "roomName" | "title" | "startedAt" | "endsAt">) => {
    const room = useRoomContext()
    const [left, setLeft] = useState<number | null>(null)
    const warned = useRef(false)
    // time-limited call: count down, warn at one minute, hang up at the limit
    useEffect(() => {
        if (!endsAt) return
        const tick = () => {
            const ms = endsAt - Date.now()
            setLeft(Math.max(0, ms))
            if (ms <= 60_000 && !warned.current) { warned.current = true; toast.info("One minute left. This call ends automatically at 15 minutes.") }
            if (ms <= 0) { clearInterval(timer); void room.disconnect() }
        }
        const timer = setInterval(tick, 1000)
        tick()
        return () => clearInterval(timer)
    }, [endsAt, room])
    const { localParticipant } = useLocalParticipant()

    const [status, setStatus] = useState<DgStatus>("starting")
    const [errorMessage, setErrorMessage] = useState<string>("")
    const [, setTick] = useState(0)

    // read the latest name / connection state at the moment a line arrives
    const nameRef = useRef("Speaker")
    useEffect(() => { nameRef.current = localParticipant?.name || localParticipant?.identity || "Speaker" }, [localParticipant])
    const roomRef = useRef(room)
    useEffect(() => { roomRef.current = room }, [room])

    const hooks = useRef<Hooks>({
        setStatus: (st, message) => { setStatus(st); setErrorMessage(message ?? "") },
        onText: () => setTick((n) => n + 1),
        speaker: () => nameRef.current,
        roomConnected: () => roomRef.current.state === ConnectionState.Connected,
    })

    const retry = () => {
        attempts = 0
        void startTranscription(hooks.current)
    }

    // Start once when the room is joined. The room-disconnect handler below is the only place that stops it.
    const started = useRef(false)
    useEffect(() => {
        if (started.current) return
        started.current = true
        // a stale connection from an earlier visit in this tab is dropped first
        void startTranscription(hooks.current)
    }, [])

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
                            : disconnectReason === DisconnectReason.CLIENT_INITIATED || disconnectReason === undefined ? "left"
                                : "lost"
                onDisconnect(transcriptToSend, reason)
            }, 500)
        }

        room.on("disconnected", handleDisconnected)
        
        return () => {
            room.off("disconnected", handleDisconnected)
        }
    }, [room, onDisconnect])

    return (
        <>
            <MeetingStage
                roomName={roomName}
                title={title}
                startedAt={startedAt}
                status={status}
                errorMessage={errorMessage}
                onRetry={retry}
            />
            {left !== null && (
                <div role="timer" className={`pointer-events-none absolute right-4 top-4 z-40 rounded-full px-3 py-1 text-xs font-semibold text-white shadow-lg ${left <= 60_000 ? "bg-red-600" : "bg-avatar"}`}>
                    Ends in {Math.floor(left / 60000)}:{String(Math.floor((left % 60000) / 1000)).padStart(2, "0")}
                </div>
            )}
        </>
    )
}

// Shown over the call whenever LiveKit is reconnecting (it retries by itself), so the screen never just freezes.
const ConnectionBanner = () => {
    const state = useConnectionState()
    if (state === ConnectionState.Connected || state === ConnectionState.Connecting) return null
    const reconnecting = state === ConnectionState.Reconnecting || state === ConnectionState.SignalReconnecting
    return (
        <div role="status" className="pointer-events-none absolute left-1/2 top-4 z-50 -translate-x-1/2 rounded-full bg-amber-500 px-4 py-2 text-sm font-semibold text-white shadow-lg">
            {reconnecting ? "Connection lost. Reconnecting…" : "Disconnected from the meeting"}
        </div>
    )
}

export const MeetingRoom = ({ token, serverUrl, roomName, title, startedAt, endsAt, onDisconnect }: MeetingRoomProps) => {
    return (
        <LiveKitRoom
            token={token}
            serverUrl={serverUrl}
            connect={true}
            video={true}
            audio={true}
            onMediaDeviceFailure={(failure, kind) => {
                const what = kind === "videoinput" ? "camera" : kind === "audioinput" ? "microphone" : "device"
                toast.error(`Couldn't use your ${what}`, { description: failure === "PermissionDenied" ? "Allow access from the lock icon in the address bar, then try again." : failure === "NotFound" ? `No ${what} was found on this computer.` : "Another app may be using it." })
            }}
            className="relative h-full w-full bg-rail"
            data-lk-theme="default"
            style={{
                "--lk-bg": "var(--wfx-chrome)",
                "--lk-bg2": "var(--wfx-avatar)",
                "--lk-bg3": "var(--sidebar)",
                "--lk-control-bg": "var(--wfx-avatar)",
                "--lk-control-hover-bg": "var(--sidebar-accent)",
                "--lk-accent-bg": "var(--wfx-accent)",
                "--lk-accent2": "var(--wfx-accent-hover)",
                "--lk-accent3": "var(--wfx-accent-hover)",
                "--lk-danger": "#dc2626",
                "--lk-border-radius": "1rem",
                "--lk-control-border-radius": "9999px",
            } as React.CSSProperties}
        >
            <ConnectionBanner />
            <MeetingRoomInner onDisconnect={onDisconnect} roomName={roomName} title={title} startedAt={startedAt} endsAt={endsAt} />
        </LiveKitRoom>
    )
}