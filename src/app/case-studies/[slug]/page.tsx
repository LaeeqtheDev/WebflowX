import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { CASE_STUDIES } from "@/lib/marketing-content"

type Params = { params: Promise<{ slug: string }> }

export const dynamicParams = false

export function generateStaticParams() {
  // Next needs at least one entry to prerender a dynamic route; with none published the route simply 404s.
  return CASE_STUDIES.length ? CASE_STUDIES.map((c) => ({ slug: c.slug })) : [{ slug: "_none" }]
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params
  const c = CASE_STUDIES.find((x) => x.slug === slug)
  if (!c) return { robots: { index: false } }
  return { title: c.title, description: c.description, alternates: { canonical: `/case-studies/${c.slug}` } }
}

export default async function Page({ params }: Params) {
  const { slug } = await params
  const c = CASE_STUDIES.find((x) => x.slug === slug)
  if (!c) notFound()
  return (
    <main className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <nav aria-label="Breadcrumb" className="text-sm text-[#1b1017]/65">
        <Link href="/" className="hover:text-[#a82d0a]">Home</Link> / <Link href="/case-studies" className="hover:text-[#a82d0a]">Case studies</Link> / <span aria-current="page">{c.name}</span>
      </nav>
      <h1 className="mt-6 text-4xl font-semibold tracking-tight">{c.title}</h1>
      <p className="mt-2 text-sm text-[#1b1017]/60">{c.client} · {c.published}</p>
      <p className="mt-6 text-lg text-[#1b1017]/75">{c.summary}</p>
      <h2 className="mt-10 text-2xl font-semibold">The problem</h2>
      <p className="mt-2 text-[#1b1017]/75">{c.challenge}</p>
      <h2 className="mt-10 text-2xl font-semibold">What they did</h2>
      <p className="mt-2 text-[#1b1017]/75">{c.approach}</p>
      <h2 className="mt-10 text-2xl font-semibold">Results</h2>
      <ul className="mt-2 list-disc space-y-1.5 pl-5 text-[#1b1017]/75">{c.results.map((r) => <li key={r}>{r}</li>)}</ul>
    </main>
  )
}
