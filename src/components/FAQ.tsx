"use client";

import React, { useState } from "react";
import { Plus } from "lucide-react";
import { Heading, Label, Reveal } from "./landing/ui";

const faqData = [
  {
    id: "agents",
    question: "What do the AI agents actually do?",
    answer: "Four things, each switched on by an admin in Settings › Agents. The follow-up agent turns a meeting's action items into tasks for the right people. The triage agent turns requests in the channels you pick into tasks and replies in the thread. The standup agent posts what got done, what's due and what's overdue each morning. And anyone can type @agent in chat to ask a question about your workspace, summarise a thread or make tasks.",
  },
  {
    id: "agents-access",
    question: "Can the agents see everything in my workspace?",
    answer: "No. @agent only searches the channels, tasks and meetings the person asking can open, and never direct messages. Agents act with the permissions of the person asking or of the admin who switched them on, and they can be set to suggest work for someone to approve instead of acting on their own. Every agent message carries an Agent badge.",
  },
  {
    id: "switch",
    question: "We already use Slack and Notion. How hard is it to switch?",
    answer: "Owners and admins can import channels from a Slack export and pages from a Notion export (Settings › Import). Start on the free plan with a small group, invite the rest of the team when you're ready, and export your data any time.",
  },
  {
    id: "getting-started",
    question: "How do I get started with WebflowX?",
    answer: "Sign up free with email, Google or GitHub, create a workspace and invite your team with a link. Then switch on the agents in Settings › Agents, and your next meeting turns its action items into tasks.",
  },
  {
    id: "pricing",
    question: "Is it really one price for the whole team?",
    answer: "Yes. Each plan is a flat monthly price for the workspace, not per person: Free for up to 10 people, Startup $29 for up to 25, Growth $79 for up to 100 and Enterprise $249 with no member limit. Every limit is listed under Pricing.",
  },
  {
    id: "file-sharing",
    question: "Can I share files and documents with my team?",
    answer: "Yes. Attach files and images to messages, and write and edit pages, spreadsheets and databases together in real time. Uploads are checked for type and size, and each workspace has a storage cap that depends on its plan.",
  },
  {
    id: "video-calls",
    question: "Does WebflowX support video calls?",
    answer: "Yes. You can host video meetings inside your workspace, follow a live transcript, and get an AI summary with action items and decisions afterwards. The number of meetings and summaries depends on your plan.",
  },
  {
    id: "integrations",
    question: "Does WebflowX connect to other tools?",
    answer: "Yes. From the Startup plan you can create API keys and incoming webhooks, so scripts and tools can read channels and tasks, post messages and create tasks. Growth adds outgoing webhooks (signed events when messages and tasks change) and a GitHub connection for pushes, pull requests, issues, releases and failed builds. Zapier and Make connect through the API and webhooks.",
  },
  {
    id: "guests",
    question: "Can I invite clients or contractors without giving them everything?",
    answer: "Yes. Guests only see the channels you add them to, and cannot open tasks, notes, documents, meetings or direct messages. Startup includes 5 guests, Growth 25, and Enterprise has no limit.",
  },
  {
    id: "two-step",
    question: "Can I turn on two-step verification?",
    answer: "Yes. Anyone can add an authenticator app and keep backup codes in their account settings. On Growth and Enterprise, owners and admins can require two-step verification for everyone in the workspace.",
  },
  {
    id: "security",
    question: "Is my data safe, and where is it stored?",
    answer: "Permissions are enforced on the server, not just hidden in the interface, and two-step verification and an audit log are built in. Workspace data is stored in one deployment in the United States (US East); choosing a region isn't available yet. We don't hold SOC 2 or ISO 27001 certification. The Security and Trust pages have the details.",
  },
  {
    id: "permissions",
    question: "Can I control who sees what?",
    answer: "Yes. There are four built-in roles (owner, admin, moderator and member) plus custom roles built from 14 permissions. You can lock channels to members you choose, make channels read-only for announcements, create invite links that expire or switch them off, review an audit log of admin actions, and transfer ownership.",
  },
  {
    id: "email",
    question: "Will I get verification and password reset emails?",
    answer: "Yes. New accounts confirm their email with an 8-digit code that expires after 15 minutes, and you can reset a forgotten password with a code sent by email. You can also sign in with Google or GitHub.",
  },
  {
    id: "notifications",
    question: "How do email notifications work?",
    answer: "WebflowX emails you about mentions, direct messages, thread replies, task assignments, task comments and tasks that are almost due, but only if you have not already read them. You can also turn on push notifications. Each member can switch either off.",
  },
  {
    id: "export",
    question: "What happens to our data if we leave?",
    answer: "It's yours. Owners and admins can export the workspace and anyone can download their own data, at any time (direct messages, channels you can't open and other people's personal notes are left out of a workspace export). A cancelled plan runs to the end of the paid period, then moves to Free with your content kept. Owners can delete the workspace, which removes its content.",
  },
  {
    id: "dark-mode",
    question: "Is there a dark mode?",
    answer: "Yes. Each member chooses Light, Dark or Auto, and the choice is saved to their account, so it does not change anyone else's view.",
  },
  {
    id: "mobile",
    question: "Is there a mobile app?",
    answer: "Not in the App Store or Google Play yet. WebflowX works in your phone's browser, and you can install it to your home screen as an app to get push notifications. On iPhone, add it to the Home Screen first.",
  },
  {
    id: "limits",
    question: "What happens when I hit a plan limit?",
    answer: "WebflowX explains which limit you reached and shows an upgrade prompt for the next plan. Limits cover workspaces, members, guests, channels, notes, pages and database rows, meetings per month, AI summaries per month, file storage and integrations.",
  },
  {
    id: "merger",
    question: "What does the merger with North Foundry mean for me?",
    answer: "WebflowX and North Foundry are coming together as one team. For details that affect your account, write to hello@northfoundry.co.",
  },
];

