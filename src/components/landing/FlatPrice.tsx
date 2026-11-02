"use client";

import React, { useState } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Heading, Label, Reveal } from "./ui";
import { wrap } from "./tokens";

// WebflowX is priced per workspace, so the price per person falls as the team grows.
// Only our own prices are used here; what the visitor pays elsewhere is whatever they type in.
const PLANS = [
  { name: "Free", price: 0, members: 10 },
  { name: "Startup", price: 29, members: 25 },
  { name: "Growth", price: 79, members: 100 },
  { name: "Enterprise", price: 249, members: Infinity },
];

const money = (n: number) => (n >= 100 ? `$${Math.round(n).toLocaleString("en-US")}` : `$${n.toFixed(n % 1 === 0 ? 0 : 2)}`);

export default function FlatPrice() {
  const [people, setPeople] = useState(12);
  const [perSeat, setPerSeat] = useState("");
  const plan = PLANS.find((p) => p.members >= people) ?? PLANS[3];
  const each = plan.price / people;
  const theirs = parseFloat(perSeat);
  const theirTotal = Number.isFinite(theirs) && theirs > 0 ? theirs * people : null;
  const saved = theirTotal !== null ? theirTotal - plan.price : null;

  return (
    <section id="flat-price" className="w-full bg-white py-24 md:py-32">
      <div className={wrap}>
        <div className="grid gap-12 lg:grid-cols-2 lg:items-center lg:gap-20">
          <Reveal>
            <Label>One price for the whole team</Label>
            <Heading className="mt-5">Add people. Not costs.</Heading>
            <p className="mt-5 max-w-md text-[17px] leading-relaxed text-[#1b1017]/70">
              Most team tools charge for every seat, so the bill grows every time you hire. WebflowX charges one flat price per
              workspace, with chat, tasks, docs, meetings and the AI agents included. The bigger your team, the less each person costs.
            </p>
          </Reveal>

          <Reveal delay={80}>
            <div className="rounded-3xl bg-[#381d2a] p-6 text-white sm:p-8">
              <label htmlFor="team-size" className="flex items-baseline justify-between text-sm text-white/70">
                <span>People on your team</span>
                <span className="lp-h text-4xl text-white tabular-nums">{people}</span>
              </label>
              <input id="team-size" type="range" min={1} max={150} value={people} onChange={(e) => setPeople(Number(e.target.value))}
                className="mt-4 w-full accent-[#ff5018]" />

              <div className="mt-7 grid grid-cols-2 gap-3">
                <div className="rounded-2xl bg-[#2a1420] p-4">
                  <p className="text-xs text-white/55">Your plan</p>
                  <p className="mt-1 text-xl font-semibold">{plan.name}</p>
                  <p className="text-sm text-white/65">{plan.price === 0 ? "Free" : `${money(plan.price)} / month in total`}</p>
                </div>
                <div className="rounded-2xl bg-[#ff5018] p-4">
                  <p className="text-xs text-white/80">Per person</p>
                  <p className="mt-1 text-xl font-semibold tabular-nums">{plan.price === 0 ? "$0" : money(each)}</p>
                  <p className="text-sm text-white/85">a month</p>
                </div>
              </div>

              <label className="mt-6 flex flex-col gap-2 text-sm text-white/70">
                Paying per seat for team tools today? What does it cost per person a month?
                <span className="flex items-center rounded-xl border border-white/15 bg-white/5 px-3 focus-within:border-[#ff5018]">
                  <span className="text-white/55">$</span>
                  <input inputMode="decimal" value={perSeat} onChange={(e) => setPerSeat(e.target.value.replace(/[^\d.]/g, "").slice(0, 7))}
                    placeholder="e.g. 25" aria-label="What you pay per person per month today"
                    className="h-11 w-full bg-transparent px-1.5 text-white outline-none placeholder:text-white/35" />
                </span>
              </label>
              {theirTotal !== null && saved !== null && (
                <p className="mt-4 rounded-xl bg-white/5 px-4 py-3 text-[15px] leading-relaxed" aria-live="polite">
                  {saved > 0 ? (
                    <>That&apos;s {money(theirTotal)} a month for {people} people. On WebflowX you&apos;d pay {money(plan.price)}, <span className="font-semibold text-[#ff8a63]">{money(saved)} less every month</span> ({money(saved * 12)} a year).</>
                  ) : (
                    <>That&apos;s {money(theirTotal)} a month for {people} people. WebflowX would be {money(plan.price)}, and it adds the AI agents.</>
                  )}
                </p>
              )}

              <Link href="/auth?mode=signup" className="mt-6 inline-flex items-center gap-2 rounded-lg bg-white px-5 py-3 text-[15px] font-semibold text-[#381d2a] transition-colors hover:bg-[#f7f2ee]">
                Start free <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
