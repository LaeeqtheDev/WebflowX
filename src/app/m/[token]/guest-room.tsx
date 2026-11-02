"use client"

import "@livekit/components-styles"
import { LiveKitRoom, VideoConference } from "@livekit/components-react"

export const GuestRoom = ({ token, url, onLeave }: { token: string; url: string; onLeave: () => void }) => (
  <div data-lk-theme="default" className="h-dvh w-full bg-[#1b0d15]">
    <LiveKitRoom token={token} serverUrl={url} connect video audio onDisconnected={onLeave} className="h-full">
      <VideoConference />
    </LiveKitRoom>
  </div>
)