// the questions people ask before signing up come first; the rest are one click away
const FIRST = 8

const ORDER = ["agents", "agents-access", "switch", "pricing", "mobile", "security", "export", "getting-started"]
const ranked = [...faqData].sort((a, b) => (ORDER.indexOf(a.id) + 1 || 99) - (ORDER.indexOf(b.id) + 1 || 99))

export const FAQSection = () => {
  const [open, setOpen] = useState<string | null>("agents");
  const [all, setAll] = useState(false);
  const shown = all ? ranked : ranked.slice(0, FIRST);

  return (
    <section id="faq" className="w-full bg-[#f7f2ee] py-16 md:py-32">
      <div className="mx-auto grid w-full max-w-7xl gap-12 px-5 sm:px-8 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-16">
        <div className="lg:sticky lg:top-28 lg:self-start">
        <Reveal variant="blur">
          <Label>FAQ</Label>
          <Heading className="mt-5">Questions, answered.</Heading>
          <p className="mt-5 max-w-sm text-[17px] leading-relaxed text-[#1b1017]/70">The things teams ask before they move their chat, docs and meetings over.</p>
        </Reveal>
        <Reveal delay={120}>
          <div className="relative mt-8 overflow-hidden rounded-3xl bg-[#381d2a] p-6 text-white">
            <div aria-hidden="true" className="lp-glow opacity-70" />
            <div className="relative">
              <p className="text-lg font-semibold tracking-tight">Still have a question?</p>
              <p className="mt-1.5 text-sm leading-relaxed text-white/70">Write to us and a person from the team answers, usually within a day.</p>
              <a href="mailto:support@northfoundry.co?subject=WebflowX%20question" className="mt-4 inline-flex rounded-lg bg-[#ff5018] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#ff6a3a]">Email support</a>
            </div>
          </div>
        </Reveal>
        </div>
        <div>
        <div className="flex flex-col gap-3">
          {shown.map((item) => {
            const isOpen = open === item.id;
            return (
              <div key={item.id} className={`rounded-2xl border bg-white px-5 transition-colors sm:px-6 ${isOpen ? "border-[#ff5018]/40 shadow-[0_18px_40px_-28px_rgba(56,29,42,0.45)]" : "border-[#381d2a]/10 hover:border-[#381d2a]/25"}`}>
                <button
                  type="button"
                  aria-expanded={isOpen}
                  aria-controls={`faq-${item.id}`}
                  onClick={() => setOpen(isOpen ? null : item.id)}
                  className="flex w-full items-center justify-between gap-4 py-5 text-left"
                >
                  <span className="text-[17px] font-semibold tracking-tight text-[#1b1017]">{item.question}</span>
                  <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition-colors ${isOpen ? "bg-[#ff5018] text-white" : "bg-[#f7f2ee] text-[#ff5018]"}`}>
                    <Plus aria-hidden="true" className={`h-4 w-4 transition-transform duration-300 ${isOpen ? "rotate-45" : ""}`} />
                  </span>
                </button>
                <div id={`faq-${item.id}`} role="region" className={`grid transition-all duration-300 ${isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}>
                  <div className="overflow-hidden">
                    <p className="pb-5 pr-10 text-[15px] leading-relaxed text-[#1b1017]/70">{item.answer}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        {!all && faqData.length > FIRST && (
          <button type="button" onClick={() => setAll(true)} className="mt-6 rounded-lg border border-[#381d2a]/20 px-5 py-3 text-sm font-semibold text-[#381d2a] transition-colors hover:bg-white">
            Show all {faqData.length} questions
          </button>
        )}
        </div>
      </div>
    </section>
  );
};
