import React from "react";
import Link from "next/link";
import { Heading, Label, Reveal } from "./landing/ui";
import { wrap } from "./landing/tokens";

const rows = [
  "Workspaces",
  "Members",
  "Channels",
  "Personal notes",
  "Workspace notes",
  "Pages and databases",
  "Database rows",
  "Meetings / month",
  "AI summaries / month",
  "File storage",
  "Message history",
  "Guests",
  "API keys",
  "Incoming webhooks",
  "Outgoing webhooks",
  "GitHub connections",
];

const plans = [
  { name: "Free", price: "$0", v: ["1", "10", "5", "10", "20", "20", "500", "5", "2", "250 MB", "90 days", "None", "None", "None", "None", "None"] },
  { name: "Startup", price: "$29", v: ["3", "25", "20", "50", "100", "100", "5,000", "20", "10", "5 GB", "Unlimited", "5", "3", "5", "None", "None"] },
  { name: "Growth", price: "$79", v: ["10", "100", "50", "Unlimited", "Unlimited", "500", "50,000", "50", "30", "50 GB", "Unlimited", "25", "10", "20", "10", "5"] },
  { name: "Enterprise", price: "$249", v: ["Unlimited", "Unlimited", "Unlimited", "Unlimited", "Unlimited", "Unlimited", "Unlimited", "200", "150", "1 TB", "Unlimited", "Unlimited", "Unlimited", "Unlimited", "Unlimited", "Unlimited"] },
];

const PricingSection = () => (
  <section id="pricing" className="w-full bg-[#f7f2ee] py-24 md:py-32">
    <div className={wrap}>
      <Reveal>
        <Label>Pricing</Label>
        <Heading className="mt-5 max-w-3xl">Four plans. Clear limits.</Heading>
        <p className="mt-5 max-w-lg text-[17px] leading-relaxed text-[#1b1017]/70">
          Pick the limits that fit your team. Free keeps the last 90 days of messages visible; paid plans keep everything. Limits and storage apply per workspace (the number of workspaces is per owner); meetings and AI summaries reset each month. Upgrade, change or cancel any time from workspace settings. Payments are handled by Stripe.
        </p>
      </Reveal>
      <Reveal delay={80}>
        <div className="mt-14 grid gap-px overflow-hidden rounded-xl border border-[#381d2a]/15 bg-[#381d2a]/15 sm:grid-cols-2 lg:grid-cols-4">
          {plans.map((p) => {
            const dark = p.name === "Enterprise";
            return (
              <div key={p.name} className={`flex flex-col p-7 ${dark ? "bg-[#381d2a] text-white" : "bg-white text-[#1b1017]"}`}>
                <p className={`lp-label ${dark ? "text-white/60" : "text-[#381d2a]/60"}`}>{p.name}</p>
                <p className="mt-4 flex items-baseline gap-1.5">
                  <span className="lp-h text-5xl">{p.price}</span>
                  <span className={`text-sm ${dark ? "text-white/60" : "text-[#1b1017]/65"}`}>/ month</span>
                </p>
                <dl className="mt-7 flex-1 text-sm">
                  {rows.map((r, i) => (
                    <div
                      key={r}
                      className={`flex items-center justify-between border-t py-3 ${dark ? "border-white/15" : "border-[#381d2a]/10"}`}
                    >
                      <dt className={dark ? "text-white/65" : "text-[#1b1017]/65"}>{r}</dt>
                      <dd className="font-semibold">{p.v[i]}</dd>
                    </div>
                  ))}
                </dl>
                <Link
                  href="/auth"
                  className={`mt-7 rounded-md px-5 py-3 text-center text-sm font-semibold transition-colors ${
                    dark ? "bg-[#ff5018] text-white hover:bg-[#e6430f]" : "bg-[#381d2a] text-white hover:bg-[#ff5018]"
                  }`}
                >
                  {p.price === "$0" ? "Start free" : "Get started"}
                </Link>
              </div>
            );
          })}
        </div>
        <p className="mt-6 max-w-2xl text-sm leading-relaxed text-[#1b1017]/70">
          Enterprise storage is 1 TB under fair use. When a workspace reaches a limit, WebflowX tells you which
          one and shows the next plan.
        </p>
      </Reveal>
    </div>
  </section>
);

export default PricingSection;
