import type { Metadata } from "next"
import Link from "next/link"
import { TEMPLATES } from "@/lib/templates"

export const metadata: Metadata = {
  title: "Workspace templates",
  description: "Start a WebflowX workspace from a template for agencies, software teams, support, startups or remote teams. Channels, starter tasks and a note are set up for you.",
  alternates: { canonical: "/templates" },
  openGraph: { title: "Workspace templates | WebflowX", description: "Channels, starter tasks and a note for your kind of team, set up when you create the workspace.", url: "/templates" },
}

export default function TemplatesPage() {
  return (
    <div className="min-h-screen bg-[#fbf9f7] text-[#1b1017]">
      <header className="border-b border-[#381d2a]/10 bg-white">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-4 sm:px-6">
          <Link href="/" className="font-semibold">WebflowX</Link>
          <Link href="/auth?mode=signup" className="rounded-full bg-[#381d2a] px-4 py-1.5 text-sm font-medium text-white">Get started</Link>
        </div>
      </header>
      <main className="mx-auto max-w-4xl px-4 py-12 sm:px-6">
        <nav aria-label="Breadcrumb" className="text-sm text-[#1b1017]/65">
          <Link href="/" className="hover:text-[#a82d0a]">Home</Link> / <span aria-current="page">Templates</span>
        </nav>
        <h1 className="mt-6 text-4xl font-semibold tracking-tight">Start from a template</h1>
        <p className="mt-4 max-w-2xl text-lg text-[#1b1017]/75">
          Pick one when you create your workspace. It adds the channels, a few starter tasks and a note, all of which you can rename or delete. They fit on the Free plan.
        </p>
        <ul className="mt-10 grid gap-5 sm:grid-cols-2">
          {TEMPLATES.map((t) => (
            <li key={t.key} className="rounded-2xl border border-[#381d2a]/10 bg-white p-6">
              <h2 className="text-xl font-semibold">{t.name}</h2>
              <p className="mt-1 text-sm text-[#1b1017]/60">{t.audience}</p>
              <p className="mt-3 text-[15px] text-[#1b1017]/75">{t.description}</p>
              <p className="mt-4 text-xs font-semibold uppercase tracking-wider text-[#1b1017]/55">Channels</p>
              <p className="mt-1 text-sm">{t.channels.map((c) => `#${c}`).join("  ")}</p>
              <p className="mt-4 text-xs font-semibold uppercase tracking-wider text-[#1b1017]/55">Starter tasks</p>
              <ul className="mt-1 list-disc space-y-0.5 pl-5 text-sm">
                {t.tasks.map((x) => <li key={x.title}>{x.title}</li>)}
              </ul>
              <p className="mt-4 text-xs font-semibold uppercase tracking-wider text-[#1b1017]/55">Note</p>
              <p className="mt-1 text-sm">{t.note.title}</p>
              <div className="mt-5 flex flex-wrap items-center gap-4 text-sm">
                <Link href={`/auth?mode=signup&next=${encodeURIComponent(`/dashboard?template=${t.key}`)}`} className="rounded-full bg-[#381d2a] px-4 py-1.5 font-medium text-white hover:bg-[#ff5018]">Use this template</Link>
                {t.useCase && <Link href={`/use-cases/${t.useCase}`} className="text-[#c2370d] underline-offset-4 hover:underline">How teams like this use it</Link>}
              </div>
            </li>
          ))}
        </ul>
      </main>
    </div>
  )
}
