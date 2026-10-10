"use client"
import { useEffect, useState } from "react"
import { useMutation } from "convex/react"
import QRCode from "qrcode"
import { Check, Copy, Download, Loader, ShieldCheck } from "lucide-react"
import { toast } from "sonner"
import { api } from "../../../convex/_generated/api"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { errMsg } from "@/lib/errors"

export const BackupCodes = ({ codes, onDone, doneLabel = "I've saved them" }: { codes: string[]; onDone: () => void; doneLabel?: string }) => {
  const [saved, setSaved] = useState(false)
  const text = codes.join("\n")
  const copy = async () => {
    try { await navigator.clipboard.writeText(text); toast.success("Copied") } catch { toast.error("Couldn't copy. Select the codes and copy them by hand.") }
  }
  const download = () => {
    const url = URL.createObjectURL(new Blob([`WebflowX backup codes\nEach code works once.\n\n${text}\n`], { type: "text/plain" }))
    const a = document.createElement("a")
    a.href = url; a.download = "webflowx-backup-codes.txt"; a.click()
    URL.revokeObjectURL(url)
  }
  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-ink/70">
        Keep these backup codes somewhere safe. Each one works once if you lose your phone. <strong className="text-ink">They won&apos;t be shown again.</strong>
      </p>
      <ul className="grid grid-cols-2 gap-2 rounded-xl border border-plum/12 bg-surface p-3 font-mono text-sm text-ink">
        {codes.map((c) => <li key={c} className="rounded-md bg-cream px-2 py-1 text-center tracking-wide">{c}</li>)}
      </ul>
      <div className="flex gap-2">
        <Button type="button" variant="outline" size="sm" className="rounded-lg" onClick={copy}><Copy className="mr-2 size-4" /> Copy</Button>
        <Button type="button" variant="outline" size="sm" className="rounded-lg" onClick={download}><Download className="mr-2 size-4" /> Download</Button>
      </div>
      <label className="flex items-center gap-2 text-sm text-ink">
        <input type="checkbox" className="size-4 accent-brand" checked={saved} onChange={(e) => setSaved(e.target.checked)} />
        I&apos;ve stored these codes
      </label>
      <Button type="button" disabled={!saved} onClick={onDone} className="bg-brand text-white hover:bg-brand-hover">{doneLabel}</Button>
    </div>
  )
}

// Walks through: scan the QR code → type the first code → save backup codes.
export const TwoFactorSetup = ({ onDone, onCancel }: { onDone: () => void; onCancel?: () => void }) => {
  const begin = useMutation(api.twoFactor.beginSetup)
  const confirm = useMutation(api.twoFactor.confirmSetup)
  const [secret, setSecret] = useState<string | null>(null)
  const [qr, setQr] = useState<string | null>(null)
  const [code, setCode] = useState("")
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")
  const [backup, setBackup] = useState<string[] | null>(null)
  const [loadError, setLoadError] = useState("")

  useEffect(() => {
    let cancelled = false
    begin({}).then(async (r) => {
      if (cancelled) return
      if ("error" in r) { setLoadError(String(r.error)); return }
      setSecret(r.secret)
      setQr(await QRCode.toDataURL(r.uri, { margin: 1, width: 192, color: { dark: "#1b1017", light: "#ffffff" } }))
    }).catch((e) => !cancelled && setLoadError(errMsg(e, "Couldn't start setup")))
    return () => { cancelled = true }
  }, [begin])

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setBusy(true); setError("")
    try {
      const r = await confirm({ code })
      if ("error" in r) setError(String(r.error))
      else setBackup(r.backupCodes)
    } catch (err) { setError(errMsg(err, "Something went wrong. Try again.")) }
    finally { setBusy(false) }
  }

  if (backup) {
    return (
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400"><Check className="size-5" /><span className="font-semibold">Two-step verification is on</span></div>
        <BackupCodes codes={backup} onDone={onDone} doneLabel="Done" />
      </div>
    )
  }
  if (loadError) return <p className="text-sm text-destructive">{loadError}</p>
  if (!secret || !qr) return <div className="flex justify-center py-8"><Loader className="size-6 animate-spin text-brand" /></div>

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <ol className="list-decimal space-y-1 pl-5 text-sm text-ink/75">
        <li>Open an authenticator app (Google Authenticator, Microsoft Authenticator, 1Password, Authy…).</li>
        <li>Scan this code, or type the key by hand.</li>
        <li>Enter the 6-digit code the app shows.</li>
      </ol>
      <div className="flex flex-col items-center gap-3 rounded-xl border border-plum/12 bg-surface p-4">
        {/* eslint-disable-next-line @next/next/no-img-element -- a generated data: URL */}
        <img src={qr} alt="QR code for your authenticator app" width={192} height={192} className="rounded-lg" />
        <code className="break-all rounded-md bg-cream px-2 py-1 text-center text-xs tracking-widest text-ink select-all">{secret.match(/.{1,4}/g)?.join(" ")}</code>
      </div>
      <Input
        value={code}
        onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
        inputMode="numeric"
        autoComplete="one-time-code"
        placeholder="123456"
        aria-label="6-digit code"
        className="h-12 rounded-xl text-center text-lg tracking-[0.4em]"
        disabled={busy}
      />
      {error && <p className="text-sm text-destructive" role="alert">{error}</p>}
      <div className="flex justify-end gap-2">
        {onCancel && <Button type="button" variant="outline" onClick={onCancel} disabled={busy}>Cancel</Button>}
        <Button type="submit" disabled={busy || code.length !== 6} className="bg-brand text-white hover:bg-brand-hover">
          <ShieldCheck className="mr-2 size-4" /> {busy ? "Checking…" : "Turn on"}
        </Button>
      </div>
    </form>
  )
}
