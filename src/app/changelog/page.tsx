import type { Metadata } from "next"
import Link from "next/link"
import { CHANGELOG } from "@/lib/marketing-content"
import { SITE_URL } from "@/lib/site"

export const metadata: Metadata = {
  title: "Changelog",
  description: "What has shipped in WebflowX, newest first: new features, speed work and security changes.",
  alternates: { canonical: "/changelog" },
  openGraph: { title: "Changelog | WebflowX", description: "What has shipped in WebflowX, newest first.", url: "/changelog" },
}

export default function ChangelogPage() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "WebflowX", item: SITE_URL },
      { "@type": "ListItem", position: 2, name: "Changelog", item: `${SITE_URL}/changelog` },
    ],
  }
  return (
    <div className="min-h-screen bg-[#fbf9f7] text-[#1b1017]">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      <header className="border-b border-[#381d2a]/10 bg-white">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-4 sm:px-6">
          <Link href="/" className="font-semibold">WebflowX</Link>
          <Link href="/auth?mode=signup" className="rounded-full bg-[#381d2a] px-4 py-1.5 text-sm font-medium text-white">Get started</Link>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
        <nav aria-label="Breadcrumb" className="text-sm text-[#1b1017]/65">
          <Link href="/" className="hover:text-[#a82d0a]">Home</Link> / <span aria-current="page">Changelog</span>
        </nav>
        <h1 className="mt-6 text-4xl font-semibold tracking-tight">Changelog</h1>
        <p className="mt-4 text-lg text-[#1b1017]/75">What has shipped, newest first.</p>
        <div className="mt-10 space-y-10">
          {CHANGELOG.map((e) => (
            <article key={e.date + e.title}>
              <time dateTime={e.date} className="text-sm text-[#1b1017]/60">{new Date(e.date).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric", timeZone: "UTC" })}</time>
              <h2 className="mt-1 text-2xl font-semibold tracking-tight">{e.title}</h2>
              <ul className="mt-3 list-disc space-y-1.5 pl-5 text-[#1b1017]/75">
                {e.points.map((p) => <li key={p}>{p}</li>)}
              </ul>
            </article>
          ))}
        </div>
      </main>
    </div>
  )
}
