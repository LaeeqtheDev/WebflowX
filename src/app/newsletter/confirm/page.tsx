import type { Metadata } from "next"
import { NewsletterResult } from "@/components/newsletter-result"

export const metadata: Metadata = {
  title: "Confirm subscription",
  robots: { index: false, follow: false },
}

export default function Page() {
  return <NewsletterResult mode="confirm" />
}
