"use client"

import { useEffect } from "react"
import Link from "next/link"
import { TriangleAlert } from "lucide-react"

interface RouteErrorProps {
  error: Error & { digest?: string }
  reset: () => void
  /** "screen" fills the viewport, "panel" fills its parent (use inside the workspace layout). */
  variant?: "screen" | "panel"
  backHref?: string
  backLabel?: string
}

export function RouteError({
  error,
  reset,
  variant = "panel",
  backHref = "/dashboard",
  backLabel = "Back to dashboard",
}: RouteErrorProps) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <div
      role="alert"
      className={`flex w-full flex-col items-center justify-center gap-3 bg-[#fbf9f7] px-6 text-center ${
        variant === "screen" ? "min-h-screen" : "h-full min-h-[60vh]"
      }`}
    >
      <div className="flex size-14 items-center justify-center rounded-2xl bg-[#ff5018]/10 text-[#c2370d]">
        <TriangleAlert className="size-6" />
      </div>
      <h2 className="text-xl font-semibold tracking-tight text-[#1b1017]">Something went wrong</h2>
      <p className="max-w-sm text-sm text-[#1b1017]/65">
        This page could not be loaded. Try again, and if it keeps happening email support@northfoundry.co
        {error.digest ? ` with code ${error.digest}` : ""}.
      </p>
      <div className="mt-3 flex flex-wrap items-center justify-center gap-3">
        <button
          type="button"
          onClick={reset}
          className="rounded-xl bg-[#ff5018] px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#e6430f]"
        >
          Try again
        </button>
        <Link
          href={backHref}
          className="rounded-xl border border-[#381d2a]/20 bg-white px-5 py-2.5 text-sm font-semibold text-[#381d2a] transition-colors hover:bg-[#f7f2ee]"
        >
          {backLabel}
        </Link>
      </div>
    </div>
  )
}
