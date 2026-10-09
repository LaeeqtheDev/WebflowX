"use client"

import { useEffect } from "react"

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error)
    fetch("/api/report-error", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ message: error.message, digest: error.digest, path: window.location.pathname }) }).catch(() => {})
  }, [error])

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#fbf9f7] px-6 text-center">
      <h1 className="text-3xl font-semibold tracking-tight text-[#1b1017]">Something went wrong</h1>
      <p className="mt-2 max-w-sm text-[#1b1017]/60">
        This was our mistake, not yours. Try again, and if it keeps happening email support@northfoundry.co{error.digest ? ` with code ${error.digest}` : ""}.
      </p>
      <button onClick={reset} className="mt-6 rounded-xl bg-[#ff5018] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#e6430f]">Try again</button>
    </div>
  )
}
