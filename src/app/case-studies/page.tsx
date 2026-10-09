import type { Metadata } from "next"
import Link from "next/link"
import { CASE_STUDIES } from "@/lib/marketing-content"

const has = CASE_STUDIES.length > 0

export const metadata: Metadata = {
  title: "Case studies",
  description: "How teams use WebflowX, in their own words and with numbers we can stand behind.",
  alternates: { canonical: "/case-studies" },
  // nothing to index until a real, approved case study is published
  robots: has ? { index: true, follow: true } : { index: false, follow: true },
}

export default function CaseStudiesPage() {
  return (
    <div className="min-h-screen bg-[#fbf9f7] text-[#1b1017]">
      <header className="border-b border-[#381d2a]/10 bg-white">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-4 sm:px-6">
          <Link href="/" className="font-semibold">WebflowX</Link>
          <Link href="/auth?mode=signup" className="rounded-full bg-[#381d2a] px-4 py-1.5 text-sm font-medium text-white">Get started</Link>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
        <h1 className="text-4xl font-semibold tracking-tight">Case studies</h1>
        {has ? (
          <ul className="mt-8 space-y-4">
            {CASE_STUDIES.map((c) => (
              <li key={c.slug}>
                <Link href={`/case-studies/${c.slug}`} className="block rounded-2xl border border-[#381d2a]/10 bg-white p-5 hover:border-[#ff5018]/50">
                  <h2 className="font-semibold">{c.name}</h2>
                  <p className="mt-1 text-sm text-[#1b1017]/70">{c.summary}</p>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-6 max-w-xl text-lg text-[#1b1017]/75">
            We do not have a customer story to publish yet, and we would rather show none than invent one. If your team uses WebflowX and would like to share what changed, write to{" "}
            <a href="mailto:hello@northfoundry.co" className="text-[#c2370d] underline-offset-4 hover:underline">hello@northfoundry.co</a>.
          </p>
        )}
      </main>
    </div>
  )
}
