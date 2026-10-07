"use client";

import React, { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, MousePointer2 } from "lucide-react";
import { gsap, MOTION_OK, prefersReducedMotion, ScrollTrigger } from "./landing/gsap";
import { AppFrame, ChatPane, DocPane, MeetingPane, ScaledFrame, TasksPane } from "./landing/mock";

const views = [
  { key: "Chat", rail: "Home" },
  { key: "Tasks", rail: "Tasks" },
  { key: "Docs", rail: "Docs" },
  { key: "Meetings", rail: "Meetings" },
] as const;

const Hero = () => {
  const root = useRef<HTMLElement>(null);
  const [active, setActive] = useState(0);
  const stRef = useRef<ScrollTrigger | null>(null);
  const showRef = useRef<(i: number) => void>(() => {});

  useEffect(() => {
    const el = root.current;
    if (!el) return;
    const q = gsap.utils.selector(el);
    const reduced = prefersReducedMotion();
    const refresh = () => ScrollTrigger.refresh();
    window.addEventListener("load", refresh);
    document.fonts?.ready.then(refresh);

    // crossfade between product views
    let current = 0;
    const layers = q(".hv");
    gsap.set(layers, { opacity: 0 });
    gsap.set(layers[0], { opacity: 1 });
    const show = (i: number) => {
      if (i === current) return;
      gsap.to(layers[current], { opacity: 0, duration: 0.5, overwrite: true });
      gsap.to(layers[i], { opacity: 1, duration: 0.5, overwrite: true });
      current = i;
      setActive(i);
    };
    showRef.current = show;

    const mm = gsap.matchMedia();
    mm.add(MOTION_OK, () => {
      // intro
      gsap.set(q(".h-line > span"), { yPercent: 115 });
      gsap.set(q(".h-fade"), { opacity: 0, y: 16 });
      gsap.set(q(".h-stage"), { opacity: 0, y: 90 });
      const desk = window.matchMedia("(min-width: 1024px) and (min-height: 640px)").matches;
      gsap.set(q(".h-frame"), { rotateX: desk ? 26 : 0, scale: desk ? 0.92 : 1, transformOrigin: "50% 0%" });
      const intro = gsap.timeline({ defaults: { ease: "power3.out" } });
      intro
        .to(q(".h-fade.h-pill"), { opacity: 1, y: 0, duration: 0.7 })
        .to(q(".h-line > span"), { yPercent: 0, duration: 1, stagger: 0.1 }, 0.1)
        .to(q(".h-fade:not(.h-pill)"), { opacity: 1, y: 0, duration: 0.7, stagger: 0.1 }, 0.7)
        .to(q(".h-stage"), { opacity: 1, y: 0, duration: 1.2 }, 0.5);

      // collaborator cursor drifting over the product
      if (!reduced) {
        gsap.set(q(".h-cursor"), { x: 380, y: 260 });
        gsap
          .timeline({ repeat: -1, delay: 2, defaults: { duration: 2.2, ease: "power2.inOut" } })
          .to(q(".h-cursor"), { x: 620, y: 190 })
          .to(q(".h-cursor"), { x: 860, y: 340 })
          .to(q(".h-cursor"), { x: 560, y: 470 })
          .to(q(".h-cursor"), { x: 380, y: 260 });
      }
    });

    // desktop: pinned, scroll-driven product tour
    mm.add("(min-width: 1024px) and (min-height: 640px)", () => {
      const head = q(".h-head")[0] as HTMLElement;
      const tl = gsap.timeline({
        defaults: { ease: "none" },
        scrollTrigger: {
          trigger: el,
          start: "top top",
          end: "+=2200",
          pin: true,
          pinSpacing: true,
          scrub: 0.6,
          anticipatePin: 1,
          invalidateOnRefresh: true,
          onUpdate: (self) => {
            const p = self.progress;
            const idx = p < 0.32 ? 0 : p < 0.55 ? 1 : p < 0.78 ? 2 : 3;
            show(idx);
          },
        },
      });
      stRef.current = tl.scrollTrigger ?? null;
      tl.to(q(".h-frame"), { rotateX: 0, scale: 1, duration: 0.3 }, 0)
        .to(q(".h-stage"), { y: () => -(head.offsetHeight * 0.92), duration: 0.3 }, 0)
        .to(head, { opacity: 0, y: -40, duration: 0.14 }, 0.0)
        .to({}, { duration: 0.7 });
      return () => {
        stRef.current = null;
      };
    });

    // smaller screens: simple auto-cycle
    let timer: number | undefined;
    mm.add("(max-width: 1023px), (max-height: 639px)", () => {
      if (reduced) return;
      let i = 0;
      timer = window.setInterval(() => {
        i = (i + 1) % views.length;
        show(i);
      }, 4200);
      return () => window.clearInterval(timer);
    });

    return () => {
      window.removeEventListener("load", refresh);
      mm.revert();
    };
  }, []);

  const goTo = (i: number) => {
    const st = stRef.current;
    if (st) {
      const marks = [0.12, 0.43, 0.67, 0.9];
      window.scrollTo({ top: st.start + marks[i] * (st.end - st.start), behavior: "smooth" });
    } else {
      showRef.current(i);
    }
  };

  return (
    <section
      ref={root}
      id="hero"
      className="relative w-full overflow-hidden bg-[#22101a] pb-16 text-white lg:h-[100svh] lg:pb-0"
      style={{ minHeight: "100svh" }}
    >
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 70% 55% at 50% -5%, rgba(255,80,24,0.22) 0%, rgba(255,80,24,0) 60%), radial-gradient(ellipse 80% 60% at 50% 110%, #4a2638 0%, rgba(34,16,26,0) 70%)",
        }}
      />

      <div className="relative mx-auto flex max-w-[1240px] flex-col items-center px-5 pt-28 sm:px-8 lg:pt-24">
        <div className="h-head flex flex-col items-center text-center">
          <a
            href="#merger"
            onClick={(e) => {
              e.preventDefault();
              document.querySelector("#merger")?.scrollIntoView({ behavior: "smooth" });
            }}
            className="h-fade h-pill group inline-flex items-center gap-2.5 rounded-full border border-white/15 bg-white/5 py-1.5 pl-2 pr-4 text-[13px] text-white/80 backdrop-blur transition-colors hover:bg-white/10"
          >
            <Image src="/northfoundry-logo.png" alt="" width={20} height={20} className="h-5 w-5 rounded" />
            WebflowX is joining North Foundry
            <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
          </a>

          <h1 className="lp-h mt-7 max-w-4xl text-[2.8rem] sm:text-6xl lg:text-[5rem]">
            <span className="h-line block overflow-hidden pb-1">
              <span className="block">Where teams talk,</span>
            </span>
            <span className="h-line block overflow-hidden pb-2">
              <span className="block">
                plan and <span className="text-[#ff5018]">ship.</span>
              </span>
            </span>
          </h1>

          <p className="h-fade mt-5 max-w-xl text-lg leading-relaxed text-white/65">
            Messaging, tasks, documents, meetings and AI summaries in one workspace. Built for teams
            that are done juggling tools.
          </p>

          <div className="h-fade mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/auth"
              className="inline-flex items-center gap-2 rounded-lg bg-[#ff5018] px-6 py-3.5 text-[15px] font-semibold text-white shadow-[0_8px_30px_-8px_rgba(255,80,24,0.7)] transition-colors hover:bg-[#ff6a3a]"
            >
              Start free <ArrowRight className="h-4 w-4" />
            </Link>
            <a
              href="#pricing"
              className="rounded-lg border border-white/20 px-6 py-3.5 text-[15px] font-semibold text-white transition-colors hover:bg-white/10"
            >
              See plans
            </a>
          </div>
          <p className="h-fade mt-5 text-sm text-white/45">Free plan available. Built by North Foundry.</p>
        </div>

        <div className="h-stage relative mt-10 w-full max-w-[1120px] lg:mt-12" style={{ perspective: 1800 }}>
          {/* view tabs */}
          <div className="mb-4 flex justify-center">
            <div className="inline-flex gap-1 rounded-lg border border-white/10 bg-white/5 p-1 backdrop-blur">
              {views.map((v, i) => (
                <button
                  key={v.key}
                  type="button"
                  onClick={() => goTo(i)}
                  className={`rounded-md px-4 py-1.5 text-[13px] font-medium transition-colors ${
                    active === i ? "bg-[#ff5018] text-white" : "text-white/65 hover:text-white"
                  }`}
                >
                  {v.key}
                </button>
              ))}
            </div>
          </div>

          <div
            className="h-frame relative rounded-2xl"
            style={{
              boxShadow:
                "0 0 0 1px rgba(255,255,255,0.12), 0 50px 140px -30px rgba(255,80,24,0.28), 0 30px 80px -20px rgba(0,0,0,0.6)",
            }}
          >
            <ScaledFrame w={1120} h={640} className="rounded-2xl">
              <div className="relative h-full w-full">
                <div className="hv absolute inset-0">
                  <AppFrame active="Home">
                    <ChatPane channel="general" />
                  </AppFrame>
                </div>
                <div className="hv absolute inset-0">
                  <AppFrame active="Tasks">
                    <TasksPane />
                  </AppFrame>
                </div>
                <div className="hv absolute inset-0">
                  <AppFrame active="Docs">
                    <DocPane />
                  </AppFrame>
                </div>
                <div className="hv absolute inset-0">
                  <AppFrame active="Meetings">
                    <MeetingPane />
                  </AppFrame>
                </div>
                <div className="h-cursor pointer-events-none absolute left-0 top-0 z-10">
                  <MousePointer2 className="h-6 w-6 fill-[#ff5018] text-[#ff5018]" />
                  <span className="ml-4 -mt-1 inline-block rounded-md rounded-tl-none bg-[#ff5018] px-2 py-1 text-xs font-semibold text-white">
                    Sofia
                  </span>
                </div>
              </div>
            </ScaledFrame>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;
