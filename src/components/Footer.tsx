import Image from "next/image";
import Link from "next/link";
import { wrap } from "./landing/tokens";

const cols = [
  { title: "Product", links: [["Features", "#features"], ["Security", "#security"], ["Pricing", "#pricing"], ["FAQ", "#faq"]] },
  { title: "Company", links: [["Merger", "#merger"], ["Journey", "#timeline"], ["Team", "#team"]] },
  { title: "Legal", links: [["Terms of Service", "/terms"], ["Privacy Policy", "/privacy"]] },
  { title: "Account", links: [["Log in", "/auth"], ["Start free", "/auth"]] },
];

export default function Footer() {
  return (
    <footer className="w-full bg-[#381d2a] text-white/60">
      <div className={`${wrap} py-16`}>
        <div className="grid gap-12 md:grid-cols-6">
          <div className="md:col-span-2">
            <div className="flex items-center gap-3">
              <Image src="/logo.png" alt="" width={32} height={32} className="h-8 w-8 rounded-lg" />
              <span className="text-lg font-semibold text-white">WebflowX</span>
              <span className="text-xl text-white/40">&times;</span>
              <Image src="/northfoundry-logo.png" alt="" width={32} height={32} className="h-8 w-8 rounded-lg" />
              <span className="text-lg font-semibold text-white">North Foundry</span>
            </div>
            <p className="mt-5 max-w-sm text-sm leading-relaxed">
              A team workspace for chat, tasks, notes, documents, spreadsheets, meetings and AI summaries, with roles, permissions and data export.
            </p>
            <a href="mailto:hello@northfoundry.co" className="mt-5 inline-block text-sm text-white hover:text-[#ff5018]">
              hello@northfoundry.co
            </a>
          </div>
          {cols.map((c) => (
            <div key={c.title}>
              <p className="lp-label text-white/45">{c.title}</p>
              <ul className="mt-5 space-y-3 text-sm">
                {c.links.map(([label, href]) => (
                  <li key={label}>
                    <Link href={href} className="transition-colors hover:text-white">{label}</Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="mt-14 border-t border-white/10 pt-6 text-xs text-white/55">
          &copy; {new Date().getFullYear()} WebflowX. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
