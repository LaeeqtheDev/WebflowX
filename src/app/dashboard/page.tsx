"use client"
import { Suspense, useEffect, useMemo } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { useQuery } from "convex/react"
import { Loader } from "lucide-react"
import { useGetWorkspaces } from "@/features/workspaces/api/use-get-workspaces"
import { lastLocation } from "@/lib/last-location"
import { OnboardingWizard } from "@/features/onboarding/onboarding-wizard"
import { api } from "../../../convex/_generated/api"

// True for a few seconds after the wizard created the workspace (see onboarding-wizard.tsx).
function recentlyStartedSetup() {
  try { return Date.now() - Number(window.sessionStorage.getItem("wfx-setup") ?? 0) < 20_000 } catch { return false }
}

function Home() {
  const { data, isLoading } = useGetWorkspaces()
  const me = useQuery(api.users.current)
  // An account that still owes its two-step code is told "no workspaces": not the same as having none.
  const tf = useQuery(api.twoFactor.status)
  const verified = tf !== undefined && (!tf?.enabled || tf.verified)
  const params = useSearchParams()
  const router = useRouter()
  // Right after "Create workspace" the new workspace shows up a moment before the wizard moves to step 3.
  const justCreated = recentlyStartedSetup()
  const settingUp = !!params.get("setup") || justCreated

  // Go straight back to where they were while the workspace list loads (skipped after a stale link: ?fresh=1).
  useEffect(() => {
    if (params.get("fresh") || params.get("setup") || recentlyStartedSetup()) return
    const last = lastLocation()
    if (last) router.replace(last)
  }, [params, router])

  const workSpaceId = useMemo(() => data?.[0]?._id, [data])

  useEffect(() => {
    if (isLoading) return
    // People who already have a workspace go straight in, unless they are mid-way through the guided setup.
    if (workSpaceId && !settingUp) router.replace(`/dashboard/workspace/${workSpaceId}`)
  }, [workSpaceId, isLoading, settingUp, router])

  if (isLoading || !verified || (workSpaceId && !settingUp)) {
    return (
      <div className="min-h-screen bg-cream-soft flex items-center justify-center">
        <Loader className="size-6 animate-spin text-brand" />
      </div>
    )
  }

  return <OnboardingWizard firstName={me?.name?.split(" ")[0]} />
}

export default function Page() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-cream-soft" />}>
      <Home />
    </Suspense>
  )
}
