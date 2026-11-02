import React from "react";
import Link from "next/link";
import { Check, ChevronDown } from "lucide-react";
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
  "Agent runs / month",
  "File storage",
  "Message history",
  "Guests",
  "API keys",
  "Incoming webhooks",
  "Outgoing webhooks",
  "GitHub connections",
];

const plans = [
  { name: "Free", price: "$0", v: ["1", "10", "5", "10", "20", "20", "500", "5", "2", "5", "250 MB", "90 days", "None", "None", "None", "None", "None"] },
  { key: "startup", name: "Startup", price: "$29", v: ["3", "25", "20", "50", "100", "100", "5,000", "20", "10", "50", "5 GB", "Unlimited", "5", "3", "5", "None", "None"] },
  { key: "growth", name: "Growth", price: "$79", v: ["10", "100", "50", "Unlimited", "Unlimited", "500", "50,000", "50", "30", "200", "50 GB", "Unlimited", "25", "10", "20", "10", "5"] },
  { key: "enterprise", name: "Enterprise", price: "$249", v: ["Unlimited", "Unlimited", "Unlimited", "Unlimited", "Unlimited", "Unlimited", "Unlimited", "200", "150", "1,000", "1 TB", "Unlimited", "Unlimited", "Unlimited", "Unlimited", "Unlimited", "Unlimited"] },
];

// Matches STRIPE_TRIAL_DAYS on the Convex deployment (default 14). Checkout gives a no-card trial to workspaces that never subscribed.
const TRIAL_DAYS = 14

// what each plan is for, in the words a buyer uses; the full limits table sits below for anyone checking details
const cards = [
  { key: "free", name: "Free", price: "$0", for: "Try it with a small team", cta: "Start free", points: ["Up to 10 people", "Chat, docs, tasks and meetings", "5 meetings and 2 AI summaries a month", "5 agent runs a month", "90 days of message history"] },
  { key: "startup", name: "Startup", price: "$29", for: "Small teams moving off four apps", cta: "Start with Startup", popular: true, points: ["Up to 25 people", "Unlimited message history", "20 meetings and 10 AI summaries a month", "50 agent runs a month", "Guests, API keys and webhooks"] },
  { key: "growth", name: "Growth", price: "$79", for: "Growing teams that run on meetings", cta: "Start with Growth", points: ["Up to 100 people", "50 meetings and 30 AI summaries a month", "200 agent runs a month", "GitHub and outgoing webhooks", "Require two-step verification"] },
  { key: "enterprise", name: "Enterprise", price: "$249", for: "Whole companies", cta: "Start with Enterprise", points: ["Unlimited people and workspaces", "200 meetings and 150 AI summaries a month", "1,000 agent runs a month", "1 TB of storage", "Everything in Growth"] },
];

