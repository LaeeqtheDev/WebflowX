import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { MarketingPage } from "@/components/marketing/MarketingPage"
import { COMPARISONS } from "@/lib/marketing-content"

type Params = { params: Promise<{ slug: string }> }

export const dynamicParams = false

export function generateStaticParams() {
  return COMPARISONS.map((p) => ({ slug: p.slug }))
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params
  const page = COMPARISONS.find((p) => p.slug === slug)
  if (!page) return {}
  return {
    title: page.title,
    description: page.description,
    alternates: { canonical: `/compare/${page.slug}` },
    openGraph: { title: page.title, description: page.description, url: `/compare/${page.slug}`, type: "article" },
  }
}

export default async function Page({ params }: Params) {
  const { slug } = await params
  const page = COMPARISONS.find((p) => p.slug === slug)
  if (!page) notFound()
  const related = page.related.map((s) => COMPARISONS.find((p) => p.slug === s)).filter((p) => !!p)
  return <MarketingPage page={page} base="compare" baseLabel="Compare" related={related} />
}
