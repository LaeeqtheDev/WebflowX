"use client";

import React, { useEffect, useRef } from "react";
import { gsap, MOTION_OK, ScrollTrigger } from "./landing/gsap";
import { Heading, Label, Reveal } from "./landing/ui";
import { AppFrame, ScaledFrame, TasksPane } from "./landing/mock";
import { wrap } from "./landing/tokens";

const INK = "#381d2a";

function Sketch() {
  return (
    <svg viewBox="0 0 520 340" className="w-full" fill="none" stroke={INK} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <rect className="draw" x="16" y="16" width="488" height="308" rx="14" strokeDasharray="6 6" />
      <path className="draw" d="M150 16V324" strokeDasharray="6 6" />
      <path className="draw" d="M16 60H504" strokeDasharray="6 6" />
      {[90, 120, 150, 180].map((y) => (
        <path key={y} className="draw" d={`M34 ${y}H128`} />
      ))}
      {[100, 150, 200].map((y, i) => (
        <g key={y}>
          <circle className="draw" cx="178" cy={y} r="11" />
          <path className="draw" d={`M204 ${y - 4}H${330 + i * 40}M204 ${y + 8}H${290 + i * 30}`} />
        </g>
      ))}
      <rect className="draw" x="170" y="262" width="320" height="38" rx="8" />
      <text className="fade" x="318" y="56" fill={INK} stroke="none" fontSize="18" fontFamily="ui-monospace, monospace" transform="rotate(-3 318 56)">
        chat + tasks?
      </text>
      <path className="draw" stroke="#ff5018" d="M260 44C280 30 300 30 316 38" />
    </svg>
  );
}

function Architecture() {
  const node = (x: number, y: number, label: string) => (
    <g>
      <rect className="draw" x={x} y={y} width="120" height="56" rx="10" />
      <text className="fade" x={x + 60} y={y + 33} textAnchor="middle" fill={INK} stroke="none" fontSize="18" fontWeight="600" fontFamily="var(--font-geist-sans), sans-serif">
        {label}
      </text>
    </g>
  );
  return (
    <svg viewBox="0 0 520 340" className="w-full" fill="none" stroke={INK} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      {node(24, 142, "Client")}
      {node(200, 40, "Socket.IO")}
      {node(200, 244, "Server")}
      {node(376, 142, "Database")}
      <path className="draw" d="M144 160L200 78" />
      <path className="draw" d="M260 96V244" />
      <path className="draw" d="M320 272L376 190" />
      <path className="draw" d="M144 190L200 262" />
      <path className="draw" stroke="#ff5018" strokeDasharray="5 6" d="M60 142C60 90 120 30 200 30" />
      <text className="fade" x="24" y="228" fill="#ff5018" stroke="none" fontSize="15" fontFamily="ui-monospace, monospace">
        WebRTC (failed)
      </text>
      <path className="draw" stroke="#ff5018" d="M118 112l14 14M132 112l-14 14" />
    </svg>
  );
}

function Stable() {
  return (
    <div className="w-full">
      <ScaledFrame w={1120} h={640}>
        <AppFrame active="Tasks">
          <TasksPane />
        </AppFrame>
      </ScaledFrame>
    </div>
  );
}

function Scale() {
  const box = (x: number, y: number, w: number, label: string) => (
    <g>
      <rect className="draw" x={x} y={y} width={w} height="50" rx="10" />
      <text className="fade" x={x + w / 2} y={y + 31} textAnchor="middle" fill={INK} stroke="none" fontSize="17" fontWeight="600" fontFamily="var(--font-geist-sans), sans-serif">
        {label}
      </text>
    </g>
  );
  return (
    <svg viewBox="0 0 520 340" className="w-full" fill="none" stroke={INK} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      {box(20, 145, 110, "Teams")}
      {box(200, 40, 120, "Server A")}
      {box(200, 145, 120, "Server B")}
      {box(200, 254, 120, "Server C")}
      {box(390, 145, 110, "Database")}
      <path className="draw" d="M130 170L200 65M130 170H200M130 170L200 279" />
      <path className="draw" d="M320 65L390 170M320 170H390M320 279L390 170" />
      <path className="draw" stroke="#ff5018" d="M445 232l22 8v16c0 13-9 22-22 28-13-6-22-15-22-28v-16z" />
      <path className="draw" stroke="#ff5018" d="M436 258l7 7 13-14" />
      <text className="fade" x="445" y="314" textAnchor="middle" fill="#ff5018" stroke="none" fontSize="16" fontFamily="ui-monospace, monospace">secured</text>
    </svg>
  );
}

