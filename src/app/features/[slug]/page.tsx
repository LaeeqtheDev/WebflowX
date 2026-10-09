import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { MarketingPage } from "@/components/marketing/MarketingPage"
import { FEATURES } from "@/lib/marketing-content"

type Params = { params: Promise<{ slug: string }> }

export const dynamicParams = false

export function generateStaticParams() {
  return FEATURES.map((p) => ({ slug: p.slug }))
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params
  const page = FEATURES.find((p) => p.slug === slug)
  if (!page) return {}
  return {
    title: page.title,
    description: page.description,
    alternates: { canonical: `/features/${page.slug}` },
    openGraph: { title: page.title, description: page.description, url: `/features/${page.slug}`, type: "article" },
  }
}

export default async function Page({ params }: Params) {
  const { slug } = await params
  const page = FEATURES.find((p) => p.slug === slug)
  if (!page) notFound()
  const related = page.related.map((s) => FEATURES.find((p) => p.slug === s)).filter((p) => !!p)
  return <MarketingPage page={page} base="features" baseLabel="Features" related={related} />
}
