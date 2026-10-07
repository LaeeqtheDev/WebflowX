"use client"
import { useState } from "react"
import { useConvexAuth, useMutation, useQuery } from "convex/react"
import { useAuthActions } from "@convex-dev/auth/react"
import { Loader, ShieldCheck } from "lucide-react"
import { api } from "../../../convex/_generated/api"
import { AuthShell } from "@/features/auth/components/auth-screen"
import { AuthField } from "@/features/auth/components/auth-ui"
import { Button } from "@/components/ui/button"
import { errMsg } from "@/lib/errors"
import { TwoFactorSetup } from "./two-factor-setup"

const primary =
  "mt-2 h-12 w-full cursor-pointer rounded-xl bg-[#ff5018] text-[15px] font-semibold text-white shadow-[0_10px_30px_-12px_rgba(255,80,24,0.8)] hover:bg-[#e6430f]"

const Challenge = () => {
  const verify = useMutation(api.twoFactor.verify)
  const { signOut } = useAuthActions()
  const [code, setCode] = useState("")
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")
  const [backup, setBackup] = useState(false)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setBusy(true); setError("")
    try {
      const r = await verify({ code })
      if (!r.ok) setError(r.error ?? "That code didn't work.")
    } catch (err) { setError(errMsg(err, "Something went wrong. Try again.")) }
    finally { setBusy(false) }
  }

  return (
    <AuthShell title="One more step." body="Your account is protected with two-step verification.">
      <ShieldCheck className="size-9 text-[#ff5018]" />
      <h1 className="mt-4 text-[2rem] font-semibold leading-tight tracking-[-0.03em] text-ink">Enter your code</h1>
      <p className="mt-2 text-[15px] text-ink/65">
        {backup ? "Enter one of your backup codes. Each one works once." : "Open your authenticator app and enter the 6-digit code for WebflowX."}
      </p>
      {error && <p className="mt-5 rounded-xl border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive" role="alert">{error}</p>}
      <form onSubmit={submit} className="mt-6 space-y-4">
        <AuthField
          label={backup ? "Backup code" : "6-digit code"}
          value={code}
          onChange={(e) => setCode(backup ? e.target.value : e.target.value.replace(/\D/g, "").slice(0, 6))}
          inputMode={backup ? "text" : "numeric"}
          autoComplete="one-time-code"
          placeholder={backup ? "abcde-12345" : "123456"}
          autoFocus
          disabled={busy}
          required
        />
        <Button type="submit" className={primary} size="lg" disabled={busy || code.length < 6}>{busy ? "Checking…" : "Verify and continue"}</Button>
      </form>
      <div className="mt-6 flex flex-wrap gap-x-4 gap-y-2 text-sm text-ink/60">
        <button type="button" className="cursor-pointer font-semibold text-orange-ink underline underline-offset-2" onClick={() => { setBackup((b) => !b); setCode(""); setError("") }}>
          {backup ? "Use my authenticator app" : "Use a backup code"}
        </button>
        <button type="button" className="cursor-pointer underline underline-offset-2 hover:text-ink" onClick={() => void signOut()}>Sign out</button>
      </div>
    </AuthShell>
  )
}

// Wraps the signed-in app: someone who passed their password but not their code sees only the code screen.
export const TwoFactorGate = ({ children }: { children: React.ReactNode }) => {
  const { isLoading, isAuthenticated } = useConvexAuth()
  const status = useQuery(api.twoFactor.status)

  if (isLoading || (isAuthenticated && status === undefined)) {
    return <div className="flex h-dvh items-center justify-center bg-cream"><Loader className="size-7 animate-spin text-[#ff5018]" /></div>
  }
  if (isAuthenticated && status?.enabled && !status.verified) return <Challenge />
  return <>{children}</>
}

// Shown inside a workspace that requires two-step verification to anyone who hasn't set it up.
export const RequireTwoFactor = ({ workspaceName, children }: { workspaceName?: string; children: React.ReactNode }) => {
  const status = useQuery(api.twoFactor.status)
  const { signOut } = useAuthActions()
  const [done, setDone] = useState(false)
  if (status === undefined) return <div className="flex h-dvh items-center justify-center bg-cream"><Loader className="size-7 animate-spin text-[#ff5018]" /></div>
  if (status?.enabled || done) return <>{children}</>
  return (
    <AuthShell title="Security first." body="This workspace asks everyone to use two-step verification.">
      <ShieldCheck className="size-9 text-[#ff5018]" />
      <h1 className="mt-4 text-[2rem] font-semibold leading-tight tracking-[-0.03em] text-ink">Set up two-step verification</h1>
      <p className="mt-2 mb-6 text-[15px] text-ink/65">{workspaceName ?? "This workspace"} requires it. It takes about a minute.</p>
      <TwoFactorSetup onDone={() => setDone(true)} />
      <button type="button" className="mt-6 w-fit cursor-pointer text-sm text-ink/60 underline underline-offset-2 hover:text-ink" onClick={() => void signOut()}>Sign out</button>
    </AuthShell>
  )
}
