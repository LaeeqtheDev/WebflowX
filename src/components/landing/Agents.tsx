import React from "react";
import { AtSign, Bot, Check, Inbox, ListChecks, ScrollText, ShieldCheck, Sparkles, Sun, ToggleRight } from "lucide-react";
import { Heading, Label, Reveal } from "./ui";
import { wrap } from "./tokens";

// The AI agents, shown as small pieces of the real interface rather than illustrations.
// Copy must match what the agents do (see convex/agents.ts): no claims beyond that.

const Badge = () => (
  <span className="ml-1.5 rounded bg-[#ff5018]/15 px-1.5 py-0.5 align-middle text-[9px] font-bold uppercase tracking-wide text-[#ff8a63]">Agent</span>
);

const Face = ({ c, l }: { c: string; l: string }) => (
  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-[11px] font-bold text-white" style={{ background: c }}>{l}</span>
);

const AgentFace = () => (
  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[#ff5018] text-white"><Sparkles className="h-3.5 w-3.5" aria-hidden="true" /></span>
);

const Line = ({ face, name, agent, children }: { face: React.ReactNode; name: string; agent?: boolean; children: React.ReactNode }) => (
  <div className="flex gap-2.5">
    {face}
    <div className="min-w-0">
      <p className="text-[12px] font-semibold text-white">{name}{agent && <Badge />}</p>
      <div className="mt-0.5 text-[12.5px] leading-relaxed text-white/75">{children}</div>
    </div>
  </div>
);

const Pane = ({ children }: { children: React.ReactNode }) => (
  <div aria-hidden="true" className="mt-5 rounded-2xl border border-white/10 bg-[#1e1019] p-4">{children}</div>
);

const Task = ({ t, who, due }: { t: string; who: string; due?: string }) => (
  <li className="flex items-center gap-2.5 rounded-lg border border-white/10 bg-white/[0.04] px-2.5 py-2">
    <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded bg-[#ff5018]"><Check className="h-3 w-3 text-white" strokeWidth={3} /></span>
    <span className="min-w-0 flex-1 truncate text-[12.5px] text-white">{t}</span>
    <span className="shrink-0 text-[11px] text-white/55">{who}{due ? ` · ${due}` : ""}</span>
  </li>
);

const agents = [
  {
    icon: AtSign,
    t: "Ask @agent anything",
    b: "Type @agent in any channel or thread. It searches your chat, tasks and meetings, answers in the thread and says where it found it. Ask it to summarise a thread or turn it into tasks.",
    pane: (
      <Pane>
        <div className="space-y-3">
          <Line face={<Face c="#10b981" l="A" />} name="Ava"><span className="font-semibold text-[#ff8a63]">@agent</span> what did we decide about pricing?</Line>
          <div className="ml-4 border-l border-white/10 pl-4">
            <Line face={<AgentFace />} name="WebflowX Agent" agent>
              Startup stays at $29 and Growth moves to $79 from December.
              <span className="mt-1 block text-[11px] text-white/45">From: Pricing review (meeting, Oct 28)</span>
            </Line>
          </div>
        </div>
      </Pane>
    ),
  },
  {
    icon: Bot,
    t: "Meetings that assign their own tasks",
    b: "After a call, the follow-up agent turns the action items into tasks for the right people, with due dates when they were said, and posts a short recap.",
    pane: (
      <Pane>
        <p className="text-[11px] font-semibold uppercase tracking-wide text-white/45">Weekly launch sync · 3 tasks</p>
        <ul className="mt-2.5 space-y-1.5">
          <Task t="Send the launch email" who="Dev" due="Fri" />
          <Task t="Publish the pricing page" who="Ava" due="Thu" />
          <Task t="Review the FAQ" who="Maya" />
        </ul>
        <span className="mt-3 inline-flex h-7 items-center gap-1.5 rounded-lg bg-[#ff5018] px-3 text-[11.5px] font-semibold text-white"><Check className="h-3.5 w-3.5" /> Approve all</span>
      </Pane>
    ),
  },
  {
    icon: Inbox,
    t: "Requests in chat become tasks",
    b: "The triage agent watches the channels you choose. When someone asks for something, it makes a task for the right person and replies in the thread, so nothing asked in chat gets lost.",
    pane: (
      <Pane>
        <div className="space-y-3">
          <Line face={<Face c="#8b5cf6" l="M" />} name="Maya">Can someone fix the checkout button on mobile? Customers can&apos;t pay.</Line>
          <div className="ml-4 border-l border-white/10 pl-4">
            <Line face={<AgentFace />} name="Triage agent" agent>
              Added to the board: Fix the checkout button on mobile → Dev, urgent
            </Line>
          </div>
        </div>
      </Pane>
    ),
  },
  {
    icon: Sun,
    t: "A standup that writes itself",
    b: "Every morning, at the time you pick, the standup agent posts what got done, what's due today, what's overdue and any blockers mentioned in chat. Quiet days are skipped.",
    pane: (
      <Pane>
        <Line face={<AgentFace />} name="Standup agent" agent>
          <span className="block">Morning team ☀️ Here&apos;s where things stand.</span>
          <span className="mt-1.5 block">✅ Done: onboarding emails (Ava), invoice export (Dev)</span>
          <span className="block">📅 Due today: launch email (Dev)</span>
          <span className="block">⚠️ Overdue: FAQ review (no owner)</span>
          <span className="block">💬 Dev is waiting on the Stripe keys</span>
        </Line>
      </Pane>
    ),
  },
];

const guardrails = [
  { icon: ShieldCheck, t: "Sees only what you can see", b: "@agent searches only the channels, tasks and meetings the person asking can open. Never direct messages." },
  { icon: ToggleRight, t: "Suggest first, act when you trust it", b: "Agents can propose work for someone to approve, or act on their own. Admins switch each one on and choose." },
  { icon: ListChecks, t: "Your permissions, not more", b: "Tasks are created with the permissions of the person asking, or of the admin who switched the agent on." },
  { icon: ScrollText, t: "Every action on record", b: "Agent posts carry an Agent badge, and switching agents on or approving their work is in the audit log." },
];

export default function AgentsSection() {
  return (
    <section id="agents" className="w-full bg-[#2a1420] py-24 text-white md:py-32">
      <div className={wrap}>
        <div className="grid gap-6 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] lg:items-end">
          <Reveal>
            <Label dark>AI agents</Label>
            <Heading dark className="mt-5 max-w-3xl">Teammates that do the follow-up for you.</Heading>
          </Reveal>
          <Reveal delay={80}>
            <p className="max-w-md text-[17px] leading-relaxed text-white/70">
              The busywork after the meeting, the request lost in a channel, the &ldquo;where are we on this?&rdquo; WebflowX&apos;s agents
              handle it inside your workspace, where the work already is.
            </p>
          </Reveal>
        </div>

        <div className="mt-14 grid gap-4 md:grid-cols-2">
          {agents.map(({ icon: Icon, t, b, pane }, i) => (
            <Reveal key={t} delay={(i % 2) * 80}>
              <div className="flex h-full flex-col rounded-3xl border border-white/10 bg-[#381d2a] p-6 sm:p-7">
                <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#2a1420] text-[#ff5018]">
                  <Icon className="h-5 w-5" aria-hidden="true" />
                </span>
                <h3 className="lp-h mt-5 text-2xl">{t}</h3>
                <p className="mt-2 text-[15px] leading-relaxed text-white/70">{b}</p>
                <div className="mt-auto">{pane}</div>
              </div>
            </Reveal>
          ))}
        </div>

        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {guardrails.map(({ icon: Icon, t, b }, i) => (
            <Reveal key={t} delay={i * 60}>
              <div className="h-full rounded-2xl border border-white/10 p-5">
                <Icon className="h-5 w-5 text-[#ff5018]" aria-hidden="true" />
                <p className="mt-3 text-[15px] font-semibold tracking-tight">{t}</p>
                <p className="mt-1 text-[13.5px] leading-relaxed text-white/65">{b}</p>
              </div>
            </Reveal>
          ))}
        </div>

        <Reveal>
          <p className="mt-8 text-sm text-white/55">
            Included in every plan with a monthly allowance of agent runs: 5 on Free, 50 on Startup, 200 on Growth and 1,000 on Enterprise.
          </p>
        </Reveal>
      </div>
    </section>
  );
}
