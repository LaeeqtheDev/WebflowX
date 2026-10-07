import { ConvexError } from "convex/values"

// Server-side size caps. The UI has its own limits, but anyone can call the API directly.
export const MAX = {
    messageBody: 20_000,   // raw Quill delta JSON
    noteTitle: 120,
    noteBody: 50_000,
    taskTitle: 200,
    taskDescription: 5_000,
    taskComment: 2_000,
    label: 30,
    labelCount: 10,
    sprintName: 80,
    meetingTitle: 120,
    roomName: 200,
    summary: 20_000,
    transcript: 400_000,
    workspaceName: 60,
    channelDescription: 250,
} as const

// Trim, optionally collapse whitespace, and reject (rather than silently cut) anything too long.
export function text(raw: string, max: number, label: string, opts: { required?: boolean; collapse?: boolean } = {}): string {
    let s = raw.trim()
    if (opts.collapse) s = s.replace(/\s+/g, " ")
    if (opts.required && !s) throw new ConvexError(`${label} is required`)
    if (s.length > max) throw new ConvexError(`${label} is too long (max ${max.toLocaleString()} characters)`)
    return s
}

// Messages are stored as Quill delta JSON. Refuse anything that is not one, or is oversized.
export function assertDeltaBody(body: string): void {
    if (body.length > MAX.messageBody) {
        throw new ConvexError(`That message is too long (max ${MAX.messageBody.toLocaleString()} characters)`)
    }
    let parsed: unknown
    try {
        parsed = JSON.parse(body)
    } catch {
        throw new ConvexError("That message couldn't be read. Please try again.")
    }
    const ops = Array.isArray(parsed) ? parsed : (parsed as { ops?: unknown } | null)?.ops
    if (!Array.isArray(ops) || ops.length > 5_000) {
        throw new ConvexError("That message couldn't be read. Please try again.")
    }
    for (const op of ops) {
        const insert = (op as { insert?: unknown } | null)?.insert
        if (typeof insert !== "string" && (typeof insert !== "object" || insert === null)) {
            throw new ConvexError("That message couldn't be read. Please try again.")
        }
    }
}

export function cleanLabels(labels: string[] | undefined): string[] | undefined {
    if (!labels) return undefined
    return labels.slice(0, MAX.labelCount).map((l) => text(l, MAX.label, "Label", { collapse: true })).filter(Boolean)
}


// Quill delta JSON -> plain text (mentions are plain "@Name" text in the delta).
export const deltaToText = (body: string): string => {
    try {
        const parsed = JSON.parse(body)
        const ops: { insert?: unknown }[] = Array.isArray(parsed) ? parsed : (parsed?.ops ?? [])
        return ops.map((o) => (typeof o.insert === "string" ? o.insert : "")).join("").replace(/\s+/g, " ").trim()
    } catch {
        return body
    }
}

// Short plain-text copy of a message body, small enough to store on hundreds of notifications.
export const snippetOf = (body: string, n = 300): string => {
    const t = deltaToText(body)
    return t.length > n ? t.slice(0, n - 1).trimEnd() + "…" : t
}
