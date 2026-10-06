"use client";

import React, { useEffect, useRef, useState } from "react";
import Image from "next/image";
import {
  Bell,
  CheckSquare,
  FileText,
  Hash,
  Home,
  MessageSquare,
  MoreHorizontal,
  NotebookPen,
  Search,
  Send,
  Video,
} from "lucide-react";

/** Scales a fixed-size design to the width of its container. */
export function ScaledFrame({
  w,
  h,
  children,
  className = "",
}: {
  w: number;
  h: number;
  children: React.ReactNode;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.5);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const update = () => setScale(el.clientWidth / w);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [w]);

  return (
    <div
      ref={ref}
      className={`relative w-full overflow-hidden ${className}`}
      style={{ height: h * scale }}
    >
      <div
        style={{
          width: w,
          height: h,
          transform: `scale(${scale})`,
          transformOrigin: "top left",
        }}
      >
        {children}
      </div>
    </div>
  );
}

const PLUM = "#381d2a";
const SIDE = "#402633";

export function Avatar({
  name,
  color,
  size = 36,
}: {
  name: string;
  color: string;
  size?: number;
}) {
  return (
    <span
      className="flex shrink-0 items-center justify-center rounded-md font-semibold text-white"
      style={{ width: size, height: size, background: color, fontSize: size * 0.42 }}
    >
      {name[0]}
    </span>
  );
}

const rail = [
  { i: Home, l: "Home" },
  { i: MessageSquare, l: "DMs" },
  { i: Bell, l: "Activity" },
  { i: CheckSquare, l: "Tasks" },
  { i: NotebookPen, l: "Notes" },
  { i: FileText, l: "Docs" },
  { i: Video, l: "Meetings" },
  { i: MoreHorizontal, l: "More" },
];

const channels = [
  "general",
  "announcements",
  "product-launch",
  "design-review",
  "engineering",
  "marketing",
  "customer-support",
  "ideas",
  "random",
];

/** Replica of the WebflowX dashboard shell (1120 x 640 design units). */
export function AppFrame({
  active = "Home",
  channel = "general",
  children,
}: {
  active?: string;
  channel?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className="flex h-[640px] w-[1120px] flex-col overflow-hidden rounded-xl bg-white text-left shadow-[0_30px_80px_-30px_rgba(56,29,42,0.55)]"
      style={{ fontFamily: "var(--font-geist-sans), system-ui, sans-serif" }}
    >
      <div className="flex h-10 items-center justify-between px-4" style={{ background: "#5a4350" }}>
        <Image src="/logo.png" alt="" width={22} height={22} className="h-[22px] w-[22px]" />
        <div className="flex h-6 w-[380px] items-center gap-2 rounded-md bg-white/15 px-3 text-xs text-white/80">
          <Search className="h-3 w-3" /> Search Horizon Labs
        </div>
        <span className="w-[22px]" />
      </div>
      <div className="flex min-h-0 flex-1">
        <div className="flex w-[68px] flex-col items-center gap-1 pt-3" style={{ background: PLUM }}>
          <span className="mb-3 flex h-9 w-9 items-center justify-center rounded-lg bg-[#111] text-base font-bold text-white">
            H
          </span>
          {rail.map(({ i: Icon, l }) => (
            <div
              key={l}
              className={`flex w-[54px] flex-col items-center gap-1 rounded-lg py-2 ${
                l === active ? "bg-white/12" : ""
              }`}
              style={l === active ? { background: "rgba(255,255,255,0.12)" } : undefined}
            >
              <Icon className="h-[18px] w-[18px] text-[#ff5018]" />
              <span className="text-[9px] font-semibold text-white/85">{l}</span>
            </div>
          ))}
        </div>
        <div className="w-[222px] px-3 pt-4 text-[13px] text-white/75" style={{ background: SIDE }}>
          <p className="mb-4 px-2 text-lg font-bold text-white">Horizon Labs</p>
          <p className="px-2 py-1.5">Threads</p>
          <p className="px-2 py-1.5">Drafts &amp; Sent</p>
          <p className="mt-3 px-2 py-1.5 font-semibold text-white">Channels</p>
          {channels.map((c) => (
            <p
              key={c}
              className={`flex items-center gap-2 rounded-md px-2 py-[5px] ${
                c === channel ? "bg-[#ece9eb] font-medium text-[#1b1017]" : ""
              }`}
            >
              <Hash className="h-3 w-3 text-[#ff5018]" />
              {c}
            </p>
          ))}
        </div>
        <div className="relative flex min-w-0 flex-1 flex-col">{children}</div>
      </div>
    </div>
  );
}

