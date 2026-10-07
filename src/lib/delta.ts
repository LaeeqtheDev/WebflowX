import type { Op } from "quill"

// Message bodies are stored as Quill delta JSON. Never trust them to parse.
export function parseDelta(body: string): Op[] {
    try {
        const parsed = JSON.parse(body)
        const ops = Array.isArray(parsed) ? parsed : parsed?.ops
        return Array.isArray(ops) ? (ops as Op[]) : []
    } catch {
        return [{ insert: typeof body === "string" ? body.slice(0, 5000) : "" }]
    }
}
