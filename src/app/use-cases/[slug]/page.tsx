import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { MarketingPage } from "@/components/marketing/MarketingPage"
import { USE_CASES } from "@/lib/marketing-content"

type Params = { params: Promise<{ slug: string }> }

export const dynamicParams = false

export function generateStaticParams() {
  return USE_CASES.map((p) => ({ slug: p.slug }))
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params
  const page = USE_CASES.find((p) => p.slug === slug)
  if (!page) return {}
  return {
    title: page.title,
    description: page.description,
    alternates: { canonical: `/use-cases/${page.slug}` },
    openGraph: { title: page.title, description: page.description, url: `/use-cases/${page.slug}`, type: "article" },
  }
}

export default async function Page({ params }: Params) {
  const { slug } = await params
  const page = USE_CASES.find((p) => p.slug === slug)
  if (!page) notFound()
  const related = page.related.map((s) => USE_CASES.find((p) => p.slug === s)).filter((p) => !!p)
  return <MarketingPage page={page} base="use-cases" baseLabel="Use cases" related={related} />
}
