"use client"

import "@livekit/components-styles"
import {
    LiveKitRoom,
    VideoConference,
    RoomAudioRenderer,
} from "@livekit/components-react"
import { useEffect, useRef } from "react"

interface MeetingRoomProps {
    token: string
    serverUrl: string
    onDisconnect: (transcript: string) => void
}

export const MeetingRoom = ({ token, serverUrl, onDisconnect }: MeetingRoomProps) => {
    const transcriptRef = useRef<string>("")
    const recognitionRef = useRef<any>(null)

    useEffect(() => {
        // @ts-ignore
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
        if (!SpeechRecognition) {
            console.warn("Speech Recognition not supported")
            return
        }

        const recognition = new SpeechRecognition()
        recognition.continuous = true
        recognition.interimResults = false
        recognition.lang = "en-US"
        recognition.maxAlternatives = 1

        let stopped = false

        recognition.onresult = (event: any) => {
            for (let i = event.resultIndex; i < event.results.length; i++) {
                if (event.results[i].isFinal) {
                    const text = event.results[i][0].transcript
                    console.log("Transcript captured:", text)
                    transcriptRef.current += text + " "
                }
            }
        }

        recognition.onerror = (event: any) => {
            console.log("Speech recognition error:", event.error)
            if (!stopped && event.error !== "aborted") {
                setTimeout(() => {
                    if (!stopped) recognition.start()
                }, 1000)
            }
        }

        recognition.onend = () => {
            if (!stopped) {
                setTimeout(() => {
                    if (!stopped) recognition.start()
                }, 500)
            }
        }

        setTimeout(() => {
            if (!stopped) {
                recognition.start()
                console.log("Speech recognition started")
            }
        }, 2000)

        recognitionRef.current = recognition

        return () => {
            stopped = true
            recognitionRef.current = null
            try { recognition.stop() } catch {}
        }
    }, [])

    const handleDisconnect = () => {
        const recognition = recognitionRef.current
        recognitionRef.current = null
        try { recognition?.stop() } catch {}

        setTimeout(() => {
            console.log("Final transcript:", transcriptRef.current)
            onDisconnect(transcriptRef.current.trim())
        }, 500)
    }

    return (
        <LiveKitRoom
            token={token}
            serverUrl={serverUrl}
            connect={true}
            video={true}
            audio={true}
            onDisconnected={handleDisconnect}
            className="h-full w-full"
            data-lk-theme="default"
        >
            <VideoConference />
            <RoomAudioRenderer />
        </LiveKitRoom>
    )
}