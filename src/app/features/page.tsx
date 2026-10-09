import type { Metadata } from "next"
import { IndexPage } from "@/components/marketing/IndexPage"
import { FEATURES } from "@/lib/marketing-content"

export const metadata: Metadata = {
  title: "Features",
  description: "Chat, tasks, documents, meetings, calendar and permissions in one team workspace.",
  alternates: { canonical: "/features" },
}

export default function Page() {
  return <IndexPage title="Features" lead="Chat, tasks, documents, meetings, calendar and permissions in one team workspace." base="features" pages={FEATURES} />
}
