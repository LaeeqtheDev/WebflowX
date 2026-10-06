"use client";

import React, { useEffect, useRef } from "react";
import { FolderOpen, Layers, MessageSquare, NotebookPen } from "lucide-react";
import { gsap, MOTION_OK } from "./landing/gsap";
import { Heading, Label, Reveal } from "./landing/ui";
import { ChatPane, DocPane, MeetingPane, PaneFrame, ScaledFrame, TasksPane } from "./landing/mock";
import { wrap } from "./landing/tokens";

type Tone = "white" | "plum" | "orange";

const tones: Record<Tone, { box: string; title: string; body: string }> = {
  white: { box: "bg-white border border-[#381d2a]/10", title: "text-[#1b1017]", body: "text-[#1b1017]/65" },
  plum: { box: "bg-[#381d2a]", title: "text-white", body: "text-white/65" },
  orange: { box: "bg-[#ff5018]", title: "text-white", body: "text-white/85" },
};

function Cell({
  tone,
  title,
  body,
  className = "",
  visualH,
  children,
}: {
  tone: Tone;
  title: string;
  body: string;
  className?: string;
  visualH?: string;
  children?: React.ReactNode;
}) {
  const t = tones[tone];
  return (
    <div className={`bento-cell flex flex-col overflow-hidden rounded-3xl p-7 ${t.box} ${className}`}>
      <h3 className={`lp-h text-2xl ${t.title}`}>{title}</h3>
      <p className={`mt-2 max-w-sm text-[15px] leading-relaxed ${t.body}`}>{body}</p>
      {children && (
        <div className={`-mx-7 -mb-7 mt-7 overflow-hidden px-7 ${visualH ?? "h-[260px]"}`}>{children}</div>
      )}
    </div>
  );
}

function AssistantVisual() {
  return (
    <div className="m-card space-y-3 pt-1">
      <div className="ml-auto w-fit max-w-[85%] rounded-2xl rounded-br-sm bg-[#381d2a] px-4 py-2.5 text-[13px] text-white">
        Summarize this week&apos;s customer feedback.
      </div>
      <div className="m-card w-fit max-w-[92%] rounded-2xl rounded-bl-sm bg-white px-4 py-3 text-[13px] leading-snug text-[#1b1017]">
        Three themes this week:
        <ul className="mt-1.5 space-y-1 text-[#1b1017]/75">
          <li>1. Simpler onboarding</li>
          <li>2. Faster file uploads</li>
          <li>3. Calendar integration</li>
        </ul>
      </div>
    </div>
  );
}

const small = [
  { icon: Layers, t: "Workspaces", b: "Separate spaces for each team or project." },
  { icon: MessageSquare, t: "Direct messages", b: "Private one-to-one conversations." },
  { icon: NotebookPen, t: "Notes", b: "Personal and workspace notes." },
  { icon: FolderOpen, t: "File sharing", b: "Share files with your team." },
];

const NewFeatures = () => {
  const root = useRef<HTMLElement>(null);

  useEffect(() => {
    const el = root.current;
    if (!el) return;
    const mm = gsap.matchMedia();
    mm.add(MOTION_OK, () => {
      const q = gsap.utils.selector(el);
      q(".bento-cell").forEach((cell) => {
        const s = gsap.utils.selector(cell);
        const items = s(".m-card, .m-line, .m-msg");
        gsap.set(items, { opacity: 0, y: 12 });
        gsap.fromTo(
          cell,
          { y: 40, opacity: 0 },
          {
            y: 0,
            opacity: 1,
            duration: 0.8,
            ease: "power3.out",
            scrollTrigger: {
              trigger: cell,
              start: "top 88%",
              once: true,
              onEnter: () =>
                gsap.to(items, { opacity: 1, y: 0, duration: 0.5, stagger: 0.08, delay: 0.3, ease: "power2.out" }),
            },
          }
        );
      });
    });
    return () => mm.revert();
  }, []);

  return (
    <section ref={root} id="features" className="w-full bg-[#efe8e3] py-24 md:py-32">
      <div className={wrap}>
        <Reveal>
          <Label>Product</Label>
          <Heading className="mt-5 max-w-3xl">Everything your team works in, in one app.</Heading>
        </Reveal>

        <div className="mt-14 grid gap-4 lg:grid-cols-6">
          <Cell
            tone="white"
            className="lg:col-span-3"
            title="Channels and threads"
            body="Talk to the whole team in channels, keep replies in threads, and share files and documents right in the conversation."
            visualH="h-[300px]"
          >
            <ScaledFrame w={680} h={440}>
              <PaneFrame>
                <ChatPane channel="product-launch" />
              </PaneFrame>
            </ScaledFrame>
          </Cell>
          <Cell
            tone="white"
            className="lg:col-span-3"
            title="Tasks next to the conversation"
            body="Create, assign and track tasks without leaving the workspace. Everyone sees what is waiting, in progress and done."
            visualH="h-[300px]"
          >
            <ScaledFrame w={680} h={440}>
              <PaneFrame>
                <TasksPane />
              </PaneFrame>
            </ScaledFrame>
          </Cell>

          <Cell
            tone="white"
            className="lg:col-span-2"
            title="Documents"
            body="Write and edit together in a rich text editor."
            visualH="h-[220px]"
          >
            <ScaledFrame w={680} h={440}>
              <PaneFrame>
                <DocPane />
              </PaneFrame>
            </ScaledFrame>
          </Cell>
          <Cell
            tone="plum"
            className="lg:col-span-2"
            title="Meetings with AI summaries"
            body="Start a video call from any channel and get key points and action items afterwards."
            visualH="h-[220px]"
          >
            <ScaledFrame w={680} h={440}>
              <PaneFrame>
                <MeetingPane />
              </PaneFrame>
            </ScaledFrame>
          </Cell>
          <Cell
            tone="orange"
            className="lg:col-span-2"
            title="AI assistant"
            body="Draft, brainstorm and summarize without leaving your workspace."
            visualH="h-[220px]"
          >
            <AssistantVisual />
          </Cell>
        </div>

        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {small.map(({ icon: Icon, t, b }) => (
            <Reveal key={t}>
              <div className="h-full rounded-3xl border border-[#381d2a]/10 bg-[#f7f2ee] p-7">
                <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#381d2a] text-[#ff5018]">
                  <Icon className="h-5 w-5" />
                </span>
                <p className="mt-6 text-lg font-semibold tracking-tight text-[#1b1017]">{t}</p>
                <p className="mt-1.5 text-sm text-[#1b1017]/65">{b}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
};

export default NewFeatures;
