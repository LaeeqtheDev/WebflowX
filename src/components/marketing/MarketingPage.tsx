import Link from "next/link"
import Image from "next/image"
import type { Compare, Page } from "@/lib/marketing-content"
import { PLANS } from "@/lib/marketing-content"
import { SITE_URL } from "@/lib/site"

type Props = {
  page: Page | Compare
  /** url segment, e.g. "features" */
  base: string
  baseLabel: string
  related: Page[]
}

export function MarketingPage({ page, base, baseLabel, related }: Props) {
  const url = `${SITE_URL}/${base}/${page.slug}`
  const rows = "rows" in page ? page.rows : null
  const vendor = "vendor" in page ? page.vendor : null
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "WebflowX", item: SITE_URL },
          { "@type": "ListItem", position: 2, name: baseLabel, item: `${SITE_URL}/${base}` },
          { "@type": "ListItem", position: 3, name: page.name, item: url },
        ],
      },
      {
        "@type": "FAQPage",
        mainEntity: page.faqs.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
      },
    ],
  }

  return (
    <div className="min-h-screen bg-[#fbf9f7] text-[#1b1017]">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      <header className="border-b border-[#381d2a]/10 bg-white">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-4 sm:px-6">
          <Link href="/" className="flex items-center gap-2.5 font-semibold">
            <Image src="/logo.png" alt="" width={28} height={28} className="h-7 w-7 rounded-lg" />
            WebflowX
          </Link>
          <nav aria-label="Main" className="flex items-center gap-5 text-sm text-[#1b1017]/70">
            <Link href="/features" className="hover:text-[#a82d0a]">Features</Link>
            <Link href="/security" className="hover:text-[#a82d0a]">Security</Link>
            <Link href="/auth?mode=signup" className="rounded-full bg-[#381d2a] px-4 py-1.5 font-medium text-white hover:bg-[#4b2738]">Get started</Link>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-12 sm:px-6">
        <nav aria-label="Breadcrumb" className="text-sm text-[#1b1017]/65">
          <ol className="flex flex-wrap items-center gap-2">
            <li><Link href="/" className="hover:text-[#a82d0a]">Home</Link></li>
            <li aria-hidden>/</li>
            <li><Link href={`/${base}`} className="hover:text-[#a82d0a]">{baseLabel}</Link></li>
            <li aria-hidden>/</li>
            <li aria-current="page">{page.name}</li>
          </ol>
        </nav>

        <h1 className="mt-6 text-4xl font-semibold tracking-tight sm:text-5xl">{page.h1}</h1>
        <p className="mt-5 max-w-2xl text-lg leading-relaxed text-[#1b1017]/75">{page.lead}</p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link href="/auth?mode=signup" className="rounded-full bg-[#ff5018] px-6 py-3 font-medium text-white hover:bg-[#e04510]">Start free</Link>
          <Link href="/#pricing" className="rounded-full border border-[#381d2a]/20 px-6 py-3 font-medium hover:bg-white">See pricing</Link>
        </div>

        {rows && vendor && (
          <div className="mt-12 overflow-x-auto rounded-2xl border border-[#381d2a]/10 bg-white">
            <table className="w-full min-w-[560px] text-left text-sm">
              <caption className="sr-only">WebflowX compared with {vendor}</caption>
              <thead className="bg-[#f7f2ee] text-[#1b1017]/70">
                <tr>
                  <th scope="col" className="px-4 py-3 font-medium">&nbsp;</th>
                  <th scope="col" className="px-4 py-3 font-medium">{vendor}</th>
                  <th scope="col" className="px-4 py-3 font-medium">WebflowX</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(([label, a, b]) => (
                  <tr key={label} className="border-t border-[#381d2a]/10 align-top">
                    <th scope="row" className="px-4 py-3 font-medium">{label}</th>
                    <td className="px-4 py-3 text-[#1b1017]/75">{a}</td>
                    <td className="px-4 py-3 text-[#1b1017]/75">{b}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="mt-12 space-y-10">
          {page.sections.map((s) => (
            <section key={s.title}>
              <h2 className="text-2xl font-semibold tracking-tight">{s.title}</h2>
              <p className="mt-3 leading-relaxed text-[#1b1017]/75">{s.body}</p>
              {s.points && (
                <ul className="mt-4 list-disc space-y-1.5 pl-5 text-[#1b1017]/75">
                  {s.points.map((p) => <li key={p}>{p}</li>)}
                </ul>
              )}
            </section>
          ))}
        </div>

        <section className="mt-14">
          <h2 className="text-2xl font-semibold tracking-tight">Frequently asked questions</h2>
          <dl className="mt-5 space-y-5">
            {page.faqs.map((f) => (
              <div key={f.q}>
                <dt className="font-medium">{f.q}</dt>
                <dd className="mt-1 text-[#1b1017]/75">{f.a}</dd>
              </div>
            ))}
          </dl>
        </section>

        <section className="mt-14 rounded-2xl bg-[#381d2a] p-8 text-white">
          <h2 className="text-2xl font-semibold">Pricing is per workspace, not per seat</h2>
          <ul className="mt-4 grid gap-3 sm:grid-cols-2">
            {PLANS.map((p) => (
              <li key={p.name} className="rounded-xl bg-white/10 p-4">
                <p className="font-semibold">{p.name} <span className="font-normal text-white/70">${p.price}/month</span></p>
                <p className="mt-1 text-sm text-white/70">{p.blurb}</p>
              </li>
            ))}
          </ul>
        </section>

        {related.length > 0 && (
          <section className="mt-14">
            <h2 className="text-xl font-semibold">Related</h2>
            <ul className="mt-3 flex flex-wrap gap-3">
              {related.map((r) => (
                <li key={r.slug}>
                  <Link href={`/${base}/${r.slug}`} className="rounded-full border border-[#381d2a]/15 px-4 py-2 text-sm hover:bg-white">{r.name}</Link>
                </li>
              ))}
            </ul>
          </section>
        )}
      </main>
      <footer className="border-t border-[#381d2a]/10 py-8 text-center text-sm text-[#1b1017]/60">
        <Link href="/terms" className="hover:text-[#a82d0a]">Terms</Link> · <Link href="/privacy" className="hover:text-[#a82d0a]">Privacy</Link> · <Link href="/security" className="hover:text-[#a82d0a]">Security</Link> · WebflowX by North Foundry
      </footer>
    </div>
  )
}
