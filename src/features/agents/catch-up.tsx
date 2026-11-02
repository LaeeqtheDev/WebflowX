"use client"

import { useState } from "react"
import { useAction } from "convex/react"
import { Loader2, Sparkles, X } from "lucide-react"
import { api } from "../../../convex/_generated/api"
import type { Id } from "../../../convex/_generated/dataModel"
import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { friendlyError } from "@/hooks/use-limit-handler"

// "Catch me up": a private AI summary of what you missed in this channel since your last visit. Nothing is posted.
export const CatchUp = ({ channelId }: { channelId: Id<"channels"> }) => {
    const run = useAction(api.agentRunner.catchUp)
    const [open, setOpen] = useState(false)
    const [busy, setBusy] = useState(false)
    const [result, setResult] = useState<{ summary: string; count: number } | null>(null)
    const [error, setError] = useState("")

    const go = async () => {
        setBusy(true); setError(""); setResult(null)
        try { setResult(await run({ channelId })) }
        catch (e) { setError(friendlyError(e, "Couldn't catch you up right now")) }
        finally { setBusy(false) }
    }

    return (
        <Popover open={open} onOpenChange={(o) => { setOpen(o); if (o && !result && !busy) void go() }}>
            <PopoverTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 gap-1.5 rounded-lg px-2.5 text-xs font-semibold text-orange-ink hover:bg-brand/10">
                    <Sparkles className="size-3.5" /> <span className="hidden sm:inline">Catch me up</span>
                </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-[min(92vw,26rem)] rounded-xl p-0">
                <div className="flex items-center gap-2 border-b border-plum/10 px-4 py-2.5">
                    <Sparkles className="size-4 text-brand" />
                    <p className="text-sm font-semibold text-ink">What you missed</p>
                    <span className="text-[11px] text-ink/60">only you see this</span>
                    <button type="button" aria-label="Close" onClick={() => setOpen(false)} className="ml-auto rounded p-1 text-ink/60 hover:bg-cream-deep"><X className="size-3.5" /></button>
                </div>
                <div className="max-h-[60vh] overflow-y-auto px-4 py-3">
                    {busy && <p className="flex items-center gap-2 text-sm text-ink/70"><Loader2 className="size-4 animate-spin text-brand" /> Reading the channel…</p>}
                    {error && <p className="text-sm text-red-600">{error}</p>}
                    {result && <p className="whitespace-pre-wrap text-sm leading-relaxed text-ink/85">{result.summary}</p>}
                </div>
                {result && result.count > 0 && (
                    <div className="flex items-center justify-between border-t border-plum/10 px-4 py-2 text-[11px] text-ink/60">
                        <span>From {result.count} message{result.count === 1 ? "" : "s"} · uses 1 agent run</span>
                        <button type="button" onClick={() => void go()} className="font-semibold text-orange-ink hover:underline">Refresh</button>
                    </div>
                )}
            </PopoverContent>
        </Popover>
    )
}
