import Link from "next/link"
import { TriangleAlert } from "lucide-react"

interface NotFoundStateProps {
  title?: string
  description?: string
  href: string
  linkLabel?: string
}

/** Friendly "not found / no access" state used when a Convex query resolves to null. */
export function NotFoundState({
  title = "Not found",
  description = "This may have been deleted, or you may not have access to it.",
  href,
  linkLabel = "Go back",
}: NotFoundStateProps) {
  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-3 bg-cream-soft px-6 text-center">
      <div className="flex size-14 items-center justify-center rounded-2xl bg-[#ff5018]/10 text-orange-ink">
        <TriangleAlert className="size-6" />
      </div>
      <h2 className="text-lg font-semibold tracking-tight text-ink">{title}</h2>
      <p className="max-w-sm text-sm text-ink/65">{description}</p>
      <Link
        href={href}
        className="mt-2 rounded-xl bg-[#ff5018] px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#e6430f]"
      >
        {linkLabel}
      </Link>
    </div>
  )
}
