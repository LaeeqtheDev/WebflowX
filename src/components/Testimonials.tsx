import React, { FC } from "react";
import { Heading, Label, Reveal } from "./landing/ui";
import { wrap } from "./landing/tokens";

const highlights = [
  { title: "One place for the work", body: "Keep conversations, tasks, documents and meetings in the same workspace instead of juggling separate tools." },
  { title: "Live collaboration", body: "Channels, threads and shared documents update as your team works, so everyone sees the same thing." },
  { title: "Meetings that leave notes", body: "Host a call from your workspace and get key points and action items from an AI summary afterwards." },
  { title: "Clear limits, simple plans", body: "Start on the free plan and move up when you need more room. Every plan lists its limits up front." },
];

const ClientTestimonials: FC = () => (
  <section className="w-full bg-[#efe8e3] py-24 md:py-32">
    <div className={wrap}>
      <Reveal>
        <Label>Built by North Foundry</Label>
        <Heading className="mt-5 max-w-3xl">Made by a studio that ships.</Heading>
      </Reveal>
      <div className="mt-14 grid border-t border-[#381d2a]/15 md:grid-cols-2">
        {highlights.map((t, i) => (
          <Reveal key={t.title} delay={(i % 2) * 80}>
            <div className={`h-full border-b border-[#381d2a]/15 py-10 md:px-0 ${i % 2 === 0 ? "md:border-r md:pr-12" : "md:pl-12"}`}>
              <h3 className="text-xl font-semibold leading-snug tracking-tight text-[#1b1017]">{t.title}</h3>
              <p className="mt-3 text-[15px] leading-relaxed text-[#1b1017]/70">{t.body}</p>
            </div>
          </Reveal>
        ))}
      </div>
    </div>
  </section>
);

export default ClientTestimonials;
