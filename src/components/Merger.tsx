"use client";

import React, { useEffect, useRef } from "react";
import Image from "next/image";
import { MOTION_OK, whenGsap } from "./landing/gsap";
import { Heading, Label, Reveal } from "./landing/ui";
import { wrap } from "./landing/tokens";

const notes = [
  ["WebflowX", "The team workspace: chat, tasks, notes, documents, spreadsheets, meetings and AI summaries."],
  ["North Foundry", "The digital studio: web design, engineering and growth for businesses."],
  ["Together", "Product and studio under one team, working on a better workspace and the support around it."],
];

export function MergerSection() {
  const root = useRef<HTMLElement>(null);

  useEffect(() => {
    const el = root.current;
    if (!el) return;
    return whenGsap(({ gsap }) => {
    const mm = gsap.matchMedia();
    mm.add(MOTION_OK, () => {
      const q = gsap.utils.selector(el);
      gsap.set(q(".mg-a"), { xPercent: -60, opacity: 0 });
      gsap.set(q(".mg-b"), { xPercent: 60, opacity: 0 });
      gsap.set(q(".mg-x"), { scale: 0, opacity: 0 });
      gsap.set(q(".mg-line"), { scaleX: 0 });
      gsap.set(q(".mg-name"), { opacity: 0, y: 10 });
      const tl = gsap.timeline({
        scrollTrigger: { trigger: q(".mg-stage")[0], start: "top 80%", toggleActions: "play none none none" },
      });
      tl.to(q(".mg-a"), { xPercent: 0, opacity: 1, duration: 0.9, ease: "power3.out" }, 0)
        .to(q(".mg-b"), { xPercent: 0, opacity: 1, duration: 0.9, ease: "power3.out" }, 0)
        .to(q(".mg-line"), { scaleX: 1, duration: 0.6, ease: "none" }, 0.7)
        .to(q(".mg-x"), { scale: 1, opacity: 1, duration: 0.5, ease: "back.out(2)" }, 1.1)
        .to(q(".mg-name"), { opacity: 1, y: 0, duration: 0.5, stagger: 0.1 }, 1.2);
    });
    return () => mm.revert();
    }, el);
  }, []);

  return (
    <section ref={root} id="merger" className="w-full overflow-x-clip bg-[#381d2a] py-24 text-white md:py-32">
      <div className={wrap}>
        <Reveal>
          <Label dark>The merger</Label>
          <Heading dark className="mt-5 max-w-3xl">
            WebflowX is joining North Foundry.
          </Heading>
        </Reveal>

        <div className="mg-stage mt-16 flex items-center justify-center gap-0 py-6 md:py-12">
          <div className="mg-a flex flex-col items-center gap-4">
            <Image src="/logo.png" alt="WebflowX logo" width={140} height={140} className="h-24 w-24 rounded-2xl bg-[#2a1420] p-4 sm:h-36 sm:w-36 sm:p-6" />
            <p className="mg-name text-lg font-semibold">WebflowX</p>
          </div>
          <div className="relative mx-2 flex w-16 items-center justify-center sm:mx-6 sm:w-48">
            <span className="mg-line absolute left-0 right-0 top-[calc(50%-14px)] h-px origin-left bg-white/40" />
            <span className="mg-x relative top-[-14px] flex h-11 w-11 items-center justify-center rounded-full bg-[#ff5018] text-xl font-semibold">
              &times;
            </span>
          </div>
          <div className="mg-b flex flex-col items-center gap-4">
            <Image src="/northfoundry-logo.png" alt="North Foundry logo" width={140} height={140} className="h-24 w-24 rounded-2xl sm:h-36 sm:w-36" />
            <p className="mg-name text-lg font-semibold">North Foundry</p>
          </div>
        </div>

        <div className="mt-8 grid border-t border-white/15 md:grid-cols-3">
          {notes.map(([t, b], i) => (
            <Reveal key={t} delay={i * 80}>
              <div className="border-b border-white/15 py-8 md:border-b-0 md:pr-10">
                <p className="lp-label text-[#ff5018]">{t}</p>
                <p className="mt-3 max-w-xs text-[15px] leading-relaxed text-white/70">{b}</p>
              </div>
            </Reveal>
          ))}
        </div>
        <p className="mt-6 text-sm text-white/60">
          Questions about the merger? Write to{" "}
          <a href="mailto:hello@northfoundry.co" className="text-white underline underline-offset-4 hover:text-[#ff5018]">
            hello@northfoundry.co
          </a>
          .
        </p>
      </div>
    </section>
  );
}

export default MergerSection;
