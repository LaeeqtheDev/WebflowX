import type { Metadata } from "next"
import { NewsletterResult } from "@/components/newsletter-result"

export const metadata: Metadata = {
  title: "Unsubscribe",
  robots: { index: false, follow: false },
}

export default function Page() {
  return <NewsletterResult mode="unsubscribe" />
}
