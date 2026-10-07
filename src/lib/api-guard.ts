import { NextResponse } from "next/server"
import { convexAuthNextjsToken } from "@convex-dev/auth/nextjs/server"
import { fetchMutation } from "convex/nextjs"
import { api } from "../../convex/_generated/api"

// Returns the signed-in user's Convex token, or null.
export async function getAuthToken(): Promise<string | null> {
    try {
        return (await convexAuthNextjsToken()) ?? null
    } catch {
        return null
    }
}

export const unauthorized = () =>
    NextResponse.json({ error: "Please sign in again" }, { status: 401 })

// Small in-memory sliding-window limiter (per server instance). Good enough to stop a single
// signed-in user hammering paid APIs; swap for Upstash/Redis if you need a global limit.
const buckets = new Map<string, number[]>()
export function rateLimit(key: string, max: number, windowMs: number): boolean {
    const now = Date.now()
    const hits = (buckets.get(key) ?? []).filter((t) => now - t < windowMs)
    if (hits.length >= max) {
        buckets.set(key, hits)
        return false
    }
    hits.push(now)
    buckets.set(key, hits)
    if (buckets.size > 5000) {
        for (const [k, v] of buckets) if (!v.length || now - v[v.length - 1] > windowMs) buckets.delete(k)
    }
    return true
}

export const tooMany = () =>
    NextResponse.json({ error: "Too many requests. Please wait a moment." }, { status: 429 })

// Global (database-backed) limiter: counts across all server instances. Falls back to the
// in-memory limiter if Convex can't be reached, so a hiccup never opens the floodgates.
export async function limited(
    token: string,
    bucket: "ai-summary" | "ai-editor" | "deepgram" | "livekit" | "moderate",
    fallbackKey: string
): Promise<boolean> {
    try {
        return await fetchMutation(api.rateLimit.hit, { bucket }, { token })
    } catch {
        return rateLimit(`${bucket}:${fallbackKey}`, 20, 60_000)
    }
}
