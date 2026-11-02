"use client"

import { useState } from "react"
import { useMutation } from "convex/react"
import { Check, UserPlus } from "lucide-react"
import { toast } from "sonner"
import { api } from "../../../../../../../convex/_generated/api"
import type { Doc, Id } from "../../../../../../../convex/_generated/dataModel"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuLabel, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { useGetMembers } from "@/features/members/api/use-get-members"
import { friendlyError } from "@/hooks/use-limit-handler"

// The host picks which workspace guests (clients, contractors) can see and join this meeting.
export const GuestInvite = ({ meeting }: { meeting: Doc<"meetings"> }) => {
    const { data: members } = useGetMembers({ workspaceId: meeting.workspaceId })
    const setGuests = useMutation(api.meetings.setGuests)
    const [busy, setBusy] = useState(false)
    const guests = (members ?? []).filter((m) => m.role === "guest")
    if (guests.length === 0) return null
    const invited = new Set(meeting.guestIds ?? [])

    const toggle = async (id: Id<"members">) => {
        const next = invited.has(id) ? [...invited].filter((x) => x !== id) : [...invited, id]
        setBusy(true)
        try {
            await setGuests({ id: meeting._id, guestIds: next })
            toast.success(invited.has(id) ? "Guest removed from this meeting" : "Guest invited. They can join from their Meetings page.")
        } catch (e) {
            toast.error(friendlyError(e, "Couldn't update guests"))
        } finally {
            setBusy(false)
        }
    }

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="outline" className="h-8 w-full rounded-lg text-xs font-semibold sm:w-auto" disabled={busy}>
                    <UserPlus className="mr-1 size-3.5" /> Guests{invited.size > 0 ? ` (${invited.size})` : ""}
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-64">
                <DropdownMenuLabel className="text-xs font-medium text-ink/60">Guests who can join this meeting</DropdownMenuLabel>
                {guests.map((g) => (
                    <button key={g._id} type="button" onClick={() => toggle(g._id)} disabled={busy}
                        className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-cream-deep disabled:opacity-60">
                        <span className={`flex size-4 items-center justify-center rounded border ${invited.has(g._id) ? "border-brand bg-brand text-white" : "border-plum/25"}`}>
                            {invited.has(g._id) && <Check className="size-3" strokeWidth={3} />}
                        </span>
                        <span className="truncate">{g.user?.name ?? "Guest"}</span>
                    </button>
                ))}
            </DropdownMenuContent>
        </DropdownMenu>
    )
}
