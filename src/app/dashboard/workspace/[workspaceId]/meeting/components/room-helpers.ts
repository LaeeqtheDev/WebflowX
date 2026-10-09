import { toast } from "sonner"
import type { Participant } from "livekit-client"

export type ModerateAction = "mute" | "stopVideo" | "muteAll" | "kick" | "endAll"

const COLORS = ["#ff5018", "#8b5cf6", "#0ea5e9", "#10b981", "#f59e0b", "#ec4899", "#14b8a6"]
export const colorFor = (s: string) => {
    let h = 0
    for (const c of s) h = (h * 31 + c.charCodeAt(0)) >>> 0
    return COLORS[h % COLORS.length]
}
export const initials = (name: string) =>
    name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]?.toUpperCase()).join("") || "?"
export const isHostParticipant = (p: Participant) => {
    try { return !!JSON.parse(p.metadata || "{}").host } catch { return false }
}
export const pad = (n: number) => String(n).padStart(2, "0")

export async function moderateRequest(room: string, action: ModerateAction, identity?: string) {
    try {
        const res = await fetch("/api/livekit/moderate", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ room, action, identity }),
        })
        const data = await res.json().catch(() => ({}))
        if (!res.ok) throw new Error(data.error || "Action failed")
        return true
    } catch (e) {
        toast.error(e instanceof Error ? e.message : "Action failed")
        return false
    }
}
