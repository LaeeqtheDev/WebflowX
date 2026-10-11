"use client"
import { useEffect, useState } from "react"
import dynamic from "next/dynamic"
import { useConvexAuth, useQuery } from "convex/react"
import { Loader } from "lucide-react"
import { api } from "../../../convex/_generated/api"

const HINT = "wfx-2fa-on"

// These screens (and the sign-in UI and QR-code library behind them) are only needed by someone who owes a code or
// whose workspace requires setup, so they load on demand instead of with every page.
const Spinner = () => <div className="flex h-dvh items-center justify-center bg-cream"><Loader className="size-7 animate-spin text-brand" /></div>
const Challenge = dynamic(() => import("./two-factor-screens").then((m) => m.Challenge), { ssr: false, loading: Spinner })
const SetupRequired = dynamic(() => import("./two-factor-screens").then((m) => m.SetupRequired), { ssr: false, loading: Spinner })

// Wraps the signed-in app: someone who passed their password but not their code sees only the code screen.
export const TwoFactorGate = ({ children }: { children: React.ReactNode }) => {
  const { isLoading, isAuthenticated } = useConvexAuth()
  const status = useQuery(api.twoFactor.status)

  // Waiting on this status costs a round trip before anything can load, so skip the wait only when this device has
  // already seen this account without two-step. In every other case (first visit, two-step on, unknown) wait: otherwise an
  // account that still owes its code gets empty answers from the server and the app would show its first-time screens.
  const [hint] = useState(() => { try { return window.localStorage.getItem(HINT) !== "0" } catch { return true } })
  useEffect(() => {
    if (status === undefined) return
    try { window.localStorage.setItem(HINT, status?.enabled ? "1" : "0") } catch { /* private mode */ }
  }, [status])
  if (isLoading || (isAuthenticated && status === undefined && hint)) {
    return <div className="flex h-dvh items-center justify-center bg-cream"><Loader className="size-7 animate-spin text-brand" /></div>
  }
  if (isAuthenticated && status?.enabled && !status.verified) return <Challenge />
  return <>{children}</>
}

// Shown inside a workspace that requires two-step verification to anyone who hasn't set it up.
export const RequireTwoFactor = ({ workspaceName, children }: { workspaceName?: string; children: React.ReactNode }) => {
  const status = useQuery(api.twoFactor.status)
  const [done, setDone] = useState(false)
  if (status === undefined) return <Spinner />
  if (status?.enabled || done) return <>{children}</>
  return <SetupRequired workspaceName={workspaceName} onDone={() => setDone(true)} />
}
