"use client";

import React from "react";
import Link from "next/link";
import { ArrowRight, BellRing, CalendarDays, FileText, MessagesSquare, Search, UserRoundPlus, Video, Webhook } from "lucide-react";
import { Heading, Label, Reveal } from "./landing/ui";
import { ChatPane, DocPane, PaneFrame, ScaledFrame, TasksPane } from "./landing/mock";
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
  delay = 0,
}: {
  delay?: number;
  tone: Tone;
  title: string;
  body: string;
  className?: string;
  visualH?: string;
  children?: React.ReactNode;
}) {
  const t = tones[tone];
  return (
    <Reveal variant="scale" delay={delay} className={`h-full min-w-0 ${className}`}><div className={`lp-lift flex h-full flex-col overflow-hidden rounded-3xl p-7 ${t.box}`}>
      <h3 className={`lp-h text-2xl ${t.title}`}>{title}</h3>
      <p className={`mt-2 max-w-sm text-[15px] leading-relaxed ${t.body}`}>{body}</p>
      {children && (
        <div className={`-mx-7 -mb-7 mt-7 overflow-hidden px-7 ${visualH ?? "h-[260px]"}`}>{children}</div>
      )}
    </div></Reveal>
  );
}

const small = [
  { icon: MessagesSquare, t: "Conversations", b: "Everything around a message, handled.", items: ["Workspaces and direct messages", "Threads, reactions, rich text", "Mentions, pins, saved messages"] },
  { icon: Search, t: "Find anything", b: "Nothing gets lost in the scroll.", items: ["Message search", "Ctrl/Cmd+K quick switcher", "One Files page with previews"] },
  { icon: FileText, t: "Docs and notes", b: "Write together, keep your own.", items: ["Real-time documents", "Shared spreadsheets", "Personal and workspace notes"] },
  { icon: CalendarDays, t: "Calendar", b: "Deadlines where you already look.", items: ["Task due dates on a calendar", "Google, Apple, Outlook feed", "Reminders before a deadline"] },
  { icon: BellRing, t: "Notifications", b: "Told once, only when it matters.", items: ["Email, only if still unread", "Push on phone and desktop", "Per-member switches"] },
  { icon: UserRoundPlus, t: "Guests and access", b: "Clients see only what you share.", items: ["Guests in chosen channels", "Roles and permissions", "Storage caps by plan"] },
  { icon: Video, t: "Meetings", b: "Calls that leave a record.", items: ["Video calls in the browser", "Live transcripts", "AI summaries and writing help"] },
  { icon: Webhook, t: "Developers", b: "Connect the tools you already use.", items: ["REST API and API keys", "Incoming and signed outgoing webhooks", "GitHub, Zapier and Make"] },
];

const NewFeatures = () => {

  return (
    <section id="features" className="w-full bg-[#efe8e3] py-16 md:py-32">
      <div className={wrap}>
        <Reveal variant="blur">
          <Label>Product</Label>
          <Heading className="mt-5 max-w-3xl">Everything your team works in, in one app.</Heading>
          <p className="mt-5 max-w-xl text-[17px] leading-relaxed text-[#1b1017]/70">
            Chat, tasks, notes, documents, spreadsheets and meetings share one workspace, one search and one set of permissions.
          </p>
        </Reveal>

        {/* the meeting and agent screens are in the hero; these are the three places a team spends the rest of its day */}
        <div className="mt-10 grid md:mt-14 gap-4 lg:grid-cols-3">
          <Cell tone="white" title="Channels and threads" body="Channels, DMs and threads with reactions, mentions and files, like the chat you use now." visualH="h-[190px] sm:h-[240px]">
            <ScaledFrame w={680} h={440}>
              <PaneFrame>
                <ChatPane channel="product-launch" />
              </PaneFrame>
            </ScaledFrame>
          </Cell>
          <Cell delay={120} tone="plum" title="Tasks next to the conversation" body="A board with sprints, priorities, owners and comments, so work agreed in chat lands somewhere." visualH="h-[190px] sm:h-[240px]">
            <ScaledFrame w={680} h={440}>
              <PaneFrame>
                <TasksPane />
              </PaneFrame>
            </ScaledFrame>
          </Cell>
          <Cell delay={240} tone="white" title="Docs and spreadsheets" body="Write and edit together in real time, with live cursors so you see who is where." visualH="h-[190px] sm:h-[240px]">
            <ScaledFrame w={680} h={440}>
              <PaneFrame>
                <DocPane />
              </PaneFrame>
            </ScaledFrame>
          </Cell>
        </div>

        <div className="mt-16 flex flex-wrap items-end justify-between gap-4">
          <h3 className="lp-h text-3xl text-[#1b1017] sm:text-4xl">Everything in the box.</h3>
          <Link href="/features" className="inline-flex items-center gap-1.5 text-[15px] font-semibold text-[#a82d0a] hover:text-[#ff5018]">
            See every feature <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
        <div className="mt-8 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          {small.map(({ icon: Icon, t, b, items }, i) => (
            <Reveal key={t} delay={(i % 4) * 70} className="h-full">
              <div className="lp-lift h-full rounded-2xl border border-[#381d2a]/10 bg-[#f7f2ee] p-4 sm:rounded-3xl sm:p-6">
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#381d2a] text-[#ff5018] sm:h-10 sm:w-10">
                  <Icon className="h-5 w-5" aria-hidden="true" />
                </span>
                <h4 className="mt-4 text-base font-semibold tracking-tight text-[#1b1017] sm:mt-5 sm:text-lg">{t}</h4>
                <p className="mt-1 hidden text-sm text-[#1b1017]/60 sm:block">{b}</p>
                <ul className="mt-3 space-y-1.5 sm:mt-4">
                  {items.map((i) => (
                    <li key={i} className="flex items-start gap-2 text-[13px] leading-snug text-[#1b1017]/80 sm:text-sm">
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
