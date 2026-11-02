import React from "react";
import Link from "next/link";
import { ArrowRight, Download, Sparkles, UserPlus } from "lucide-react";
import { Heading, Label, Reveal } from "./ui";
import { wrap } from "./tokens";

// Three steps from sign-up to agents doing work. Each step is something the product does today.
const steps = [
  { icon: UserPlus, n: "01", t: "Create a workspace", b: "Sign up with email, Google or GitHub. Free for up to 10 people, no card needed." },
  { icon: Download, n: "02", t: "Bring the team and your history", b: "Invite people with a link. Owners can import channels from a Slack export and pages from a Notion export." },
  { icon: Sparkles, n: "03", t: "Switch on the agents", b: "Pick which agents run and where. Your next meeting assigns its own tasks, and tomorrow's standup writes itself." },
];

export default function HowItWorks() {
  return (
    <section id="how" className="w-full bg-[#f7f2ee] py-24 md:py-32">
      <div className={wrap}>
        <Reveal variant="blur">
          <Label>How it works</Label>
          <Heading className="mt-5 max-w-3xl">Running by this afternoon.</Heading>
        </Reveal>
        <ol className="mt-14 grid gap-4 md:grid-cols-3">
          {steps.map(({ icon: Icon, n, t, b }, i) => (
            <Reveal key={n} delay={i * 140} variant="scale" className="h-full">
              <li className="lp-lift relative h-full rounded-3xl border border-[#381d2a]/12 bg-white p-7">
                {/* arrow to the next step on wide screens */}
                {i < steps.length - 1 && (
                  <span aria-hidden="true" className="absolute -right-[13px] top-1/2 z-10 hidden h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full border border-[#381d2a]/12 bg-[#f7f2ee] text-[#ff5018] md:flex">
                    <ArrowRight className="h-3.5 w-3.5" />
                  </span>
                )}
                <div className="flex items-center justify-between">
                  <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#ff5018]/10 text-[#ff5018]"><Icon className="h-5 w-5" aria-hidden="true" /></span>
                  <span className="lp-h text-3xl text-[#381d2a]/25">{n}</span>
                </div>
                <h3 className="lp-h mt-6 text-2xl text-[#1b1017]">{t}</h3>
                <p className="mt-2 text-[15px] leading-relaxed text-[#1b1017]/70">{b}</p>
              </li>
            </Reveal>
          ))}
        </ol>
        <Reveal>
          <Link href="/auth?mode=signup" className="mt-10 inline-flex items-center gap-2 rounded-lg bg-[#ff5018] px-6 py-3.5 text-[15px] font-semibold text-white transition-colors hover:bg-[#e6430f]">
            Create your workspace <ArrowRight className="h-4 w-4" />
          </Link>
        </Reveal>
      </div>
    </section>
  );
}
