"use client"
import { useState } from "react"
import { useMutation, useQuery } from "convex/react"
import { Bell, BellOff, Download, ShieldCheck, ShieldOff, Smartphone } from "lucide-react"
import { toast } from "sonner"
import { api } from "../../../convex/_generated/api"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { errMsg } from "@/lib/errors"
import { usePush } from "@/features/push/use-push"
import { BackupCodes, TwoFactorSetup } from "./two-factor-setup"

const card = "rounded-xl border border-plum/12 bg-surface p-4"

const Notifications = () => {
  const { state, busy, error, enable, disable, canInstall, install } = usePush()
  const isIos = typeof navigator !== "undefined" && /iPhone|iPad|iPod/.test(navigator.userAgent)
  const note: Record<string, string> = {
    unsupported: isIos
      ? "On iPhone and iPad, notifications work from the Home Screen app. Tap the Share button in Safari, choose Add to Home Screen, then open WebflowX from there and turn this on."
      : "This browser can't show notifications. Try Chrome, Edge, Firefox or Safari.",
    unconfigured: "Browser notifications aren't switched on for this site yet.",
    blocked: "Notifications are blocked for this site. Allow them in your browser's site settings, then come back.",
  }
  return (
    <section className={card}>
      <div className="flex items-start gap-3">
        <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-brand/10 text-brand">{state === "on" ? <Bell className="size-5" /> : <BellOff className="size-5" />}</div>
        <div className="min-w-0 flex-1">
          <p className="font-semibold tracking-tight text-ink">Browser notifications</p>
          <p className="mt-0.5 text-sm text-ink/65">Get a pop-up for mentions, direct messages, thread replies and tasks, even when WebflowX isn&apos;t open. You won&apos;t get them while you&apos;re looking at the app.</p>
          {note[state] && <p className="mt-2 text-sm text-ink/60">{note[state]}</p>}
          {error && <p className="mt-2 text-sm text-destructive" role="alert">{error}</p>}
          <div className="mt-3 flex flex-wrap gap-2">
            {state === "off" && <Button type="button" size="sm" disabled={busy} onClick={enable} className="bg-brand text-white hover:bg-brand-hover">Turn on for this device</Button>}
            {state === "on" && <Button type="button" size="sm" variant="outline" disabled={busy} onClick={disable}>Turn off for this device</Button>}
            {canInstall && <Button type="button" size="sm" variant="outline" onClick={install}><Download className="mr-2 size-4" /> Install the app</Button>}
          </div>
          {state === "on" && <p className="mt-2 flex items-center gap-1.5 text-xs text-emerald-700 dark:text-emerald-400"><Smartphone className="size-3.5" /> On for this device</p>}
        </div>
      </div>
    </section>
  )
}

const TwoStep = () => {
  const status = useQuery(api.twoFactor.status)
  const disableFn = useMutation(api.twoFactor.disable)
  const regen = useMutation(api.twoFactor.regenerateBackupCodes)
  const [mode, setMode] = useState<"idle" | "setup" | "disable" | "regen">("idle")
  const [code, setCode] = useState("")
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")
  const [newCodes, setNewCodes] = useState<string[] | null>(null)

  const reset = () => { setMode("idle"); setCode(""); setError(""); setNewCodes(null) }

  const run = async (e: React.FormEvent) => {
    e.preventDefault()
    setBusy(true); setError("")
    try {
      if (mode === "disable") {
        const r = await disableFn({ code })
        if (!r.ok) setError(r.error ?? "That code didn't work.")
        else { toast.success("Two-step verification is off"); reset() }
      } else {
        const r = await regen({ code })
        if ("error" in r) setError(r.error as string)
        else setNewCodes(r.backupCodes)
      }
    } catch (err) { setError(errMsg(err, "Something went wrong.")) }
    finally { setBusy(false) }
  }

  if (status === undefined) return <section className={card}><p className="text-sm text-ink/60">Loading…</p></section>
  const enabled = !!status?.enabled

  return (
    <section className={card}>
      <div className="flex items-start gap-3">
        <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-brand/10 text-brand">{enabled ? <ShieldCheck className="size-5" /> : <ShieldOff className="size-5" />}</div>
        <div className="min-w-0 flex-1">
          <p className="font-semibold tracking-tight text-ink">Two-step verification {enabled && <span className="ml-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 dark:text-emerald-400">On</span>}</p>
          <p className="mt-0.5 text-sm text-ink/65">Asks for a code from your authenticator app each time you sign in, so a stolen password isn&apos;t enough.</p>

          {mode === "setup" ? (
            <div className="mt-4"><TwoFactorSetup onDone={reset} onCancel={reset} /></div>
          ) : newCodes ? (
            <div className="mt-4"><BackupCodes codes={newCodes} onDone={reset} doneLabel="Done" /></div>
          ) : mode === "disable" || mode === "regen" ? (
            <form onSubmit={run} className="mt-4 flex flex-col gap-3">
              <p className="text-sm text-ink/75">{mode === "disable" ? "Enter a code from your app (or a backup code) to turn it off." : "Enter a code from your app to get 10 new backup codes. The old ones stop working."}</p>
              <Input value={code} onChange={(e) => setCode(e.target.value)} placeholder="123456" autoComplete="one-time-code" aria-label="Code" disabled={busy} className="h-11 rounded-xl" />
              {error && <p className="text-sm text-destructive" role="alert">{error}</p>}
              <div className="flex gap-2">
                <Button type="button" variant="outline" size="sm" onClick={reset} disabled={busy}>Cancel</Button>
                <Button type="submit" size="sm" disabled={busy || code.trim().length < 6} className={mode === "disable" ? "bg-rose-600 text-white hover:bg-rose-700" : "bg-brand text-white hover:bg-brand-hover"}>
                  {mode === "disable" ? "Turn off" : "Get new codes"}
                </Button>
              </div>
            </form>
          ) : enabled ? (
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <Button type="button" size="sm" variant="outline" onClick={() => setMode("regen")}>New backup codes</Button>
              <Button type="button" size="sm" variant="ghost" className="text-rose-600 hover:text-rose-700 dark:text-rose-400" onClick={() => setMode("disable")}>Turn off</Button>
              <span className="text-xs text-ink/55">{status?.backupCodesLeft ?? 0} backup codes left</span>
            </div>
          ) : (
            <Button type="button" size="sm" className="mt-3 bg-brand text-white hover:bg-brand-hover" onClick={() => setMode("setup")}>Set up</Button>
          )}
        </div>
      </div>
    </section>
  )
}

export const SecurityModal = ({ open, setOpen }: { open: boolean; setOpen: (v: boolean) => void }) => (
  <Dialog open={open} onOpenChange={setOpen}>
    <DialogContent className="max-h-[90dvh] overflow-y-auto rounded-2xl bg-cream p-0 sm:max-w-md">
      <DialogHeader className="border-b bg-surface px-6 py-5">
        <DialogTitle className="font-semibold tracking-tight">Security &amp; notifications</DialogTitle>
        <DialogDescription className="sr-only">Two-step verification and browser notifications for your account.</DialogDescription>
      </DialogHeader>
      <div className="flex flex-col gap-4 px-6 py-5">
        <Notifications />
        <TwoStep />
      </div>
    </DialogContent>
  </Dialog>
)
