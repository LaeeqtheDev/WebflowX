"use client";

import React, { useEffect, useRef } from "react";
import { BellRing, CalendarDays, FileText, MessagesSquare, Search, ShieldCheck, UserRoundPlus, Webhook } from "lucide-react";
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
        Make this announcement shorter and friendlier.
      </div>
      <div className="m-card w-fit max-w-[92%] rounded-2xl rounded-bl-sm bg-white px-4 py-3 text-[13px] leading-snug text-[#1b1017]">
        Suggested rewrite:
        <p className="mt-1.5 text-[#1b1017]/75">Hi team, the new onboarding doc is live. Have a look and tell us what is missing.</p>
      </div>
    </div>
  );
}

const small = [
  { icon: MessagesSquare, t: "Conversations", b: "Everything around a message, handled.", items: ["Workspaces and direct messages", "Threads, reactions, rich text", "Mentions, pins, saved messages"] },
  { icon: Search, t: "Find anything", b: "Nothing gets lost in the scroll.", items: ["Message search", "Ctrl/Cmd+K quick switcher", "One Files page with previews"] },
  { icon: FileText, t: "Docs and notes", b: "Write together, keep your own.", items: ["Real-time documents", "Shared spreadsheets", "Personal and workspace notes"] },
  { icon: CalendarDays, t: "Calendar", b: "Deadlines where you already look.", items: ["Task due dates on a calendar", "Google, Apple, Outlook feed", "Reminders before a deadline"] },
  { icon: BellRing, t: "Notifications", b: "Told once, only when it matters.", items: ["Email, only if still unread", "Push on phone and desktop", "Per-member switches"] },
  { icon: UserRoundPlus, t: "Guests and access", b: "Clients see only what you share.", items: ["Guests in chosen channels", "Roles and permissions", "Storage caps by plan"] },
  { icon: ShieldCheck, t: "Security", b: "Built in, not bolted on.", items: ["Two-step verification", "Required for everyone on higher plans", "Audit log"] },
  { icon: Webhook, t: "Developers", b: "Connect the tools you already use.", items: ["REST API and API keys", "Incoming and signed outgoing webhooks", "GitHub, Zapier and Make"] },
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
          <p className="mt-5 max-w-xl text-[17px] leading-relaxed text-[#1b1017]/70">
            Chat, tasks, notes, documents, spreadsheets and meetings share one workspace, one search and one set of permissions.
          </p>
        </Reveal>

        <div className="mt-14 grid gap-4 lg:grid-cols-6">
          <Cell
            tone="white"
            className="lg:col-span-3"
            title="Channels and threads"
            body="Talk to the whole team in channels and direct messages, keep replies in threads, react, @mention people and share files right in the conversation."
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
            body="A tasks board with sprints, priorities, assignees and comments, right next to the conversation. Everyone sees what is waiting, in progress and done."
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
            title="Documents and spreadsheets"
            body="Write and edit together in real time. Documents and spreadsheets are powered by Liveblocks."
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
            body="Start a video meeting, get a live transcript of what you say, then an AI summary with action items and decisions."
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
            title="AI writing help"
            body="Get writing help in the editor to draft, rewrite and tidy text without leaving the page."
            visualH="h-[220px]"
          >
            <AssistantVisual />
          </Cell>
        </div>

        <h3 className="lp-h mt-16 text-3xl text-[#1b1017] sm:text-4xl">Everything in the box.</h3>
        <p className="mt-3 max-w-xl text-[15px] leading-relaxed text-[#1b1017]/70">
          The details that make a workspace pleasant to live in every day.
        </p>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {small.map(({ icon: Icon, t, b, items }) => (
            <Reveal key={t}>
              <div className="h-full rounded-3xl border border-[#381d2a]/10 bg-[#f7f2ee] p-6">
                <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#381d2a] text-[#ff5018]">
                  <Icon className="h-5 w-5" aria-hidden="true" />
                </span>
                <h4 className="mt-5 text-lg font-semibold tracking-tight text-[#1b1017]">{t}</h4>
                <p className="mt-1 text-sm text-[#1b1017]/60">{b}</p>
                <ul className="mt-4 space-y-1.5">
                  {items.map((i) => (
                    <li key={i} className="flex items-start gap-2 text-sm leading-snug text-[#1b1017]/80">
                      <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#ff5018]" aria-hidden="true" />
                      {i}
                    </li>
                  ))}
                </ul>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
};

export default NewFeatures;
