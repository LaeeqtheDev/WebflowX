"use client";

import React, { useState } from "react";
import Link from "next/link";
import { ArrowRight, Check, Download } from "lucide-react";
import { Heading, Label, Reveal } from "./ui";
import { wrap } from "./tokens";

// "The usual stack" next to WebflowX. Competitor prices are their public list prices per user per month on monthly
// billing, checked on 2 Nov 2026 (slack.com, notion.com, zoom.us, workspace.google.com/pricing). They change:
// re-check before editing, and keep the date below in step. Visitors can edit every price.
const CHECKED = "2 Nov 2026"
const TOOLS = [
  { key: "slack", name: "Slack", plan: "Pro", for: "Chat", price: 8.75 },
  { key: "notion", name: "Notion", plan: "Plus", for: "Docs, wikis and tasks", price: 10 },
  { key: "zoom", name: "Zoom", plan: "Workplace Pro", for: "Video meetings", price: 16.99 },
  { key: "google", name: "Google Workspace", plan: "Business Starter", for: "Google Docs and Sheets", price: 7 },
]

const PLANS = [
  { name: "Free", price: 0, members: 10 },
  { name: "Startup", price: 29, members: 25 },
  { name: "Growth", price: 79, members: 100 },
  { name: "Enterprise", price: 249, members: Infinity },
]

// what one WebflowX workspace includes (all of it ships today)
const INCLUDED = [
  "Channels, threads and direct messages",
  "Docs with live cursors, plus spreadsheets and databases",
  "Task boards with owners and due dates",
  "Video meetings with live transcripts and AI summaries",
  "AI agents: meeting follow-up, chat triage, daily standup, @agent",
  "Roles, locked channels and an audit log",
]

const money = (n: number) => `$${n.toLocaleString("en-US", { minimumFractionDigits: n % 1 ? 2 : 0, maximumFractionDigits: 2 })}`
const whole = (n: number) => `$${Math.round(n).toLocaleString("en-US")}`

