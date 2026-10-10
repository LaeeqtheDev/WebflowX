import type { Metadata } from "next"
import Link from "next/link"
import { LegalPage } from "@/components/legal/legal-page"

export const metadata: Metadata = {
  title: "Trust, compliance and data location",
  description: "Where WebflowX stands on SOC 2, where customer data is stored, and what is on the roadmap. No certifications are claimed that we do not hold.",
  alternates: { canonical: "/trust" },
  openGraph: { title: "Trust and compliance | WebflowX", description: "SOC 2 status, data location and what we can sign today.", url: "/trust" },
}

export default function TrustPage() {
  return (
    <LegalPage title="Trust, compliance and data location" updated="October 10, 2026">
      <section>
        <p>This page states what WebflowX holds today, what we are working toward, and what we can sign for you. It is updated when something changes. If a statement here and a sales conversation ever differ, this page is the one to hold us to.</p>
      </section>
      <section>
        <h2>1. Certification status</h2>
        <ul>
          <li><strong>SOC 2:</strong> not audited. We do not hold a SOC 2 Type I or Type II report.</li>
          <li><strong>ISO 27001:</strong> not certified.</li>
          <li><strong>What we can show today:</strong> the controls described on the <Link href="/security">Security page</Link>, a signed <Link href="/dpa">Data Processing Agreement</Link>, and the <Link href="/subprocessors">subprocessor list</Link>.</li>
        </ul>
      </section>
      <section>
        <h2>2. SOC 2 roadmap</h2>
        <p>We plan to pursue SOC 2 in stages. We are not publishing dates until an auditor is engaged, because a date we cannot keep is worse than none.</p>
        <ol>
          <li><strong>Written policies.</strong> Access control, change management, incident response, vendor review, backup and data retention, each with a named owner.</li>
          <li><strong>Evidence from the product.</strong> The audit log, role permissions, two-step verification enforcement, CI test runs and error reporting already produce much of what an auditor asks for. These need to be collected and retained on a schedule.</li>
          <li><strong>Gap assessment.</strong> A readiness review by an independent auditor against the Security criteria.</li>
          <li><strong>Type I report,</strong> then a Type II observation period.</li>
        </ol>
        <p>If SOC 2 is a hard requirement for your purchase, tell us at <a href="mailto:hello@northfoundry.co?subject=SOC%202%20requirement">hello@northfoundry.co</a>. Real demand moves this up the list.</p>
      </section>
      <section>
        <h2>3. Where data is stored</h2>
        <ul>
          <li><strong>Database, files and authentication (Convex):</strong> a single deployment in the United States (US East). Workspace content, including messages, tasks, notes and uploaded files, is stored there.</li>
          <li><strong>Other processors</strong> (hosting, meetings, transcription, AI, email, document collaboration) are listed on the <Link href="/subprocessors">subprocessor page</Link>. Where a provider routes traffic is set by that provider.</li>
          <li><strong>Choice of region:</strong> not available. There is one deployment for all customers. We cannot today keep a customer&rsquo;s data in the EU or any other region.</li>
        </ul>
        <p>Data may therefore be transferred to the United States. The <Link href="/dpa">DPA</Link> covers the transfer terms.</p>
      </section>
      <section>
        <h2>4. Retention and deletion</h2>
        <ul>
          <li>Deleting a workspace removes its content.</li>
          <li>A member who leaves keeps their channel messages in the workspace, marked as a former member: 90 days on Free, for as long as the workspace exists on paid plans. Their direct messages are removed.</li>
          <li>Owners and admins can export workspace data; anyone can export their own.</li>
          <li>Backups and logs expire on the providers&rsquo; regular schedules. We do not offer a configurable retention period or legal hold yet.</li>
        </ul>
      </section>
      <section>
        <h2>5. Incidents</h2>
        <p>Server errors are reported to us automatically and the service health endpoint is checked on a schedule. If personal data in your workspace is affected by a breach, we notify the workspace owner without undue delay, and within 72 hours of confirming it where the law requires. We do not offer a contractual uptime SLA or a public status page yet.</p>
      </section>
      <section>
        <h2>6. Questions or a security review</h2>
        <p>Send a questionnaire or question to <a href="mailto:hello@northfoundry.co?subject=Security%20review">hello@northfoundry.co</a>. We answer from what is on this site and say plainly when the answer is no.</p>
      </section>
    </LegalPage>
  )
}
