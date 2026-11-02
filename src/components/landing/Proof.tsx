import React from "react";
import { wrap } from "./tokens";

// Real numbers only. Each line was given by the WebflowX team (Oct–Nov 2026); update or remove here when they change.
const PROOF = [
  { n: "100+", l: "teams onboarded" },
  { n: "68", l: "teams active every week" },
  { n: "Apr 2025", l: "live and shipping since" },
  { n: "Selected", l: "to pitch at the University of Lahore Innovation Launchpad" },
];

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
    </section>
  );
}
