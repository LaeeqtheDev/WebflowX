import { Loader } from "lucide-react"

/** Centered brand spinner for route-level loading.tsx files. */
export function RouteLoading({ variant = "panel", label = "Loading" }: { variant?: "screen" | "panel"; label?: string }) {
  return (
    <div
      role="status"
      aria-live="polite"
      className={`flex w-full items-center justify-center bg-[#fbf9f7] ${variant === "screen" ? "min-h-screen" : "h-full min-h-[60vh]"}`}
    >
      <div className="flex size-14 items-center justify-center rounded-2xl bg-[#ff5018]/10 text-[#c2370d]">
        <Loader className="size-6 animate-spin" />
      </div>
      <span className="sr-only">{label}</span>
    </div>
  )
}
