"use client";

import React, { useState } from "react";
import { ChevronDown, MessageCircle, Video, FileText, Settings, Zap } from "lucide-react";

interface FaqItem {
  id: string;
  question: string;
  answer: React.ReactNode;
  icon: React.ReactNode;
  color: string;
}

const faqData: FaqItem[] = [
  {
    id: "getting-started",
    question: "How do I get started with WebflowX?",
    answer: (
      <>
        Simply <strong>sign up</strong>, create your workspace, and invite your team. You can start{" "}
        <strong>chatting, creating tasks, and organizing projects</strong> instantly. No complex setup required!
      </>
    ),
    icon: <MessageCircle className="w-5 h-5 sm:w-6 sm:h-6" />,
    color: "from-blue-500 to-cyan-500",
  },
  {
    id: "pricing",
    question: "What is WebflowX's pricing model?",
    answer: (
      <>
        WebflowX offers a <strong>free plan</strong> for small teams with essential features. Paid plans unlock{" "}
        <strong>AI meeting summaries, unlimited projects, advanced analytics, and admin controls</strong> for scaling teams.
      </>
    ),
    icon: <Zap className="w-5 h-5 sm:w-6 sm:h-6" />,
    color: "from-yellow-500 to-orange-500",
  },
  {
    id: "file-sharing",
    question: "Can I share files and documents with my team?",
    answer: (
      <>
        Yes! Share <strong>files, images, documents, and code snippets</strong> directly within channels or private messages.
        Everything is organized, searchable, and accessible anytime, anywhere.
      </>
    ),
    icon: <FileText className="w-5 h-5 sm:w-6 sm:h-6" />,
    color: "from-green-500 to-emerald-500",
  },
  {
    id: "video-calls",
    question: "Does WebflowX support video calls?",
    answer: (
      <>
        Absolutely! Start <strong>one-on-one or group video calls</strong> directly within your workspace.
        Our <strong>AI-powered summaries</strong> automatically capture key points and action items after each meeting.
      </>
    ),
    icon: <Video className="w-5 h-5 sm:w-6 sm:h-6" />,
    color: "from-red-500 to-pink-500",
  },
  {
    id: "integrations",
    question: "Can I integrate WebflowX with other tools?",
    answer: (
      <>
        Yes! WebflowX integrates with popular productivity tools to sync{" "}
        <strong>tasks, notifications, calendars, and workflows</strong>. Connect your favorite apps and work smarter.
      </>
    ),
    icon: <Settings className="w-5 h-5 sm:w-6 sm:h-6" />,
    color: "from-purple-500 to-indigo-500",
  },
];

export const FAQSection = () => {
  const [openId, setOpenId] = useState<string | null>("getting-started");

  const toggle = (id: string) => {
    setOpenId((prev) => (prev === id ? null : id));
  };

  return (
    <section id="faq" className="bg-gradient-to-b from-white to-gray-50 py-12 sm:py-16 lg:py-24 w-full overflow-x-hidden relative">
      {/* Background decoration */}
      <div className="pointer-events-none absolute -top-40 -right-40 w-96 h-96 bg-gradient-to-br from-orange-300 to-yellow-200 rounded-full opacity-20 blur-3xl" />
      
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 relative z-10 overflow-x-hidden">
        {/* Header */}
        <div className="mb-10 sm:mb-12 lg:mb-16 text-center">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-gray-900 mb-3 sm:mb-4 flex items-center justify-center gap-2 flex-wrap">
            <span>Frequently Asked Questions about</span>
            <span className="inline-flex items-center justify-center -ml-2 sm:-ml-3">
              <img 
                src="/logo.png" 
                alt="WebflowX Logo" 
                className="h-12 w-12 sm:h-16 sm:w-16 lg:h-20 lg:w-20 object-contain" 
              />
            </span>
          </h2>
        </div>

        {/* Accordion */}
        <div className="space-y-3 sm:space-y-4 w-full">
          {faqData.map((item, index) => {
            const isOpen = openId === item.id;
            return (
              <div
                key={item.id}
                className="group bg-white rounded-xl sm:rounded-2xl shadow-sm hover:shadow-lg transition-all duration-300 border border-gray-100 overflow-hidden w-full"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                {/* Question Button */}
                <button
                  onClick={() => toggle(item.id)}
                  className="w-full flex items-center justify-between gap-3 sm:gap-4 px-4 sm:px-6 py-4 sm:py-5 text-left hover:bg-gray-50 transition-colors overflow-hidden"
                >
                  <div className="flex items-center gap-3 sm:gap-4 flex-1 min-w-0 overflow-hidden">
                    {/* Icon with gradient background */}
                    <div className={`flex-shrink-0 w-10 h-10 sm:w-12 sm:h-12 rounded-lg sm:rounded-xl bg-gradient-to-br ${item.color} flex items-center justify-center text-white shadow-md group-hover:shadow-lg transition-shadow`}>
                      {item.icon}
                    </div>
                    {/* Question */}
                    <span className="text-sm sm:text-base lg:text-lg font-semibold text-gray-900 group-hover:text-[#ff5018] transition-colors break-words">
                      {item.question}
                    </span>
                  </div>
                  {/* Chevron */}
                  <ChevronDown
                    className={`w-5 h-5 sm:w-6 sm:h-6 text-gray-400 flex-shrink-0 transition-transform duration-300 ${
                      isOpen ? "rotate-180 text-[#ff5018]" : ""
                    }`}
                  />
                </button>

                {/* Answer */}
                <div
                  className={`overflow-hidden transition-all duration-300 ease-in-out ${
                    isOpen ? "max-h-96 opacity-100" : "max-h-0 opacity-0"
                  }`}
                >
                  <div className="px-4 sm:px-6 pb-4 sm:pb-5 pt-0 overflow-hidden">
                    <div className="pl-0 sm:pl-16">
                      <p className="text-xs sm:text-sm lg:text-base text-gray-600 leading-relaxed break-words">
                        {item.answer}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* CTA at bottom */}
        <div className="mt-10 sm:mt-12 lg:mt-16 text-center">
          <p className="text-sm sm:text-base text-gray-600 mb-4">
            Still have questions? We're here to help!
          </p>
          <a
            href="/contact"
            className="inline-flex items-center gap-2 px-6 sm:px-8 py-3 sm:py-3.5 bg-[#ff5018] hover:bg-[#ff5018]/90 text-white font-semibold rounded-lg sm:rounded-xl transition-all shadow-md hover:shadow-lg text-sm sm:text-base"
          >
            <MessageCircle className="w-4 h-4 sm:w-5 sm:h-5" />
            Get in Touch
          </a>
        </div>
      </div>
    </section>
  );
};