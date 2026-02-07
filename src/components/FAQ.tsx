"use client";

import React, { useState } from "react";
import { ChevronDown, ChevronUp, MessageCircle, Video, FileText, Settings, Flashlight
 } from "lucide-react";

interface FaqItem {
  id: string;
  question: string;
  answer: React.ReactNode;
  icon: React.ReactNode;
}

const faqData: FaqItem[] = [
  {
    id: "getting-started",
    question: "How do I get started with WebflowX?",
    answer: (
      <>
        Simply <strong>sign up</strong>, create your workspace, and invite your team. You can start
        <strong> chatting, creating tasks, and organizing projects</strong> instantly.
      </>
    ),
    icon: <MessageCircle className="text-sky-500 w-5 h-5" />,
  },
  {
    id: "pricing",
    question: "What is WebflowX's pricing model?",
    answer: (
      <>
        WebflowX offers a <strong>free plan</strong> for small teams. Paid plans unlock features like{" "}
        <strong>AI meeting summaries, unlimited projects, and admin controls</strong> for large teams.
      </>
    ),
    icon: <Flashlight className="text-yellow-500 w-5 h-5" />,
  },
  {
    id: "file-sharing",
    question: "Can I share files and documents with my team?",
    answer: (
      <>
        Yes! Share <strong>files, images, and documents</strong> directly within channels or private messages.
        Everything stays organized for easy access.
      </>
    ),
    icon: <FileText className="text-green-500 w-5 h-5" />,
  },
  {
    id: "video-calls",
    question: "Does WebflowX support video calls?",
    answer: (
      <>
        Absolutely. Start <strong>one-on-one or group video calls</strong> directly within your workspace. AI-powered
        summaries keep everyone in the loop.
      </>
    ),
    icon: <Video className="text-red-500 w-5 h-5" />,
  },
  {
    id: "integrations",
    question: "Can I integrate WebflowX with other tools?",
    answer: (
      <>
        Yes, WebflowX integrates with popular productivity tools to sync <strong>tasks, notifications, and calendars</strong>.
      </>
    ),
    icon: <Settings className="text-purple-500 w-5 h-5" />,
  },
];

export const FAQSection = () => {
  const [openId, setOpenId] = useState<string | null>("getting-started");

  const toggle = (id: string) => {
    setOpenId((prev) => (prev === id ? null : id));
  };

  return (
    <section className="bg-base-100 py-12 sm:py-16 lg:py-24 w-full">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-12 space-y-4 text-center sm:mb-16 lg:mb-24">
          <h2 className="text-3xl md:text-3xl lg:text-4xl font-bold text-base-content">
            Have Questions? We’ve Got Answers
          </h2>
          <p className="text-sm md:text-lg text-base-content/80 max-w-2xl mx-auto">
            Everything you need to know about WebflowX, your all-in-one collaboration and productivity platform.
          </p>
        </div>

        {/* Accordion */}
        <div className="flex flex-col gap-4">
          {faqData.map((item) => {
            const isOpen = openId === item.id;
            return (
              <div
                key={item.id}
                className="bg-base-200 rounded-xl shadow-md overflow-hidden transition-all duration-300"
              >
                <button
                  onClick={() => toggle(item.id)}
                  className="w-full flex items-center justify-between px-6 py-4 hover:bg-base-300 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    {item.icon}
                    <span className="text-base-content font-semibold text-left">{item.question}</span>
                  </div>
                  {isOpen ? (
                    <ChevronUp className="w-5 h-5 text-base-content" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-base-content" />
                  )}
                </button>
                <div
                  className={`px-6 pb-4 transition-all duration-300 ${
                    isOpen ? "max-h-96 opacity-100" : "max-h-0 opacity-0"
                  }`}
                >
                  <p className="text-base-content/80">{item.answer}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};
