import React from "react";
import Link from "next/link";
import { ArrowRight, Check } from "lucide-react";
import { Reveal } from "./ui";
import { wrap } from "./tokens";

const points = ["Free plan, no card needed", "14-day trial of any paid plan", "AI agents included in every plan", "Cancel or export any time"];

// The last push before the footer: one clear ask.
export default function FinalCta() {
  return (
    <section className="w-full bg-[#f7f2ee] py-20 md:py-28">
      <div className={wrap}>
        <Reveal variant="scale">
          <div className="relative overflow-hidden rounded-[2rem] bg-[#ff5018] px-6 py-14 text-center text-white sm:px-12 md:py-20">
            <div aria-hidden="true" className="pointer-events-none absolute inset-0" style={{ background: "radial-gradient(ellipse 60% 70% at 50% 0%, rgba(255,255,255,0.22), rgba(255,255,255,0) 70%)" }} />
            <div aria-hidden="true" className="lp-glow mix-blend-soft-light" />
            <h2 className="lp-h relative mx-auto max-w-3xl text-[2.4rem] sm:text-5xl md:text-6xl">Stop chasing follow-ups. Let the agents do it.</h2>
            <p className="relative mx-auto mt-5 max-w-xl text-[17px] leading-relaxed text-white/85">
              Bring your team into one workspace today. Your next meeting can assign its own tasks.
            </p>
            <div className="relative mt-8 flex flex-wrap items-center justify-center gap-3">
              <Link href="/auth?mode=signup" className="inline-flex items-center gap-2 rounded-lg bg-[#22101a] px-7 py-4 text-[16px] font-semibold text-white transition-colors hover:bg-[#381d2a]">
                Start free <ArrowRight className="h-4 w-4" />
              </Link>
              <a href="#pricing" className="rounded-lg border border-white/40 px-7 py-4 text-[16px] font-semibold text-white transition-colors hover:bg-white/10">
                Compare plans
              </a>
            </div>
            <ul className="relative mx-auto mt-8 flex max-w-3xl flex-wrap justify-center gap-x-6 gap-y-2 text-sm text-white/90">
              {points.map((p) => (
                <li key={p} className="flex items-center gap-1.5"><Check className="h-4 w-4" aria-hidden="true" />{p}</li>
              ))}
            </ul>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
