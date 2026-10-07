import Link from "next/link"
import Image from "next/image"
import type { ReactNode } from "react"

export const LegalPage = ({ title, updated, children }: { title: string; updated: string; children: ReactNode }) => (
  <div className="min-h-screen bg-[#fbf9f7] text-[#1b1017]">
    <header className="border-b border-[#381d2a]/10 bg-white">
      <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2.5 font-semibold">
          <Image src="/logo.png" alt="WebflowX" width={28} height={28} className="h-7 w-7 rounded-lg" />
          WebflowX
        </Link>
        <nav className="flex gap-5 text-sm text-[#1b1017]/65">
          <Link href="/terms" className="hover:text-[#ff5018]">Terms</Link>
          <Link href="/privacy" className="hover:text-[#ff5018]">Privacy</Link>
        </nav>
      </div>
    </header>
    <main className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <h1 className="text-4xl font-semibold tracking-tight">{title}</h1>
      <p className="mt-2 text-sm text-[#1b1017]/55">Last updated {updated}</p>
      <div className="mt-8 space-y-8 text-[15px] leading-relaxed text-[#1b1017]/80 [&_h2]:mb-2 [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:text-[#1b1017] [&_ul]:mt-2 [&_ul]:list-disc [&_ul]:space-y-1 [&_ul]:pl-5 [&_a]:text-[#ff5018] [&_a]:underline-offset-4 hover:[&_a]:underline">
        {children}
      </div>
    </main>
  </div>
)
