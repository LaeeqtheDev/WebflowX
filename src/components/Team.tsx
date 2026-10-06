import React from "react";
import Image from "next/image";
import { Heading, Label, Reveal } from "./landing/ui";
import { wrap } from "./landing/tokens";

const team = [
  { name: "Daniel Brooks", role: "CEO & Founder", src: "/av3.jpg", pos: "object-[50%_0%]" },
  { name: "Shanzay", role: "Co-Founder & CTO", src: "/shanzay.jpg", pos: "object-[50%_30%]" },
  { name: "Arooj", role: "Co-Founder & CPO", src: "/arooj2.jpg", pos: "object-[50%_30%]" },
];

export function AppleCardsCarouselDemo() {
  return (
    <section id="team" className="w-full bg-[#381d2a] py-24 md:py-32">
      <div className={wrap}>
        <Reveal>
          <Label dark>The team</Label>
          <Heading dark className="mt-5 max-w-3xl">The people behind WebflowX.</Heading>
        </Reveal>
        <div className="mt-14 grid gap-6 md:grid-cols-3">
          {team.map((m, i) => (
            <Reveal key={m.name} delay={i * 80}>
              <figure>
                <div className="relative aspect-[9/13] w-full overflow-hidden rounded-2xl bg-[#2a1420]">
                  <Image
                    src={m.src}
                    alt={m.name}
                    fill
                    sizes="(min-width: 768px) 33vw, 100vw"
                    className={`object-cover ${m.pos}`}
                  />
                </div>
                <figcaption className="mt-4 flex items-baseline justify-between border-b border-white/15 pb-4">
                  <span className="text-xl font-semibold tracking-tight text-white">{m.name}</span>
                  <span className="text-sm text-white/60">{m.role}</span>
                </figcaption>
              </figure>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
