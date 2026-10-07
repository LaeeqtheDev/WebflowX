import type { Metadata } from "next"
import { LegalPage } from "@/components/legal/legal-page"

export const metadata: Metadata = {
  title: "Terms of Service",
  description: "The terms that govern your use of WebflowX, operated by North Foundry: accounts, workspaces, your content, acceptable use and billing.",
  alternates: { canonical: "/terms" },
  openGraph: { title: "Terms of Service | WebflowX", description: "The terms that govern your use of WebflowX, operated by North Foundry: accounts, workspaces, your content, acceptable use and billing.", url: "/terms" },
}

export default function TermsPage() {
  return (
    <LegalPage title="Terms of Service" updated="October 7, 2026">
      <section>
        <p>These Terms govern your use of WebflowX (the &ldquo;Service&rdquo;), operated by North Foundry (&ldquo;we&rdquo;, &ldquo;us&rdquo;). By creating an account or using the Service you agree to them. If you use the Service for an organization, you confirm you can bind it to these Terms.</p>
      </section>
      <section>
        <h2>1. Your account</h2>
        <p>You must provide accurate information, keep your credentials secure and be responsible for activity under your account. You must be old enough to form a binding contract where you live. Tell us promptly at support@northfoundry.co if you suspect unauthorized access.</p>
      </section>
      <section>
        <h2>2. Workspaces, roles and admins</h2>
        <p>A workspace belongs to its owner. Owners and admins decide who joins, which roles and permissions people hold, and what is shared. They can see the workspace&rsquo;s content, members, activity and audit log, and can remove members or delete the workspace. If you join someone else&rsquo;s workspace, they, not us, control that workspace&rsquo;s data.</p>
      </section>
      <section>
        <h2>3. Your content</h2>
        <p>You keep ownership of everything you post, upload or create (&ldquo;Your Content&rdquo;). You give us a limited license to host, process, transmit and display it only as needed to run and improve the Service for you, including features you use such as search, meeting transcripts and AI summaries. You are responsible for Your Content and for having the rights to share it.</p>
      </section>
      <section>
        <h2>4. Acceptable use</h2>
        <p>You agree not to:</p>
        <ul>
          <li>break the law or infringe anyone&rsquo;s rights, or upload malware or illegal content;</li>
          <li>harass, threaten or abuse others, or send spam;</li>
          <li>probe, scan or test the Service&rsquo;s security, or try to access other workspaces&rsquo; data;</li>
          <li>bypass plan limits, rate limits or storage caps, or use automated means to overload the Service;</li>
          <li>record meetings without the consent that applicable law requires.</li>
        </ul>
        <p>We may suspend or remove content or accounts that violate these rules.</p>
      </section>
      <section>
        <h2>5. Meetings, transcription and AI features</h2>
        <p>Meeting audio can be transcribed and summarized using third-party processors. AI output can be wrong, so review it before relying on it. Tell participants when a meeting is being transcribed. Content you send to AI features is processed to produce the result and is not used by us to train our own models.</p>
      </section>
      <section>
        <h2>6. Plans, limits and payment</h2>
        <p>The Service has Free, Startup, Growth and Enterprise plans with limits on workspaces, members, channels, notes, documents, meetings, AI summaries and storage, as shown on our pricing page. Paid plans are billed per workspace and are charged in advance. Prices and limits may change with notice. Online payment is not switched on yet; until it is, plan changes are made by workspace owners in workspace settings and no charge is taken. Where paid billing is enabled, fees are non-refundable except where the law requires otherwise or we state otherwise.</p>
      </section>
      <section>
        <h2>7. Your data, export and deletion</h2>
        <p>You can export your data from within the Service. Owners can delete a workspace, which removes its content from our systems, and backups are overwritten on their normal cycle. You can stop using the Service at any time.</p>
      </section>
      <section>
        <h2>8. Availability and changes</h2>
        <p>We work to keep the Service reliable but do not promise it will be uninterrupted or error-free. We may update, add or retire features, and will give reasonable notice of material changes.</p>
      </section>
      <section>
        <h2>9. Disclaimers and liability</h2>
        <p>The Service is provided &ldquo;as is&rdquo; and &ldquo;as available&rdquo;. To the extent the law allows, we disclaim implied warranties, and our total liability for any claim is limited to the amount you paid us in the 12 months before the claim (or USD 100 if you paid nothing). We are not liable for indirect or consequential losses. Nothing here limits liability that cannot be limited by law.</p>
      </section>
      <section>
        <h2>10. Termination</h2>
        <p>You may close your account at any time. We may suspend or end access if you breach these Terms or put the Service or others at risk. Sections that should survive termination do.</p>
      </section>
      <section>
        <h2>11. Changes to these Terms and contact</h2>
        <p>We may update these Terms; if the change is material we will notify you in the Service or by email. Continuing to use the Service after the effective date means you accept the update. Questions: <a href="mailto:support@northfoundry.co">support@northfoundry.co</a>. See also our <a href="/privacy">Privacy Policy</a>.</p>
      </section>
    </LegalPage>
  )
}