const PricingSection = () => (
  <section id="pricing" className="w-full bg-[#f7f2ee] py-24 md:py-32">
    <div className={wrap}>
      <Reveal variant="blur">
        <Label>Pricing</Label>
        <Heading className="mt-5 max-w-3xl">One flat price for the whole team. Not per seat.</Heading>
        <p className="mt-5 max-w-xl text-[17px] leading-relaxed text-[#1b1017]/70">
          Add people without the bill going up. Every paid plan starts with a {TRIAL_DAYS}-day free trial, no card needed, and you can change or cancel any time.
        </p>
      </Reveal>
      <Reveal delay={80}>
        <div className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {cards.map((p, i) => {
            const hot = !!p.popular;
            return (
              <Reveal key={p.name} delay={i * 110} variant="scale" className={`h-full ${hot ? "order-first sm:order-none" : ""}`}>
              <div className={`relative flex h-full flex-col rounded-3xl p-7 ${hot ? "lp-shine " : "lp-lift "}${hot ? "bg-[#381d2a] text-white shadow-2xl shadow-[#381d2a]/30" : "border border-[#381d2a]/12 bg-white text-[#1b1017]"}`}>
                {hot && <span className="absolute -top-3 left-7 rounded-full bg-[#ff5018] px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-white">Most popular</span>}
                <p className={`lp-label ${hot ? "text-white/65" : "text-[#381d2a]/60"}`}>{p.name}</p>
                <p className="lp-h mt-4 text-5xl">{p.price}</p>
                <p className={`mt-1 text-sm ${hot ? "text-white/65" : "text-[#1b1017]/65"}`}>per month, for the whole team</p>
                <p className={`mt-2 min-h-[2.5rem] text-sm ${hot ? "text-white/75" : "text-[#1b1017]/70"}`}>{p.for}</p>
                <ul className="mt-6 flex-1 space-y-2.5 text-[14.5px]">
                  {p.points.map((x) => (
                    <li key={x} className="flex items-start gap-2.5">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-[#ff5018]" aria-hidden="true" />
                      <span className={hot ? "text-white/90" : "text-[#1b1017]/80"}>{x}</span>
                    </li>
                  ))}
                </ul>
                {/* the same footer on every card, so the buttons line up */}
                <div className="mt-8">
                  <Link
                    href={p.key === "free" ? "/auth?mode=signup" : `/auth?mode=signup&plan=${p.key}`}
                    className={`block rounded-lg px-5 py-3 text-center text-sm font-semibold transition-colors ${
                      hot ? "bg-[#ff5018] text-white hover:bg-[#ff6a3a]" : "bg-[#381d2a] text-white hover:bg-[#ff5018]"
                    }`}
                  >
                    {p.cta}
                  </Link>
                  <p className={`mt-2.5 text-center text-xs ${hot ? "text-white/70" : "text-[#1b1017]/60"}`}>
                    {p.key === "free" ? "Free forever, no card needed" : `${TRIAL_DAYS}-day free trial, no card`}
                    {p.key === "enterprise" && (
                      <> · <a href="mailto:support@northfoundry.co?subject=WebflowX%20Enterprise" className="font-semibold text-[#a82d0a] underline-offset-2 hover:underline">talk to us</a></>
                    )}
                  </p>
                </div>
              </div>
              </Reveal>
            );
          })}
        </div>
        <p className="mt-6 text-sm text-[#1b1017]/65">Prices in US dollars, excluding tax. Payments by Stripe. Limits apply per workspace; meetings, AI summaries and agent runs reset monthly.</p>
      </Reveal>

      <details className="group mt-10 rounded-2xl border border-[#381d2a]/12 bg-white">
        <summary className="flex cursor-pointer list-none items-center justify-between px-6 py-5 text-[15px] font-semibold text-[#1b1017]">
          See every limit, plan by plan
          <ChevronDown className="h-4 w-4 transition-transform group-open:rotate-180" aria-hidden="true" />
        </summary>
        <div className="overflow-x-auto border-t border-[#381d2a]/10 px-6 pb-6">
          <table className="mt-4 w-full min-w-[640px] text-left text-sm">
            <thead>
              <tr className="text-[#381d2a]/60">
                <th className="py-3 font-medium">Limit</th>
                {plans.map((p) => <th key={p.name} className="py-3 font-semibold text-[#1b1017]">{p.name} <span className="font-normal text-[#1b1017]/60">{p.price}</span></th>)}
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={r} className="border-t border-[#381d2a]/10">
                  <td className="py-3 text-[#1b1017]/65">{r}</td>
                  {plans.map((p) => <td key={p.name} className="py-3 font-semibold text-[#1b1017]">{p.v[i]}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
          <p className="mt-5 max-w-2xl text-sm leading-relaxed text-[#1b1017]/70">
            Free keeps the last 90 days of messages visible; paid plans keep everything. The number of workspaces is per owner. Enterprise
            storage is 1 TB under fair use. Quick one-to-one calls from a direct message end after 15 minutes on every plan and don&apos;t count as meetings. When a workspace reaches a limit, WebflowX tells you which one and shows the next plan.
          </p>
        </div>
      </details>

      <details className="group mt-4 rounded-2xl border border-[#381d2a]/12 bg-white">
        <summary className="flex cursor-pointer list-none items-center justify-between px-6 py-5 text-[15px] font-semibold text-[#1b1017]">
          Why meetings, AI summaries and agent runs have caps
          <ChevronDown className="h-4 w-4 transition-transform group-open:rotate-180" aria-hidden="true" />
        </summary>
        <div className="grid gap-10 border-t border-[#381d2a]/10 px-6 py-8 lg:grid-cols-[1fr_2fr]">
          <div>
            <Label>Why meetings and AI have caps</Label>
            <h3 className="lp-h mt-5 text-3xl">Everything else is flat. These two cost us money every time they run.</h3>
          </div>
          <div className="grid gap-8 sm:grid-cols-2">
            <div>
              <p className="font-semibold">Meetings</p>
              <p className="mt-2 text-[15px] leading-relaxed text-[#1b1017]/70">
                A meeting streams live audio and video through LiveKit and, with transcripts on, sends the audio to Deepgram. Both bill us by usage, so a meeting costs more the longer it runs and the more people join. A monthly count keeps that cost predictable for us, so we do not have to push it into a per-seat price.
              </p>
            </div>
            <div>
              <p className="font-semibold">AI summaries</p>
              <p className="mt-2 text-[15px] leading-relaxed text-[#1b1017]/70">
                Each summary runs a model over the full transcript. The provider charges for every request, so the allowance is a count per month. The writing help in the editor (improve, shorten, fix grammar) is not counted as a summary.
              </p>
            </div>
            <div className="sm:col-span-2">
              <p className="font-semibold">Agent runs</p>
              <p className="mt-2 text-[15px] leading-relaxed text-[#1b1017]/70">
                One run is one piece of agent work: following up on a meeting, reading a minute of requests in a watched channel, writing the morning standup or answering one @agent question. Each run calls an AI model, so the allowance is a count per month. Chat messages that don&apos;t look like requests are never sent to the model and don&apos;t count.
              </p>
            </div>
            <div className="sm:col-span-2 rounded-xl bg-white p-6 text-[15px] leading-relaxed text-[#1b1017]/75 ring-1 ring-[#381d2a]/10">
              <p className="font-semibold text-[#1b1017]">What this means in practice</p>
              <ul className="mt-3 list-disc space-y-1.5 pl-5">
                <li>Chat, tasks, notes, documents and databases are not metered by use. Only storage and the limits in the table apply.</li>
                <li>Counts reset each month and are per workspace, not per person, so adding teammates does not use them up faster.</li>
                <li>When you reach a cap, WebflowX tells you which one and what the next plan allows. Nothing is deleted and nothing is billed extra.</li>
                <li>Even Enterprise has a cap (200 meetings and 150 summaries a month). If you need more, email us and we will work out a limit that covers our provider costs.</li>
              </ul>
            </div>
          </div>
        </div>
      </details>
    </div>
  </section>
);

export default PricingSection;
