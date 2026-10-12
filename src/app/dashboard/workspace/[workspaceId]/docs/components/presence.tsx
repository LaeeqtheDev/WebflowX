"use client"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Hint } from "../../components/hints"
import { cn } from "@/lib/utils"

// One person with the page open. Several tabs of the same person fold into one entry.
export interface DocPerson {
    id: string
    name: string
    color: string
    avatar: string
    typing: boolean
    self: boolean
    // the Yjs clients (tabs) this person has open, used to find their caret on the page
    clientIds: number[]
}

// What the server says about each open tab, used to label its caret.
export type ClientInfo = { name: string; avatar: string }

const FALLBACK_COLOR = "#ff5018"
// colours arrive from other people's browsers, so only plain hex values are ever put into styles
export const safeColor = (c: unknown) => (typeof c === "string" && /^#[0-9a-f]{6}$/i.test(c) ? c : FALLBACK_COLOR)

// One connection in the room, as Liveblocks reports it (a person has one per open tab).
export type RoomOther = { connectionId: number; id?: string | null; info?: unknown; presence?: unknown }

// Folds the room's connections into people: one entry per person however many tabs they have open.
// Names and photos come from the server (info); the colour is the one their caret is drawn in.
// `clients` is refilled with tab -> person so caret labels can be looked up.
export const foldPeople = (others: readonly RoomOther[], selfId: string | null, clients?: Map<number, ClientInfo>): DocPerson[] => {
    const byId = new Map<string, DocPerson>()
    clients?.clear()
    for (const o of others) {
        const info = (o.info ?? {}) as { name?: string; avatar?: string; color?: string }
        const presence = (o.presence ?? {}) as Record<string, unknown>
        const y = (presence.__yjs ?? {}) as { user?: { name?: string; color?: string }; activity?: { typing?: boolean } }
        const clientId = typeof presence.__yjs_clientid === "number" ? presence.__yjs_clientid : null
        const name = info.name || y.user?.name || "Someone"
        const avatar = info.avatar ?? ""
        if (clientId !== null) clients?.set(clientId, { name, avatar })
        const id = o.id ?? `connection-${o.connectionId}`
        // your own other tabs are still you
        if (selfId && id === selfId) continue
        const typing = y.activity?.typing === true
        const known = byId.get(id)
        if (known) {
            known.typing = known.typing || typing
            if (clientId !== null) known.clientIds.push(clientId)
        } else {
            byId.set(id, { id, name, avatar, color: safeColor(y.user?.color ?? info.color), typing, self: false, clientIds: clientId !== null ? [clientId] : [] })
        }
    }
    return [...byId.values()]
}

export const initialsOf = (name: string) => {
    const parts = name.trim().split(/\s+/).filter(Boolean)
    if (!parts.length) return "?"
    return (parts.length === 1 ? parts[0].slice(0, 1) : parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

// Dark ink on light presence colours, white on the rest, so a name stays readable on any of them.
export const inkOn = (hex: string) => {
    const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim())
    if (!m) return "#ffffff"
    const n = parseInt(m[1], 16)
    const lin = (c: number) => { const s = c / 255; return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4 }
    const lum = 0.2126 * lin((n >> 16) & 255) + 0.7152 * lin((n >> 8) & 255) + 0.0722 * lin(n & 255)
    return lum > 0.42 ? "#1b1017" : "#ffffff"
}

// "Liam is typing…", "Liam and Dev are typing…", "3 people are typing…"
export const typingLabel = (people: DocPerson[]) => {
    const names = people.filter((p) => p.typing && !p.self).map((p) => p.name.split(/\s+/)[0])
    if (!names.length) return null
    if (names.length === 1) return `${names[0]} is typing…`
    if (names.length === 2) return `${names[0]} and ${names[1]} are typing…`
    return `${names.length} people are typing…`
}

// Scrolls to where someone is working and flashes their name tag.
export const jumpToPerson = (person: DocPerson) => {
    for (const id of person.clientIds) {
        const caret = document.querySelector<HTMLElement>(`.collab-caret[data-client="${id}"]`)
        if (!caret) continue
        caret.scrollIntoView({ block: "center", behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" })
        caret.classList.remove("collab-caret--ping")
        // restart the animation if they are jumped to twice in a row
        void caret.offsetWidth
        // open their name tag for a moment so it is clear whose caret this is
        caret.classList.add("collab-caret--ping", "is-active")
        setTimeout(() => caret.classList.remove("collab-caret--ping", "is-active"), 3500)
        return true
    }
    return false
}

const SIZES = {
    sm: { box: "size-6", text: "text-[10px]", overlap: "-ml-1.5", dot: "size-2.5" },
    md: { box: "size-8", text: "text-[11px]", overlap: "-ml-2", dot: "size-3" },
} as const

const Face = ({ person, size }: { person: DocPerson; size: keyof typeof SIZES }) => {
    const s = SIZES[size]
    return (
        <span className="relative block rounded-full p-[2px]" style={{ backgroundColor: person.color }}>
            <Avatar className={cn(s.box, "rounded-full border-2 border-surface bg-transparent")}>
                {person.avatar && <AvatarImage src={person.avatar} />}
                <AvatarFallback className={cn("rounded-full font-semibold", s.text)} style={{ backgroundColor: person.color, color: inkOn(person.color) }}>
                    {initialsOf(person.name)}
                </AvatarFallback>
            </Avatar>
            {person.typing && !person.self && (
                <span aria-hidden="true" className={cn("wfx-typing-dot absolute -bottom-0.5 -right-0.5 flex items-center justify-center rounded-full border-2 border-surface", s.dot)} style={{ backgroundColor: person.color }} />
            )}
        </span>
    )
}

// The stack of faces in the page header: everyone with this page open, you included.
export const PresenceAvatars = ({ people, max = 4, size = "md", onJump, className }: {
    people: DocPerson[]
    max?: number
    size?: keyof typeof SIZES
    onJump?: (person: DocPerson) => void
    className?: string
}) => {
    if (!people.length) return null
    const shown = people.slice(0, max)
    const rest = people.slice(max)
    const s = SIZES[size]
    return (
        <ul aria-label={`${people.length} ${people.length === 1 ? "person" : "people"} on this page`} className={cn("flex items-center", className)}>
            {shown.map((p, i) => {
                const label = p.self ? `${p.name} (you)` : p.typing ? `${p.name} is typing…` : onJump ? `${p.name} · jump to cursor` : p.name
                return (
                    <li key={p.id} className={cn("rounded-full ring-2 ring-surface", i > 0 && s.overlap)} style={{ zIndex: shown.length - i }}>
                        <Hint label={label} side="bottom">
                            {onJump && !p.self ? (
                                <button type="button" aria-label={label} onClick={() => onJump(p)} className="block rounded-full transition-transform hover:-translate-y-0.5 focus-visible:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand motion-reduce:transition-none motion-reduce:hover:translate-y-0">
                                    <Face person={p} size={size} />
                                </button>
                            ) : (
                                <span aria-label={label} className="block"><Face person={p} size={size} /></span>
                            )}
                        </Hint>
                    </li>
                )
            })}
            {rest.length > 0 && (
                <li className={cn("rounded-full ring-2 ring-surface", s.overlap)}>
                    <Hint label={rest.map((p) => p.name).join(", ")} side="bottom">
                        <span className={cn("m-[2px] flex items-center justify-center rounded-full bg-cream-deep2 font-semibold text-ink/75", s.box, s.text)}>+{rest.length}</span>
                    </Hint>
                </li>
            )}
        </ul>
    )
}
