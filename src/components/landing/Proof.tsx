import React from "react";
import { wrap } from "./tokens";

// Real numbers only. Each line was given by the WebflowX team (Oct–Nov 2026); update or remove here when they change.
const PROOF = [
  { n: "100+", l: "teams onboarded" },
  { n: "68", l: "teams active every week" },
  { n: "Apr 2025", l: "live and shipping since" },
  { n: "Selected", l: "to pitch at the University of Lahore Innovation Launchpad" },
];

// Teams using WebflowX, as named by the WebflowX team (Nov 2026). Text only: we don't use anyone's logo without their files and OK.
const TEAMS = ["Arvex Fleet Solutions", "Robert and Co Trucking", "Routelane LLC", "North Foundry", "H2O Logistics"];

export default function Proof() {
  return (
    <section aria-label="WebflowX in numbers" className="w-full border-y border-white/10 bg-[#1b0d15] py-8 text-white">
      <ul className={`${wrap} grid grid-cols-2 gap-x-6 gap-y-6 md:grid-cols-4`}>
        {PROOF.map((p) => (
          <li key={p.l} className="md:border-l md:border-white/10 md:pl-6 md:first:border-l-0 md:first:pl-0">
            <p className="lp-h text-3xl text-white sm:text-4xl">{p.n}</p>
            <p className="mt-1 text-sm leading-snug text-white/65">{p.l}</p>
          </li>
        ))}
      </ul>
      <div className={`${wrap} mt-8 flex flex-col gap-4 border-t border-white/10 pt-7 md:flex-row md:items-center md:gap-10`}>
        <p className="shrink-0 text-xs font-semibold uppercase tracking-wide text-white/60">Teams working in WebflowX</p>
        <ul className="flex flex-wrap items-center gap-x-8 gap-y-3">
          {TEAMS.map((t) => (
            <li key={t} className="lp-h text-lg text-white/80 sm:text-xl">{t}</li>
          ))}
          <li className="text-sm text-white/60">and many more</li>
        </ul>
      </div>
    </section>
  );
}
