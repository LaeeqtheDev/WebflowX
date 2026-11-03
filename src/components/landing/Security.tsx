import React from "react";
import Link from "next/link";
import { ArrowRight, Download, KeyRound, Lock, ScrollText, ShieldCheck, UserCog } from "lucide-react";
import { Label, Reveal } from "./ui";
import { wrap } from "./tokens";

// Short reassurance for buyers; the full detail (and what isn't offered yet) is on /security.
const points = [
  { icon: UserCog, t: "Roles and custom permissions", b: "Four built-in roles, or build your own from 14 permissions." },
  { icon: ShieldCheck, t: "Checked on the server", b: "Permissions are enforced in the backend, not just hidden in the interface." },
  { icon: Lock, t: "Private and read-only channels", b: "Lock a channel to chosen members, or make it announcements-only." },
  { icon: KeyRound, t: "Two-step verification", b: "For anyone, and required for everyone on Growth and Enterprise." },
  { icon: ScrollText, t: "Audit log", b: "Role, channel, invite, member and ownership changes are on record." },
  { icon: Download, t: "Your data, exportable", b: "Export the workspace any time. No lock-in." },
];

export default function SecuritySection() {
  return (
    <section id="security" className="w-full bg-white py-14 md:py-24">
      <div className={wrap}>
        <div className="grid gap-10 lg:grid-cols-[minmax(0,4fr)_minmax(0,8fr)]">
          <Reveal>
            <Label>Security and control</Label>
            <h2 className="lp-h mt-5 text-3xl text-[#1b1017] sm:text-4xl">You decide who sees and does what.</h2>
            <Link href="/security" className="mt-6 inline-flex items-center gap-1.5 text-[15px] font-semibold text-[#a82d0a] hover:text-[#ff5018]">
              How we protect your workspace <ArrowRight className="h-4 w-4" />
            </Link>
          </Reveal>
          <ul className="grid gap-x-8 gap-y-6 sm:grid-cols-2 lg:grid-cols-3">
            {points.map(({ icon: Icon, t, b }, i) => (
              <li key={t}>
                <Reveal delay={(i % 3) * 60} className="flex gap-3">
                  <Icon className="mt-0.5 h-5 w-5 shrink-0 text-[#ff5018]" aria-hidden="true" />
                  <span>
                    <span className="block text-[15px] font-semibold text-[#1b1017]">{t}</span>
                    <span className="mt-1 block text-[14px] leading-relaxed text-[#1b1017]/65">{b}</span>
                  </span>
                </Reveal>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
