import type { Metadata } from "next"
import { IndexPage } from "@/components/marketing/IndexPage"
import { USE_CASES } from "@/lib/marketing-content"

export const metadata: Metadata = {
  title: "Use cases",
  description: "How agencies, startups and remote teams use WebflowX.",
  alternates: { canonical: "/use-cases" },
}

export default function Page() {
  return <IndexPage title="Use cases" lead="How agencies, startups and remote teams use WebflowX." base="use-cases" pages={USE_CASES} />
}
