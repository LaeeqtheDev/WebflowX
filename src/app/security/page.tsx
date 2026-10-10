import type { Metadata } from "next"
import Link from "next/link"
import { SITE_URL } from "@/lib/site"

export const metadata: Metadata = {
  title: "Security",
  description: "How WebflowX protects workspaces today: server-side permissions, two-step verification, signed webhooks, audit log, data export, and what we do not offer yet.",
  alternates: { canonical: "/security" },
  openGraph: { title: "Security | WebflowX", description: "How WebflowX protects workspaces today, and what is not available yet.", url: "/security" },
}

const done = [
  ["Permissions on the server", "Roles and permissions are checked in the backend for every read and write, not just hidden in the interface. Four built-in roles plus custom roles built from 14 permissions."],
  ["Two-step verification", "Anyone can add an authenticator app and keep backup codes. On Growth and Enterprise, owners and admins can require it for everyone in the workspace."],
  ["Sign-in", "Email and password with emailed verification codes, plus Google and GitHub sign-in. Passwords are stored hashed."],
  ["Webhook integrity", "Stripe and GitHub webhooks are verified by signature before anything is processed. Outgoing webhooks are signed so receivers can verify them."],
  ["Abuse protection", "Rate limits and size limits guard notes, tasks, files, databases, comments, email, two-step codes and integrations. Uploads are checked against an allowed-type list and size caps."],
  ["Audit log", "Admin actions are recorded in an audit log that owners and admins can review."],
  ["Browser protections", "The site sends HSTS, a Content-Security-Policy, nosniff, a restrictive referrer policy and a tight Permissions-Policy, and limits framing."],
  ["Your data", "Anyone can download their own data, and owners and admins can export the workspace. Guests only see the channels they are added to."],
  ["Secrets", "Service keys are held in environment variables on the hosting platforms, not in the code."],
]

const notYet = [
  "SOC 2 or ISO 27001 certification. We have not been audited against either.",
  "A contractual uptime SLA, or a public status page with uptime history.",
  "SAML single sign-on and SCIM provisioning. Google and GitHub sign-in are available today.",
  "Choice of data region. Workspace data is stored in one US deployment (see Trust).",
  "Customer-managed encryption keys.",
]

export default function SecurityPage() {
  return (
    <div className="min-h-screen bg-[#fbf9f7] text-[#1b1017]">
      <header className="border-b border-[#381d2a]/10 bg-white">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-4 sm:px-6">
          <Link href="/" className="font-semibold">WebflowX</Link>
          <nav className="flex gap-5 text-sm text-[#1b1017]/65">
            <Link href="/terms" className="hover:text-[#a82d0a]">Terms</Link>
            <Link href="/privacy" className="hover:text-[#a82d0a]">Privacy</Link>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
        <nav aria-label="Breadcrumb" className="text-sm text-[#1b1017]/65">
          <Link href="/" className="hover:text-[#a82d0a]">Home</Link> / <span aria-current="page">Security</span>
        </nav>
        <h1 className="mt-6 text-4xl font-semibold tracking-tight">Security at WebflowX</h1>
        <p className="mt-4 text-lg leading-relaxed text-[#1b1017]/75">
          This page describes what is in place today and what is not. We would rather you know both before you buy. Last updated October 9, 2026.
        </p>

        <h2 className="mt-12 text-2xl font-semibold">What we do today</h2>
        <dl className="mt-5 space-y-5">
          {done.map(([t, d]) => (
            <div key={t}>
              <dt className="font-medium">{t}</dt>
              <dd className="mt-1 text-[#1b1017]/75">{d}</dd>
            </div>
          ))}
        </dl>

        <h2 className="mt-12 text-2xl font-semibold">What we do not offer yet</h2>
        <ul className="mt-4 list-disc space-y-2 pl-5 text-[#1b1017]/75">
          {notYet.map((n) => <li key={n}>{n}</li>)}
        </ul>

        <h2 className="mt-12 text-2xl font-semibold">Service providers</h2>
        <p className="mt-3 text-[#1b1017]/75">
          The processors that handle data on our behalf are on the <Link href="/subprocessors" className="text-[#c2370d] underline-offset-4 hover:underline">subprocessor list</Link>. Our <Link href="/dpa" className="text-[#c2370d] underline-offset-4 hover:underline">Data Processing Agreement</Link> and SOC 2 roadmap are on the <Link href="/trust" className="text-[#c2370d] underline-offset-4 hover:underline">Trust page</Link>.
        </p>

        <h2 className="mt-12 text-2xl font-semibold">Report a vulnerability</h2>
        <p className="mt-3 text-[#1b1017]/75">
          Email <a href="mailto:hello@northfoundry.co?subject=Security%20report" className="text-[#c2370d] underline-offset-4 hover:underline">hello@northfoundry.co</a> with the details and steps to reproduce. Please do not access other people&rsquo;s data or disrupt the service while testing. A machine-readable contact is published at <a href={`${SITE_URL}/.well-known/security.txt`} className="text-[#c2370d] underline-offset-4 hover:underline">/.well-known/security.txt</a>.
        </p>
      </main>
    </div>
  )
}