function Msg({
  name,
  color,
  time,
  late = false,
  children,
}: {
  name: string;
  color: string;
  time: string;
  late?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className={`m-msg flex gap-3 ${late ? "m-late" : ""}`}>
      <Avatar name={name} color={color} />
      <div>
        <p className="text-[13px]">
          <span className="font-bold text-[#1b1017]">{name}</span>{" "}
          <span className="text-xs text-neutral-400">{time}</span>
        </p>
        <div className="mt-0.5 text-[13px] leading-snug text-neutral-800">{children}</div>
      </div>
    </div>
  );
}

export function ChatPane({ channel = "general" }: { channel?: string }) {
  return (
    <>
      <div className="flex h-12 items-center border-b border-neutral-200 px-5 text-[15px] font-bold text-[#1b1017]">
        # {channel}
      </div>
      <div className="flex flex-1 flex-col justify-end gap-4 overflow-hidden px-5 pb-4">
        <div className="flex items-center gap-3 text-[11px] text-neutral-400">
          <span className="h-px flex-1 bg-neutral-200" />
          Today
          <span className="h-px flex-1 bg-neutral-200" />
        </div>
        <Msg name="Ava Torres" color="#8a6a2f" time="8:55 AM">
          Good morning! Standup notes are posted in #engineering.
        </Msg>
        <Msg name="Maya Chen" color="#7b3f61" time="9:12 AM">
          Reminder: all-hands moved to 3 PM today. Agenda is pinned in #announcements.
        </Msg>
        <Msg name="Dev Patel" color="#2f7d6b" time="9:40 AM">
          The checkout bug on mobile Safari is fixed and merged. Deploying after lunch.
        </Msg>
        <Msg name="Sofia Alvarez" color="#c0561f" time="10:05 AM">
          Shared a document: <span className="text-[#ff5018]">Q4 campaign brief</span>. Feedback welcome before Friday.
        </Msg>
        <Msg name="Liam Reed" color="#3b5a9a" time="10:22 AM">
          Top request in this week&apos;s customer feedback is a simpler onboarding. Summary is in Docs.
        </Msg>
        <Msg name="Noah Kim" color="#5a4350" time="10:31 AM" late>
          Great, I&apos;ll add it to the roadmap and link the tasks.
        </Msg>
        <p className="m-typing flex items-center gap-1 text-[11px] text-neutral-400">
          Noah is typing
          {[0, 1, 2].map((d) => (
            <span
              key={d}
              className="h-1 w-1 rounded-full bg-neutral-400"
              style={{ animation: `lp-dot 1.2s ${d * 0.2}s infinite` }}
            />
          ))}
        </p>
      </div>
      <div className="mx-5 mb-4 rounded-lg border border-neutral-200 bg-[#f8f8f8]">
        <div className="flex gap-4 border-b border-neutral-200 px-3 py-2 text-xs font-bold text-neutral-500">
          <span>B</span>
          <span className="italic">I</span>
          <span className="line-through">S</span>
        </div>
        <div className="flex items-center justify-between px-3 py-3 text-[13px] text-neutral-400">
          Message # {channel}
          <Send className="h-4 w-4" />
        </div>
      </div>
    </>
  );
}

type Task = { t: string; who: string; c: string };

const cols: { name: string; items: Task[] }[] = [
  {
    name: "To do",
    items: [
      { t: "Write Q4 campaign brief", who: "Sofia Alvarez", c: "#c0561f" },
      { t: "Fix email template spacing", who: "Liam Reed", c: "#3b5a9a" },
    ],
  },
  {
    name: "In progress",
    items: [
      { t: "Deploy checkout fix", who: "Dev Patel", c: "#2f7d6b" },
      { t: "Design settings page", who: "Maya Chen", c: "#7b3f61" },
    ],
  },
  {
    name: "Done",
    items: [
      { t: "Update pricing FAQ", who: "Noah Kim", c: "#5a4350" },
      { t: "Set up error monitoring", who: "Dev Patel", c: "#2f7d6b" },
    ],
  },
];

