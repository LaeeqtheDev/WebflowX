import Link from "next/link"
import type { Page } from "@/lib/marketing-content"

export function IndexPage({ title, lead, base, pages }: { title: string; lead: string; base: string; pages: Page[] }) {
  return (
    <div className="min-h-screen bg-[#fbf9f7] text-[#1b1017]">
      <header className="border-b border-[#381d2a]/10 bg-white">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-4 sm:px-6">
          <Link href="/" className="font-semibold">WebflowX</Link>
          <Link href="/auth?mode=signup" className="rounded-full bg-[#381d2a] px-4 py-1.5 text-sm font-medium text-white">Get started</Link>
        </div>
      </header>
      <main className="mx-auto max-w-4xl px-4 py-12 sm:px-6">
        <nav aria-label="Breadcrumb" className="text-sm text-[#1b1017]/65">
          <Link href="/" className="hover:text-[#a82d0a]">Home</Link> / <span aria-current="page">{title}</span>
        </nav>
        <h1 className="mt-6 text-4xl font-semibold tracking-tight">{title}</h1>
        <p className="mt-4 max-w-2xl text-lg text-[#1b1017]/75">{lead}</p>
        <ul className="mt-10 grid gap-4 sm:grid-cols-2">
          {pages.map((p) => (
            <li key={p.slug}>
              <Link href={`/${base}/${p.slug}`} className="block h-full rounded-2xl border border-[#381d2a]/10 bg-white p-5 transition hover:border-[#ff5018]/50">
                <h2 className="font-semibold">{p.name}</h2>
                <p className="mt-2 text-sm text-[#1b1017]/70">{p.description}</p>
              </Link>
            </li>
          ))}
        </ul>
      </main>
    </div>
  )
}
