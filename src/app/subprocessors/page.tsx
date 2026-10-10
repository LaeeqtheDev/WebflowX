import type { Metadata } from "next"
import Link from "next/link"
import { LegalPage } from "@/components/legal/legal-page"

export const metadata: Metadata = {
  title: "Subprocessors",
  description: "The third parties that process customer data on behalf of WebflowX, what they do and what data they handle.",
  alternates: { canonical: "/subprocessors" },
  openGraph: { title: "Subprocessors | WebflowX", description: "Who processes customer data for WebflowX, and for what.", url: "/subprocessors" },
}

const rows: [string, string, string, string][] = [
  ["Convex", "Database, file storage, authentication backend", "Workspace content, account data, uploaded files", "United States (US East deployment)"],
  ["Vercel", "Web hosting and delivery", "Request logs, page and API traffic", "Set by Vercel"],
  ["LiveKit", "Real-time audio and video for meetings", "Live audio and video, participant names", "Set by LiveKit"],
  ["Deepgram", "Live meeting transcription", "Meeting audio sent for transcription", "Set by Deepgram"],
  ["Groq", "AI summaries and writing assistance", "Text you send to an AI action, meeting transcripts you summarise", "Set by Groq"],
  ["Liveblocks", "Real-time document collaboration", "Document content and cursor presence", "Set by Liveblocks"],
  ["Resend", "Transactional and newsletter email", "Recipient email address, message content", "Set by Resend"],
  ["Stripe", "Payments for paid plans", "Billing contact and payment details (held by Stripe, not by us)", "Set by Stripe"],
  ["Google, GitHub, Microsoft", "Sign-in, only if you choose it", "Name, email and profile photo from your account", "Set by each provider"],
]

export default function SubprocessorsPage() {
  return (
    <LegalPage title="Subprocessors" updated="October 10, 2026">
      <section>
        <p>These providers process customer data on behalf of WebflowX, operated by North Foundry. They handle it only to provide their service to us. The same list sits behind the <Link href="/privacy">Privacy Policy</Link> and the <Link href="/dpa">DPA</Link>.</p>
      </section>
      <section>
        <div className="overflow-x-auto">
          <table>
            <thead>
              <tr><th>Provider</th><th>Purpose</th><th>Data handled</th><th>Location</th></tr>
            </thead>
            <tbody>
              {rows.map(([a, b, c, d]) => (
                <tr key={a}><td><strong>{a}</strong></td><td>{b}</td><td>{c}</td><td>{d}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
        <p>&ldquo;Set by&rdquo; means we have not pinned a region with that provider and it chooses where traffic is processed. See its own documentation for details.</p>
      </section>
      <section>
        <h2>Changes</h2>
        <p>We add a provider to this page before it starts handling customer data. Customers with a signed DPA can ask to be told by email: write to <a href="mailto:hello@northfoundry.co?subject=Subprocessor%20notices">hello@northfoundry.co</a>. Objections are handled as set out in the DPA.</p>
      </section>
    </LegalPage>
  )
}
