import type { Metadata } from "next"
import Link from "next/link"
import { LegalPage } from "@/components/legal/legal-page"

export const metadata: Metadata = {
  title: "Data Processing Agreement",
  description: "The data processing terms that apply when WebflowX processes personal data on a customer's behalf.",
  alternates: { canonical: "/dpa" },
  openGraph: { title: "Data Processing Agreement | WebflowX", description: "How WebflowX processes personal data on your behalf.", url: "/dpa" },
}

export default function DpaPage() {
  return (
    <LegalPage title="Data Processing Agreement" updated="October 10, 2026">
      <section>
        <p>This Data Processing Agreement (&ldquo;DPA&rdquo;) forms part of the <Link href="/terms">Terms of Service</Link> between the customer (&ldquo;Controller&rdquo;) and North Foundry, operator of WebflowX (&ldquo;Processor&rdquo;). It applies when we process personal data in a customer&rsquo;s workspace on their behalf. To have a countersigned copy for your records, email <a href="mailto:hello@northfoundry.co?subject=Signed%20DPA">hello@northfoundry.co</a> with your company name and signatory.</p>
      </section>
      <section>
        <h2>1. Scope and roles</h2>
        <p>The customer decides what personal data goes into its workspace and is the controller. We are the processor and process that data only to provide the Service, on the customer&rsquo;s documented instructions, which are the Terms, this DPA and the customer&rsquo;s use of the product&rsquo;s settings. For account and billing data about the customer&rsquo;s own staff, we act as a controller under the <Link href="/privacy">Privacy Policy</Link>.</p>
      </section>
      <section>
        <h2>2. Details of processing</h2>
        <ul>
          <li><strong>Subject matter and duration:</strong> providing the Service for as long as the workspace exists, plus the deletion periods in section 8.</li>
          <li><strong>Nature and purpose:</strong> storing, transmitting and displaying messages, files, tasks, notes, documents and meeting records; real-time collaboration; notifications; AI summaries and writing help when a user requests them.</li>
          <li><strong>Data subjects:</strong> the customer&rsquo;s members, guests and anyone they communicate with in the workspace.</li>
          <li><strong>Types of data:</strong> names, email addresses, profile details, content that users enter, and meeting audio and transcripts. The customer must not put special categories of data into the Service unless it has a lawful basis and accepts the risk.</li>
        </ul>
      </section>
      <section>
        <h2>3. Our obligations</h2>
        <ul>
          <li>Process personal data only on the customer&rsquo;s instructions, and tell the customer if an instruction appears to break data protection law.</li>
          <li>Keep people who can access the data under a duty of confidentiality.</li>
          <li>Apply the measures in section 5.</li>
          <li>Help the customer respond to access, correction, deletion and export requests. Owners and admins can export workspace data in the product, and we assist where the product cannot.</li>
          <li>Help the customer with impact assessments and regulator inquiries, taking into account the information available to us.</li>
        </ul>
      </section>
      <section>
        <h2>4. Subprocessors</h2>
        <p>The customer authorises the providers on the <Link href="/subprocessors">subprocessor list</Link>. We bind each of them to data protection terms no less protective than this DPA and remain responsible for their performance. We add a subprocessor to the list before it handles customer data. A customer may object on reasonable data protection grounds within 30 days of notice; if we cannot resolve the objection, the customer may terminate the affected plan and receive a refund of prepaid fees for the remaining period.</p>
      </section>
      <section>
        <h2>5. Security</h2>
        <p>We maintain the measures described on the <Link href="/security">Security page</Link>, including server-side permission checks, encryption in transit, two-step verification, rate limiting, an audit log and secrets held outside the code. We do not hold a SOC 2 or ISO 27001 certification; see <Link href="/trust">Trust</Link>. We may update measures if the overall level of protection is not reduced.</p>
      </section>
      <section>
        <h2>6. Personal data breaches</h2>
        <p>We notify the customer without undue delay after confirming a breach affecting its personal data, and in any case within 72 hours of confirmation, with the information we have about what happened, what data is affected and what we are doing about it.</p>
      </section>
      <section>
        <h2>7. International transfers</h2>
        <p>Workspace data is stored in the United States and some subprocessors process data in other countries. Where the law requires a transfer mechanism, the parties rely on the European Commission&rsquo;s Standard Contractual Clauses (and the UK Addendum where relevant), which are incorporated into this DPA by reference on request with a countersigned copy. We do not offer a choice of region today.</p>
      </section>
      <section>
        <h2>8. Return and deletion</h2>
        <p>The customer can export its data at any time. When a workspace is deleted its content is removed. Copies in backups and logs expire on the providers&rsquo; regular schedules. Where the law requires us to keep data, we keep only that data and protect it under this DPA.</p>
      </section>
      <section>
        <h2>9. Audits</h2>
        <p>On written request, no more than once a year unless there has been a breach, we answer a reasonable security questionnaire and provide the documentation we have. Because we hold no independent audit report, on-site audits are agreed case by case, at the customer&rsquo;s cost, during business hours and without access to other customers&rsquo; data.</p>
      </section>
      <section>
        <h2>10. Liability and order of precedence</h2>
        <p>Liability under this DPA is subject to the limits in the Terms. If this DPA conflicts with the Terms on the processing of personal data, this DPA prevails.</p>
      </section>
    </LegalPage>
  )
}
