import Link from "next/link"

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#fbf9f7] px-6 text-center">
      <p className="text-sm font-semibold uppercase tracking-widest text-[#c2370d]">404</p>
      <h1 className="mt-3 text-3xl font-semibold tracking-tight text-[#1b1017]">We couldn&apos;t find that page</h1>
      <p className="mt-2 max-w-sm text-[#1b1017]/60">The link may be old, or you may not have access to it.</p>
      <Link href="/" className="mt-6 rounded-xl bg-[#ff5018] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#e6430f]">Go home</Link>
    </div>
  )
}
