import { NextResponse } from "next/server"
import { convexAuthNextjsToken } from "@convex-dev/auth/nextjs/server"

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