function Together() {
  return (
    <svg viewBox="0 0 520 340" className="w-full" fill="none" stroke={INK} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <defs>
        <clipPath id="tg-a"><rect x="30" y="80" width="150" height="150" rx="30" /></clipPath>
        <clipPath id="tg-b"><rect x="340" y="80" width="150" height="150" rx="30" /></clipPath>
      </defs>
      <rect x="30" y="80" width="150" height="150" rx="30" fill="#fff" stroke="none" />
      <image href="/logo.png" x="55" y="105" width="100" height="100" preserveAspectRatio="xMidYMid meet" clipPath="url(#tg-a)" />
      <rect className="draw" x="30" y="80" width="150" height="150" rx="30" />
      <rect x="340" y="80" width="150" height="150" rx="30" fill="#fff" stroke="none" />
      <image href="/northfoundry-logo.png" x="340" y="80" width="150" height="150" preserveAspectRatio="xMidYMid slice" clipPath="url(#tg-b)" />
      <rect className="draw" x="340" y="80" width="150" height="150" rx="30" />
      <path className="draw" stroke="#ff5018" d="M180 155H340" />
      <circle cx="260" cy="155" r="26" fill="#fbf9f7" stroke="#ff5018" />
      <path className="draw" stroke="#ff5018" d="M249 144l22 22M271 144l-22 22" />
      <text className="fade" x="105" y="272" textAnchor="middle" fill={INK} stroke="none" fontSize="20" fontWeight="600" fontFamily="var(--font-geist-sans), sans-serif">WebflowX</text>
      <text className="fade" x="415" y="272" textAnchor="middle" fill={INK} stroke="none" fontSize="20" fontWeight="600" fontFamily="var(--font-geist-sans), sans-serif">North Foundry</text>
    </svg>
  );
}

const steps = [
  {
    when: "Mid 2024",
    title: "Idea, doubt, and first prototype",
    body: "WebflowX began as an attempt to unify chat, tasks, and collaboration into one focused workspace. The first versions were rough, slow, and frequently rewritten, but they validated the core idea.",
    points: ["Basic routing and authentication", "Unstable UI experiments", "Multiple folder structure rewrites"],
    focus: "Prove the core idea",
    outcome: "A prototype that validated one workspace for chat and tasks.",
    visual: <Sketch />,
  },
  {
    when: "Late 2024",
    title: "Core architecture and painful refactors",
    body: "As complexity increased, the focus shifted to architecture. Several early decisions were rolled back to improve scalability, real-time sync, and maintainability.",
    points: ["Socket.IO integration for live updates", "Early WebRTC experiments (many failed)", "Reworked data models and permissions"],
    focus: "Scalability and real-time sync",
    outcome: "Early decisions rolled back; data models and permissions reworked.",
    visual: <Architecture />,
  },
  {
    when: "Early 2025",
    title: "Stabilization and feature lock",
    body: "Feature development slowed intentionally. The focus moved to stability, performance, and a consistent experience across the platform.",
    points: ["Task system finalized", "Chat and video call flow stabilized", "AI summaries integrated cautiously"],
    focus: "Stability and performance",
    outcome: "Task system finalized; chat and video calls stabilized.",
    visual: <Stable />,
  },
  {
    when: "Mid 2025 to Jun 2026",
    title: "Scale and security",
    body: "With the product stable, the focus moved to growth. The backend was deployed on AWS to handle growth reliably, and security was strengthened across the platform.",
    points: ["Deployed the backend on AWS for scalability", "Enhanced security across the platform"],
    focus: "Scalability and security",
    outcome: "Backend deployed on AWS and security strengthened across the platform.",
    visual: <Scale />,
  },
  {
    when: "Today",
    title: "Four plans, and joining North Foundry",
    body: "WebflowX now runs on four plans with clear limits, from a free plan for small teams to generous limits for large ones. Next, the product joins North Foundry to grow with a studio behind it.",
    points: ["Free, Startup, Growth and Enterprise plans", "Workspaces, channels, tasks, notes, documents, spreadsheets, meetings", "AI summaries and an AI assistant built in"],
    focus: "Growing the product",
    outcome: "One team behind the workspace and the studio around it.",
    visual: <Together />,
  },
];

