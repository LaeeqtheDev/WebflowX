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
  { name: "Arvex Fleet Solutions", what: "Fleet management", mark: "AF", from: "#ff5018", to: "#ff8a63" },
  { name: "Robert and Co Trucking", what: "Trucking", mark: "R&", from: "#7c3aed", to: "#a78bfa" },
  { name: "Routelane LLC", what: "Truck dispatch", mark: "RL", from: "#ff5018", to: "#7c3aed" },
  { name: "North Foundry", what: "Digital studio", mark: "NF", from: "#381d2a", to: "#7c3aed" },
  { name: "H2O Logistics", what: "Logistics", mark: "H₂O", from: "#7c3aed", to: "#ff5018" },
];

const Team = ({ t, hidden }: { t: (typeof TEAMS)[number]; hidden?: boolean }) => (
  <li aria-hidden={hidden || undefined} className="shrink-0 px-2">
    <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.04] py-3 pl-3 pr-6 transition-colors hover:border-white/25 hover:bg-white/[0.07]">
      <span className="flex h-10 w-10 items-center justify-center rounded-xl text-[12px] font-bold tracking-tight text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.25)]"
        style={{ background: `linear-gradient(135deg, ${t.from}, ${t.to})` }}>{t.mark}</span>
      <span>
        <span className="block whitespace-nowrap text-[15px] font-semibold tracking-tight text-white">{t.name}</span>
        <span className="block whitespace-nowrap text-[12px] text-white/60">{t.what}</span>
      </span>
    </div>
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
        <div className="lp-marquee mt-6 overflow-hidden py-1">
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
