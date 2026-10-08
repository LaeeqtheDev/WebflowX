"use client";

import React, { useState } from "react";
import { Plus } from "lucide-react";
import { Heading, Label, Reveal } from "./landing/ui";

const faqData = [
  {
    id: "getting-started",
    question: "How do I get started with WebflowX?",
    answer: "Sign up, create your workspace and invite your team. You can start chatting, creating tasks and organizing projects right away.",
  },
  {
    id: "pricing",
    question: "What is WebflowX's pricing model?",
    answer: "There are four plans: Free ($0), Startup ($29), Growth ($79) and Enterprise ($249) per month, with limits applied per workspace. Higher plans raise limits on workspaces, members, channels, notes, pages and database rows, meetings per month, AI summaries per month, file storage (250 MB, 5 GB, 50 GB and 1 TB under fair use), guests, and integrations such as API keys and webhooks. The Free plan shows the last 90 days of messages; paid plans keep full history. Enterprise has no limit on workspaces, members, channels, pages or database rows, and generous monthly allowances for meetings (200) and AI summaries (150).",
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
    question: "Is my data safe?",
    answer: "Permissions are enforced on the server, not just hidden in the interface. Uploads are checked against an allowed-type list and size caps, rate limits and size limits guard against spam and abuse, and the site sends strict security headers. Read our Terms and Privacy Policy for the details of how data is handled.",
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
    question: "Can I export my data?",
    answer: "Yes. Anyone can download their own data, and owners and admins can export the workspace (direct messages, channels they cannot open and other people's personal notes are left out).",
  },
  {
    id: "dark-mode",
    question: "Is there a dark mode?",
    answer: "Yes. Each member chooses Light, Dark or Auto, and the choice is saved to their account, so it does not change anyone else's view.",
  },
  {
    id: "mobile",
    question: "Does it work on mobile?",
    answer: "Yes. WebflowX has a mobile layout with drawer navigation, and you can install it to your home screen or desktop as an app to get push notifications. On iPhone, add it to the Home Screen first. Native mobile apps are not available yet.",
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

export const FAQSection = () => {
  const [open, setOpen] = useState<string | null>("pricing");

  return (
    <section id="faq" className="w-full bg-[#efe8e3] py-24 md:py-32">
      <div className="mx-auto w-full max-w-4xl px-5 sm:px-8">
        <Reveal>
          <Label>FAQ</Label>
          <Heading className="mt-5">Questions, answered.</Heading>
        </Reveal>
        <div className="mt-12 border-t border-[#381d2a]/20">
          {faqData.map((item) => {
            const isOpen = open === item.id;
            return (
              <div key={item.id} className="border-b border-[#381d2a]/20">
                <button
                  type="button"
                  aria-expanded={isOpen}
                  aria-controls={`faq-${item.id}`}
                  onClick={() => setOpen(isOpen ? null : item.id)}
                  className="flex w-full items-center justify-between gap-4 py-6 text-left"
                >
                  <span className="text-lg font-semibold tracking-tight text-[#1b1017]">{item.question}</span>
                  <Plus aria-hidden="true" className={`h-5 w-5 shrink-0 text-[#ff5018] transition-transform duration-300 ${isOpen ? "rotate-45" : ""}`} />
                </button>
                <div id={`faq-${item.id}`} role="region" className={`grid transition-all duration-300 ${isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}>
                  <div className="overflow-hidden">
                    <p className="pb-6 pr-10 text-sm leading-relaxed text-neutral-600 sm:text-base">{item.answer}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};