export function TasksPane() {
  return (
    <>
      <div className="flex h-12 items-center justify-between border-b border-neutral-200 px-5 text-[15px] font-bold text-[#1b1017]">
        Tasks
        <span className="rounded-md bg-[#ff5018] px-3 py-1 text-xs font-semibold text-white">
          New task
        </span>
      </div>
      <div className="grid flex-1 grid-cols-3 gap-4 bg-[#f8f6f7] p-5">
        {cols.map((c) => (
          <div key={c.name}>
            <p className="mb-3 flex items-center justify-between text-xs font-semibold text-neutral-500">
              {c.name}
              <span className="font-normal">{c.items.length}</span>
            </p>
            <div className="space-y-3">
              {c.items.map((x) => (
                <div
                  key={x.t}
                  className="m-card rounded-lg border border-neutral-200 bg-white p-3.5"
                >
                  <p className="text-[13px] font-medium text-[#1b1017]">{x.t}</p>
                  <div className="mt-3 flex items-center gap-2 text-[11px] text-neutral-500">
                    <Avatar name={x.who} color={x.c} size={18} />
                    {x.who}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

export function DocPane() {
  return (
    <>
      <div className="flex h-12 items-center border-b border-neutral-200 px-5 text-[15px] font-bold text-[#1b1017]">
        Q4 campaign brief
      </div>
      <div className="flex gap-4 border-b border-neutral-200 px-5 py-2 text-xs font-bold text-neutral-500">
        <span>B</span>
        <span className="italic">I</span>
        <span className="underline">U</span>
        <span>H1</span>
        <span>H2</span>
        <span>List</span>
      </div>
      <div className="flex-1 space-y-4 px-10 py-8">
        <p className="m-line text-3xl font-bold tracking-tight text-[#1b1017]">Q4 campaign brief</p>
        <p className="m-line text-[15px] leading-relaxed text-neutral-700">
          Goals, audience and timeline for the Q4 launch campaign, with owners for each step.
        </p>
        {["Confirm target audience", "Draft key messages", "Schedule design review"].map((x, i) => (
          <p key={x} className="m-line flex items-center gap-3 text-[15px] text-neutral-800">
            <span
              className={`flex h-4 w-4 items-center justify-center rounded border text-[10px] ${
                i === 0 ? "border-[#ff5018] bg-[#ff5018] text-white" : "border-neutral-300"
              }`}
            >
              {i === 0 ? "✓" : ""}
            </span>
            {x}
          </p>
        ))}
        <p className="m-line relative text-[15px] text-neutral-700">
          Owners are assigned in Tasks.
          <span className="relative ml-0.5 inline-block h-4 w-0.5 translate-y-0.5 bg-[#ff5018]" style={{ animation: "lp-caret 1s infinite" }}>
            <span className="absolute -top-5 left-0 whitespace-nowrap rounded-sm bg-[#ff5018] px-1.5 py-0.5 text-[10px] font-semibold text-white">
              Sofia
            </span>
          </span>
        </p>
      </div>
    </>
  );
}

export function MeetingPane() {
  const tiles = [
    ["Maya", "#7b3f61"],
    ["Dev", "#2f7d6b"],
    ["Sofia", "#c0561f"],
    ["Liam", "#3b5a9a"],
  ];
  return (
    <>
      <div className="flex h-12 items-center border-b border-neutral-200 px-5 text-[15px] font-bold text-[#1b1017]">
        Weekly product sync
      </div>
      <div className="grid flex-1 grid-cols-5 gap-4 p-5">
        <div className="col-span-3 grid grid-cols-2 gap-3">
          {tiles.map(([n, c]) => (
            <div key={n} className="m-card flex items-center justify-center rounded-lg" style={{ background: SIDE }}>
              <Avatar name={n} color={c} size={52} />
            </div>
          ))}
        </div>
        <div className="m-card col-span-2 rounded-lg border border-neutral-200 bg-[#f8f6f7] p-4">
          <p className="text-xs font-semibold text-[#ff5018]">AI summary</p>
          <p className="mt-2 text-[13px] font-semibold text-[#1b1017]">Key points</p>
          <ul className="mt-1.5 space-y-1.5 text-[12px] leading-snug text-neutral-700">
            <li>Checkout fix ships today.</li>
            <li>Campaign brief is due Friday.</li>
          </ul>
          <p className="mt-4 text-[13px] font-semibold text-[#1b1017]">Action items</p>
          <ul className="mt-1.5 space-y-1.5 text-[12px] text-neutral-700">
            <li>Dev: deploy checkout fix</li>
            <li>Sofia: finish campaign brief</li>
          </ul>
        </div>
      </div>
    </>
  );
}

/** A bordered pane (no app shell) for feature rows. */
export function PaneFrame({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="flex h-[440px] w-[680px] flex-col overflow-hidden rounded-xl border border-neutral-200 bg-white text-left shadow-[0_24px_60px_-28px_rgba(56,29,42,0.45)]"
      style={{ fontFamily: "var(--font-geist-sans), system-ui, sans-serif" }}
    >
      {children}
    </div>
  );
}
