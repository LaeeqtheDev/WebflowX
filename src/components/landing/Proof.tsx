import React from "react";
import { wrap } from "./tokens";
import { CountUp } from "./ui";

// Real numbers only. Each line was given by the WebflowX team (Oct–Nov 2026); update or remove here when they change.
const PROOF = [
  { n: "100+", l: "teams onboarded" },
  { n: "68", l: "teams active every week" },
  { n: "Apr 2025", l: "live and shipping since" },
];

// Teams using WebflowX, as named by the WebflowX team (Nov 2026). We draw a simple monogram for each instead of
// using anyone's real logo; swap in their logo files only with their OK.
const TEAMS = [
  { name: "Arvex Fleet Solutions", mark: "AF", shape: "rounded-lg", bg: "#ff5018" },
  { name: "Robert and Co Trucking", mark: "R&", shape: "rounded-full", bg: "#8b5cf6" },
  { name: "Routelane LLC", mark: "RL", shape: "rounded-md rotate-45", bg: "#10b981" },
  { name: "North Foundry", mark: "NF", shape: "rounded-lg", bg: "#f59e0b" },
  { name: "H2O Logistics", mark: "H₂O", shape: "rounded-full", bg: "#0ea5e9" },
];

const Team = ({ t, hidden }: { t: (typeof TEAMS)[number]; hidden?: boolean }) => (
  <li aria-hidden={hidden || undefined} className="flex shrink-0 items-center gap-3 px-8">
    <span className="relative flex h-9 w-9 items-center justify-center">
      <span className={`absolute inset-1 ${t.shape}`} style={{ background: t.bg }} />
      <span className="relative text-[11px] font-bold tracking-tight text-white">{t.mark}</span>
    </span>
    <span className="whitespace-nowrap text-lg font-semibold tracking-tight text-white/85 sm:text-xl">{t.name}</span>
  </li>
);

export default function Proof() {
  return (
    <section aria-label="WebflowX in numbers" className="relative w-full overflow-hidden border-y border-white/10 bg-[#1b0d15] py-10 text-white">
      <ul className={`${wrap} grid grid-cols-3 gap-x-6 gap-y-7`}>
        {PROOF.map((p) => (
          <li key={p.l} className="md:border-l md:border-white/10 md:pl-6 md:first:border-l-0 md:first:pl-0">
            <p className="lp-h bg-gradient-to-br from-white to-[#ffb699] bg-clip-text text-3xl text-transparent sm:text-[2.6rem]">
              <CountUp value={p.n} />
            </p>
            <p className="mt-1.5 text-sm leading-snug text-white/65">{p.l}</p>
          </li>
        ))}
      </ul>
      <div className="mt-9 border-t border-white/10 pt-7">
        <p className={`${wrap} text-center text-xs font-semibold uppercase tracking-[0.14em] text-white/60`}>Teams already working in WebflowX</p>
        <div className="lp-marquee mt-5 overflow-hidden">
          <ul className="lp-marquee-track">
            {TEAMS.map((t) => <Team key={t.name} t={t} />)}
            {/* second copy makes the loop seamless */}
            {TEAMS.map((t) => <Team key={`${t.name}-2`} t={t} hidden />)}
            {TEAMS.map((t) => <Team key={`${t.name}-3`} t={t} hidden />)}
            {TEAMS.map((t) => <Team key={`${t.name}-4`} t={t} hidden />)}
          </ul>
        </div>
      </div>
    </section>
  );
}
