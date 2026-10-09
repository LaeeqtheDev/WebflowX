import type { Metadata } from "next"
import { IndexPage } from "@/components/marketing/IndexPage"
import { COMPARISONS } from "@/lib/marketing-content"

export const metadata: Metadata = {
  title: "Compare",
  description: "How WebflowX compares with Slack, Notion and ClickUp.",
  alternates: { canonical: "/compare" },
}

export default function Page() {
  return <IndexPage title="Compare" lead="How WebflowX compares with Slack, Notion and ClickUp." base="compare" pages={COMPARISONS} />
}
