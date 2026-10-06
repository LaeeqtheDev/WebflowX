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
    answer: "There are four plans: Free ($0), Startup ($19), Growth ($49) and Enterprise ($149) per month, billed per workspace. Higher plans raise limits on workspaces, members, channels, notes, documents, meetings and AI summaries. Enterprise is unlimited.",
  },
  {
    id: "file-sharing",
    question: "Can I share files and documents with my team?",
    answer: "Yes. You can share files and documents within your workspace, and write and edit documents together with your team.",
  },
  {
    id: "video-calls",
    question: "Does WebflowX support video calls?",
    answer: "Yes. You can host meetings inside your workspace, and AI summaries can capture the key points afterwards. The number of meetings and summaries depends on your plan.",
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
                  onClick={() => setOpen(isOpen ? null : item.id)}
                  className="flex w-full items-center justify-between gap-4 py-6 text-left"
                >
                  <span className="text-lg font-semibold tracking-tight text-[#1b1017]">{item.question}</span>
                  <Plus className={`h-5 w-5 shrink-0 text-[#ff5018] transition-transform duration-300 ${isOpen ? "rotate-45" : ""}`} />
                </button>
                <div className={`grid transition-all duration-300 ${isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}>
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