export default function StackCompare() {
  const [people, setPeople] = useState(12)
  const [on, setOn] = useState<Record<string, boolean>>(() => Object.fromEntries(TOOLS.map((t) => [t.key, true])))
  const [prices, setPrices] = useState<Record<string, string>>(() => Object.fromEntries(TOOLS.map((t) => [t.key, String(t.price)])))

  const plan = PLANS.find((p) => p.members >= people) ?? PLANS[3]
  const chosen = TOOLS.filter((t) => on[t.key])
  const perSeat = chosen.reduce((sum, t) => sum + (parseFloat(prices[t.key]) || 0), 0)
  const stack = perSeat * people
  const saved = stack - plan.price

  return (
    <section id="compare" className="w-full bg-white py-24 md:py-32">
      <div className={wrap}>
        <Reveal variant="blur">
          <Label>WebflowX vs. the usual stack</Label>
          <Heading className="mt-5 max-w-4xl">Slack, Notion, Zoom and Google Docs. Or one workspace.</Heading>
          <p className="mt-5 max-w-2xl text-[17px] leading-relaxed text-[#1b1017]/70">
            Most teams pay four bills per person, then lose decisions between four apps. WebflowX puts chat, docs, tasks and
            meetings in one place, adds AI agents that do the follow-up, and charges one flat price for the whole workspace.
          </p>
        </Reveal>

        <div className="mt-14 grid gap-4 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]">
          {/* the stack */}
          <Reveal variant="left" className="h-full">
            <div className="h-full rounded-3xl border border-[#381d2a]/12 bg-[#f7f2ee] p-6 sm:p-8">
              <label htmlFor="stack-people" className="flex items-baseline justify-between text-sm text-[#1b1017]/70">
                <span>People on your team</span>
                <span className="lp-h text-5xl text-[#1b1017] tabular-nums">{people}</span>
              </label>
              <input id="stack-people" type="range" min={1} max={150} value={people} onChange={(e) => setPeople(Number(e.target.value))}
                className="lp-range mt-5 w-full" style={{ "--fill": `${((people - 1) / 149) * 100}%` } as React.CSSProperties} />
              <div className="mt-2 flex justify-between text-[11px] font-medium text-[#1b1017]/60"><span>1</span><span>50</span><span>100</span><span>150</span></div>

              <p className="mt-7 text-xs font-semibold uppercase tracking-wide text-[#1b1017]/55">What you pay today (untick what you don&apos;t use, edit any price)</p>
              <ul className="mt-3 divide-y divide-[#381d2a]/10 rounded-2xl border border-[#381d2a]/10 bg-white">
                {TOOLS.map((t) => (
                  <li key={t.key} className={`flex items-center gap-3 px-4 py-3 ${on[t.key] ? "" : "opacity-50"}`}>
                    <input type="checkbox" checked={on[t.key]} onChange={(e) => setOn((s) => ({ ...s, [t.key]: e.target.checked }))}
                      aria-label={`Include ${t.name}`} className="h-4 w-4 shrink-0 accent-[#ff5018]" />
                    <span className="min-w-0 flex-1">
                      <span className="block text-[15px] font-semibold text-[#1b1017]">{t.name} <span className="font-normal text-[#1b1017]/55">{t.plan}</span></span>
                      <span className="block text-[13px] text-[#1b1017]/60">{t.for}</span>
                    </span>
                    <span className="flex items-center rounded-lg border border-[#381d2a]/15 bg-white px-2 text-sm focus-within:border-[#ff5018]">
                      <span className="text-[#1b1017]/50">$</span>
                      <input inputMode="decimal" value={prices[t.key]} disabled={!on[t.key]} aria-label={`${t.name} price per person per month`}
                        onChange={(e) => setPrices((s) => ({ ...s, [t.key]: e.target.value.replace(/[^\d.]/g, "").slice(0, 6) }))}
                        className="h-9 w-14 bg-transparent px-1 text-right tabular-nums text-[#1b1017] outline-none" />
                    </span>
                    <span className="hidden w-24 text-right text-[13px] tabular-nums text-[#1b1017]/60 sm:block">
                      {on[t.key] ? `${whole((parseFloat(prices[t.key]) || 0) * people)}/mo` : "—"}
                    </span>
                  </li>
                ))}
              </ul>

              {stack > 0 && (
                <div className="mt-6" aria-hidden="true">
                  <div className="flex h-3 overflow-hidden rounded-full bg-[#381d2a]/10">
                    {chosen.map((t, i) => (
                      <span key={t.key} className="h-full transition-[width] duration-500 ease-out" style={{ width: `${((parseFloat(prices[t.key]) || 0) * people / stack) * 100}%`, background: ["#381d2a", "#7c3aed", "#ff5018", "#ff8a63"][i % 4] }} />
                    ))}
                  </div>
                  <div className="mt-2.5 flex flex-wrap gap-x-4 gap-y-1 text-[12px] text-[#1b1017]/65">
                    {chosen.map((t, i) => (
                      <span key={t.key} className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full" style={{ background: ["#381d2a", "#7c3aed", "#ff5018", "#ff8a63"][i % 4] }} />{t.name}</span>
                    ))}
                  </div>
                </div>
              )}

              <div className="mt-6 flex items-baseline justify-between border-t border-[#381d2a]/15 pt-5">
                <span className="text-[15px] font-semibold text-[#1b1017]">{chosen.length} apps for {people} {people === 1 ? "person" : "people"}</span>
                <span className="text-right">
                  <span className="block text-3xl font-semibold tracking-tight text-[#1b1017] tabular-nums">{whole(stack)}<span className="ml-1 text-base font-medium tracking-normal text-[#1b1017]/60">/month</span></span>
                  <span className="text-[13px] text-[#1b1017]/55">{money(perSeat)} per person</span>
                </span>
              </div>
            </div>
          </Reveal>

          {/* WebflowX */}
          <Reveal delay={150} variant="scale" className="h-full">
            <div className="relative flex h-full flex-col overflow-hidden rounded-3xl bg-[#381d2a] p-6 text-white sm:p-8" style={{ backgroundImage: "radial-gradient(120% 70% at 100% 0%, rgba(255,80,24,0.22), transparent 60%), radial-gradient(90% 60% at 0% 100%, rgba(124,58,237,0.22), transparent 60%)" }}>
              <div className="relative flex h-full flex-col">
              <p className="text-xs font-semibold uppercase tracking-wide text-white/55">WebflowX {plan.name}</p>
              <p className="mt-2 flex items-baseline gap-2"><span className="text-5xl font-semibold tracking-tight tabular-nums">{plan.price === 0 ? "$0" : whole(plan.price)}</span><span className="text-base font-medium text-white/65">a month, whole team</span></p>
              <p className="mt-1 text-sm text-white/65">
                {plan.price === 0 ? "Free for up to 10 people." : `${money(plan.price / people)} per person, for the whole workspace.`}
              </p>

              {saved > 0 && (
                <div className="mt-6 rounded-2xl bg-[#ff5018] p-5" aria-live="polite">
                  <p className="text-sm text-white/85">You&apos;d keep</p>
                  <p className="flex items-baseline gap-2"><span className="text-4xl font-semibold tracking-tight tabular-nums">{whole(saved * 12)}</span><span className="text-base font-medium text-white/90">a year</span></p>
                  <p className="mt-1 text-sm text-white/85">{whole(saved)} less every month, with AI agents included.</p>
                </div>
              )}

              <ul className="mt-6 space-y-2.5">
                {INCLUDED.map((x) => (
                  <li key={x} className="flex items-start gap-2.5 text-[15px] leading-snug text-white/85">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-[#ff5018]" aria-hidden="true" />{x}
                  </li>
                ))}
              </ul>

              <p className="mt-6 flex items-start gap-2.5 rounded-xl bg-white/5 px-4 py-3 text-sm leading-relaxed text-white/75">
                <Download className="mt-0.5 h-4 w-4 shrink-0 text-[#ff5018]" aria-hidden="true" />
                Moving over? Bring your channels from a Slack export and your pages from a Notion export.
              </p>

              <div className="mt-auto pt-7">
                <Link href="/auth?mode=signup" className="inline-flex items-center gap-2 rounded-lg bg-[#ff5018] px-6 py-3.5 text-[15px] font-semibold text-white transition-colors hover:bg-[#ff6a3a]">
                  Start free <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
              </div>
            </div>
          </Reveal>
        </div>

        <p className="mt-6 max-w-4xl text-[13px] leading-relaxed text-[#1b1017]/55">
          Other tools&apos; prices are their public list prices per user per month on monthly billing, checked {CHECKED}. Yearly billing and
          promotions can be cheaper, and Zoom charges per meeting host, so edit the numbers to match what you pay. Slack, Notion, Zoom and
          Google Workspace are trademarks of their owners; WebflowX isn&apos;t affiliated with them.
        </p>
      </div>
    </section>
  )
}
