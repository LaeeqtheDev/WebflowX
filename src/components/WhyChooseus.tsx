import React from "react";
import { Heading, Label, Reveal } from "./landing/ui";
import { wrap } from "./landing/tokens";

const WhyChooseUs = () => (
  <section className="w-full bg-[#f7f2ee] pb-24 md:pb-32">
    <div className={wrap}>
      <Reveal>
        <div className="grid items-end gap-6 lg:grid-cols-2">
          <div>
            <Label>In motion</Label>
            <Heading className="mt-5">See it working.</Heading>
          </div>
          <p className="max-w-md text-[17px] leading-relaxed text-[#1b1017]/70 lg:justify-self-end">
            A short look at WebflowX in use, from conversations to tasks to meetings.
          </p>
        </div>
      </Reveal>
      <Reveal delay={80}>
        <div className="mt-12 overflow-hidden rounded-2xl bg-[#381d2a]">
          <video
            className="aspect-video w-full object-cover"
            autoPlay
            loop
            muted
            playsInline
            src="/video.mp4"
          />
        </div>
      </Reveal>
    </div>
  </section>
);

export default WhyChooseUs;
