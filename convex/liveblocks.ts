import { v } from "convex/values"
import { internalAction } from "./_generated/server"

// Removes a document's Liveblocks room (the collaborative content) after the doc is deleted.
// Needs LIVEBLOCKS_SECRET_KEY on the Convex deployment: npx convex env set LIVEBLOCKS_SECRET_KEY <key>
export const deleteRoom = internalAction({
    args: { roomId: v.string() },
    handler: async (_ctx, args) => {
        const secret = process.env.LIVEBLOCKS_SECRET_KEY
        if (!secret) {
            console.warn("LIVEBLOCKS_SECRET_KEY is not set on Convex; room not deleted:", args.roomId)
            return
        }
        const res = await fetch(`https://api.liveblocks.io/v2/rooms/${encodeURIComponent(args.roomId)}`, {
            method: "DELETE",
            headers: { Authorization: `Bearer ${secret}` },
        })
        if (!res.ok && res.status !== 404) {
            console.error("Liveblocks room delete failed:", res.status, args.roomId)
        }
    },
})
