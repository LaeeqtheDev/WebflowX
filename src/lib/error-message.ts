import { ConvexError } from "convex/values"

// Production Convex hides plain Error messages ("Server Error"); errors we want users to see
// are thrown as ConvexError and carry their text in `.data`.
export const errorMessage = (e: unknown): string => {
    if (e instanceof ConvexError) {
        return typeof e.data === "string" ? e.data : JSON.stringify(e.data)
    }
    if (e instanceof Error) return e.message
    return String(e)
}
