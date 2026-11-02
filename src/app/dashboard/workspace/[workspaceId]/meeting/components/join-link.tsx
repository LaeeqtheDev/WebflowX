"use client"

import { useState } from "react"
import { useMutation } from "convex/react"
import { Link2 } from "lucide-react"
import { toast } from "sonner"
import { api } from "../../../../../../../convex/_generated/api"
import type { Doc } from "../../../../../../../convex/_generated/dataModel"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { friendlyError } from "@/hooks/use-limit-handler"

const urlFor = (token: string) => `${window.location.origin}/m/${token}`

// A join link for people without an account. The host turns it on (and the link is copied) or off.
export const JoinLink = ({ meeting }: { meeting: Doc<"meetings"> }) => {
    const setLink = useMutation(api.meetings.setPublicLink)
    const [busy, setBusy] = useState(false)
    const copy = async (token: string) => {
        try { await navigator.clipboard.writeText(urlFor(token)); toast.success("Join link copied. Anyone with it can join this meeting.") }
        catch { toast.info(urlFor(token)) }
    }
    const turn = async (enabled: boolean) => {
        setBusy(true)
        try {
            const token = await setLink({ id: meeting._id, enabled })
            if (token) await copy(token)
            else toast.success("Join link turned off")
        } catch (e) { toast.error(friendlyError(e, "Couldn't update the join link")) }
        finally { setBusy(false) }
    }
    if (!meeting.publicToken) {
        return (
            <Button variant="outline" onClick={() => void turn(true)} disabled={busy} className="h-8 w-full rounded-lg text-xs font-semibold sm:w-auto">
                <Link2 className="mr-1 size-3.5" /> Join link
            </Button>
        )
    }
    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="outline" disabled={busy} className="h-8 w-full rounded-lg border-brand/40 text-xs font-semibold text-orange-ink sm:w-auto">
                    <Link2 className="mr-1 size-3.5" /> Link on
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-60">
                <DropdownMenuLabel className="text-xs font-medium text-ink/60">Anyone with the link can join, no account needed</DropdownMenuLabel>
                <DropdownMenuItem onClick={() => void copy(meeting.publicToken!)}>Copy join link</DropdownMenuItem>
                <DropdownMenuItem onClick={() => void turn(false)} className="text-red-600">Turn off link</DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    )
}
