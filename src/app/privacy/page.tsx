import type { Metadata } from "next"
import { LegalPage } from "@/components/legal/legal-page"

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "What WebflowX, operated by North Foundry, collects, why, and the choices you have over your data.",
  alternates: { canonical: "/privacy" },
  openGraph: { title: "Privacy Policy | WebflowX", description: "What WebflowX, operated by North Foundry, collects, why, and the choices you have over your data.", url: "/privacy" },
}

export default function PrivacyPage() {
  return (
    <LegalPage title="Privacy Policy" updated="October 7, 2026">
      <section>
        <p>This policy explains what WebflowX, operated by North Foundry (&ldquo;we&rdquo;), collects, why, and the choices you have. We do not sell your personal data.</p>
      </section>
      <section>
        <h2>1. What we collect</h2>
        <ul>
          <li><strong>Account data:</strong> name, email, profile photo, title and bio; your sign-in method (password, Google or GitHub). Passwords are stored hashed, never in plain text.</li>
          <li><strong>Workspace content:</strong> messages, files, tasks, notes, documents, meeting records and transcripts, reactions, and workspace settings you or your teammates create.</li>
          <li><strong>Activity data:</strong> membership and role changes, audit log entries, notifications, and usage counts used to apply plan limits.</li>
          <li><strong>Technical data:</strong> basic logs such as IP address, device and browser type, used for security, rate limiting and troubleshooting.</li>
        </ul>
      </section>
      <section>
        <h2>2. How we use it</h2>
        <ul>
          <li>to provide and secure the Service, including real-time collaboration, search and notifications;</li>
          <li>to send account emails such as verification codes and password resets;</li>
          <li>to provide AI summaries and meeting transcripts you request;</li>
          <li>to prevent abuse, enforce limits and fix problems.</li>
        </ul>
      </section>
      <section>
        <h2>3. Who sees your content</h2>
        <p>Your workspace&rsquo;s owner and admins can access its content and the audit log. Members see what they have access to; locked channels are limited to the people added and to roles allowed to view them. Direct messages are visible only to the participants.</p>
      </section>
      <section>
        <h2>4. Service providers</h2>
        <p>We use trusted processors to run the Service. They handle data only on our instructions:</p>
        <ul>
          <li>Convex &mdash; database, file storage and authentication backend;</li>
          <li>Vercel &mdash; web hosting;</li>
          <li>LiveKit &mdash; real-time audio and video for meetings;</li>
          <li>Deepgram &mdash; live meeting transcription;</li>
          <li>Groq &mdash; AI summaries and writing assistance;</li>
          <li>Liveblocks &mdash; real-time document collaboration;</li>
          <li>Resend &mdash; transactional email;</li>
          <li>Google and GitHub &mdash; if you choose to sign in with them.</li>
        </ul>
        <p>Data may be processed in countries other than yours, with appropriate safeguards.</p>
      </section>
      <section>
        <h2>5. Retention</h2>
        <p>We keep your data while your account or workspace exists. Deleting a workspace removes its content; leaving a workspace removes your messages and reactions in it. Backups and logs expire on their regular schedule. Meeting AI-usage records are kept for plan accounting.</p>
      </section>
      <section>
        <h2>6. Your rights and choices</h2>
        <p>You can edit your profile at any time and export your data from the Service (your own data from your profile menu; workspace owners and admins can export the workspace). Depending on where you live, you may also have the right to access, correct, delete or restrict the use of your personal data, or to object to it. To exercise a right we cannot satisfy in the app, email <a href="mailto:support@northfoundry.co">support@northfoundry.co</a>.</p>
      </section>
      <section>
        <h2>7. Security</h2>
        <p>We use encryption in transit, role-based access, rate limiting and an audit log to protect your data. No system is perfectly secure, so use a strong, unique password and report anything suspicious to us.</p>
      </section>
      <section>
        <h2>8. Children</h2>
        <p>The Service is not directed to children under 13, and we do not knowingly collect their data.</p>
      </section>
      <section>
        <h2>9. Changes and contact</h2>
        <p>We will post updates here and, for material changes, notify you in the Service or by email. Contact: <a href="mailto:support@northfoundry.co">support@northfoundry.co</a>. See also our <a href="/terms">Terms of Service</a>.</p>
      </section>
    </LegalPage>
  )
}