export function WebflowXTimeline() {
  const root = useRef<HTMLElement>(null);

  useEffect(() => {
    const el = root.current;
    if (!el) return;
    const mm = gsap.matchMedia();
    mm.add(MOTION_OK, () => {
      const q = gsap.utils.selector(el);

      // progress line that draws as you scroll
      gsap.fromTo(
        q(".tl-fill"),
        { scaleY: 0 },
        {
          scaleY: 1,
          ease: "none",
          scrollTrigger: { trigger: q(".tl-body")[0], start: "top 60%", end: "bottom 70%", scrub: 0.6 },
        }
      );

      q(".tl-step").forEach((step) => {
        const s = gsap.utils.selector(step);
        // node + year light up
        gsap.timeline({
          scrollTrigger: { trigger: step, start: "top 62%", toggleActions: "play none none reverse" },
        })
          .to(s(".tl-node"), { backgroundColor: "#ff5018", borderColor: "#ff5018", scale: 1.25, duration: 0.3 }, 0)
          .to(s(".tl-year"), { color: "#1b1017", duration: 0.3 }, 0);

        gsap.from(s(".tl-copy > *"), {
          y: 24,
          opacity: 0,
          stagger: 0.08,
          duration: 0.8,
          ease: "power3.out",
          scrollTrigger: { trigger: step, start: "top 72%", once: true },
        });

        // vector illustration draws itself while scrolling
        const paths = s(".draw") as unknown as SVGGeometryElement[];
        const solid = paths.filter((p) => !p.getAttribute("stroke-dasharray"));
        solid.forEach((p) => {
          const len = p.getTotalLength();
          gsap.set(p, { strokeDasharray: len, strokeDashoffset: len });
        });
        const dashed = paths.filter((p) => p.getAttribute("stroke-dasharray"));
        gsap.set(dashed, { opacity: 0 });
        gsap.set(s(".fade"), { opacity: 0 });

        const vt = gsap.timeline({
          scrollTrigger: { trigger: s(".tl-visual")[0], start: "top 82%", toggleActions: "play none none none" },
        });
        vt.to(solid, { strokeDashoffset: 0, duration: 1.2, stagger: 0.08, ease: "power1.inOut" }, 0)
          .to(dashed, { opacity: 1, duration: 0.5, stagger: 0.08 }, 0.3)
          .to(s(".fade"), { opacity: 1, duration: 0.6 }, 1.0);
        if (!paths.length) {
          gsap.from(s(".tl-visual"), {
            y: 40,
            opacity: 0,
            duration: 0.9,
            ease: "power3.out",
            scrollTrigger: { trigger: step, start: "top 70%", once: true },
          });
        }
      });
      ScrollTrigger.refresh();
    });
    return () => mm.revert();
  }, []);

  return (
    <section ref={root} id="timeline" className="w-full bg-[#efe8e3] py-24 md:py-32">
      <div className={wrap}>
        <Reveal>
          <Label>Our journey</Label>
          <Heading className="mt-5 max-w-3xl">How WebflowX was built.</Heading>
          <p className="mt-5 max-w-lg text-[17px] leading-relaxed text-[#1b1017]/70">
            We&apos;ve been working on WebflowX for the past two years. Here&apos;s the timeline of how it got here.
          </p>
        </Reveal>

        <div className="tl-body relative mt-16 md:mt-24">
          <div className="absolute bottom-0 left-[11px] top-0 w-px bg-[#381d2a]/15 md:left-[11px]">
            <div className="tl-fill absolute inset-0 origin-top bg-[#ff5018]" />
          </div>
          {steps.map((s, idx) => (
            <div key={s.when} className="tl-step relative grid grid-cols-[minmax(0,1fr)] gap-8 pb-20 pl-12 last:pb-0 md:grid-cols-[220px_minmax(0,1fr)] md:gap-12 md:pb-32 lg:grid-cols-[260px_minmax(0,1fr)]">
              <span className="tl-node absolute left-0 top-2 h-6 w-6 rounded-full border-2 border-[#381d2a]/25 bg-[#efe8e3]" />
              <div>
                <p className="lp-label mb-2 text-[#381d2a]/65">0{idx + 1} / 0{steps.length}</p>
                <p className="tl-year lp-h sticky top-28 text-3xl text-[#381d2a]/35 md:text-4xl lg:text-5xl">{s.when}</p>
              </div>
              <div className="grid grid-cols-[minmax(0,1fr)] gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
                <div className="tl-copy">
                  <h3 className="lp-h text-2xl text-[#1b1017] sm:text-3xl">{s.title}</h3>
                  <p className="mt-4 text-[15px] leading-relaxed text-[#1b1017]/70">{s.body}</p>
                  <ul className="mt-6 space-y-3">
                    {s.points.map((p) => (
                      <li key={p} className="flex items-start gap-3 text-[15px] text-[#1b1017]">
                        <span className="mt-2.5 h-px w-4 shrink-0 bg-[#ff5018]" />
                        {p}
                      </li>
                    ))}
                  </ul>
                  <dl className="mt-7 grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-[#381d2a]/15 bg-[#381d2a]/15 text-sm">
                    <div className="bg-[#f7f2ee] p-4">
                      <dt className="lp-label text-[#c2370d]">Focus</dt>
                      <dd className="mt-2 leading-snug text-[#1b1017]">{s.focus}</dd>
                    </div>
                    <div className="bg-[#f7f2ee] p-4">
                      <dt className="lp-label text-[#c2370d]">Outcome</dt>
                      <dd className="mt-2 leading-snug text-[#1b1017]">{s.outcome}</dd>
                    </div>
                  </dl>
                </div>
                <div className="tl-visual self-start rounded-xl bg-[#f7f2ee] p-5">{s.visual}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export default WebflowXTimeline;
