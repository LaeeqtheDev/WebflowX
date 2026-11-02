"use client"

import { useCallback, useEffect, useRef, useState } from "react"

// Records the call from the host's own browser: the meeting tab (everyone's video and voices) mixed with the
// host's microphone, saved as a .webm file on their computer when they stop. Nothing is uploaded.
// The browser asks the host to pick what to record; choosing this tab gives the best result.
export const useCallRecorder = (fileName: string, getMicTrack: () => MediaStreamTrack | undefined) => {
    const [recording, setRecording] = useState(false)
    const [startedAt, setStartedAt] = useState<number | null>(null)
    const rec = useRef<MediaRecorder | null>(null)
    const cleanup = useRef<(() => void) | null>(null)

    const stop = useCallback(() => {
        if (rec.current && rec.current.state !== "inactive") rec.current.stop()
    }, [])

    const start = useCallback(async () => {
        if (!navigator.mediaDevices?.getDisplayMedia || typeof MediaRecorder === "undefined") {
            throw new Error("This browser can't record calls. Try Chrome or Edge on a computer.")
        }
        const display = await navigator.mediaDevices.getDisplayMedia({
            video: { frameRate: 24 },
            audio: true,
            // ask for this tab first (Chrome and Edge); other browsers ignore these hints
            ...({ preferCurrentTab: true, selfBrowserSurface: "include", systemAudio: "include" } as object),
        } as DisplayMediaStreamOptions)
        const ctx = new AudioContext()
        const mix = ctx.createMediaStreamDestination()
        if (display.getAudioTracks().length) ctx.createMediaStreamSource(new MediaStream(display.getAudioTracks())).connect(mix)
        const mic = getMicTrack()
        if (mic) ctx.createMediaStreamSource(new MediaStream([mic])).connect(mix)
        const stream = new MediaStream([...display.getVideoTracks(), ...mix.stream.getAudioTracks()])
        const mime = ["video/webm;codecs=vp9,opus", "video/webm;codecs=vp8,opus", "video/webm"].find((m) => MediaRecorder.isTypeSupported(m))
        const r = new MediaRecorder(stream, mime ? { mimeType: mime, videoBitsPerSecond: 2_500_000 } : undefined)
        const chunks: Blob[] = []
        r.ondataavailable = (e) => { if (e.data.size) chunks.push(e.data) }
        r.onstop = () => {
            cleanup.current?.()
            const blob = new Blob(chunks, { type: "video/webm" })
            if (blob.size) {
                const a = document.createElement("a")
                a.href = URL.createObjectURL(blob)
                a.download = `${fileName}.webm`
                a.click()
                setTimeout(() => URL.revokeObjectURL(a.href), 5000)
            }
            setRecording(false); setStartedAt(null); rec.current = null
        }
        cleanup.current = () => {
            display.getTracks().forEach((t) => t.stop())
            void ctx.close().catch(() => {})
            cleanup.current = null
        }
        // stopping the share from the browser's own bar stops the recording too
        display.getVideoTracks()[0]?.addEventListener("ended", () => { if (r.state !== "inactive") r.stop() })
        r.start(1000)
        rec.current = r
        setRecording(true); setStartedAt(Date.now())
    }, [fileName, getMicTrack])

    // leaving the call saves what was recorded
    useEffect(() => () => { if (rec.current && rec.current.state !== "inactive") rec.current.stop() }, [])

    return { recording, startedAt, start, stop }
}
