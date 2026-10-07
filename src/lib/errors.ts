import { ConvexError } from "convex/values"

// Pull a human message out of a ConvexError (prod redacts plain Errors).
export const errMsg = (e: unknown, fallback: string): string => {
  if (e instanceof ConvexError) {
    const d = e.data as unknown
    if (typeof d === "string") return d
    if (d && typeof d === "object" && "message" in d && typeof (d as { message: unknown }).message === "string") {
      return (d as { message: string }).message
    }
  }
  return fallback
}
