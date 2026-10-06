import React, { FC } from "react";
import { Heading, Label, Reveal } from "./landing/ui";
import { wrap } from "./landing/tokens";

const testimonials = [
  { client: "Ammar Khan", role: "Frontend Engineer", testimonial: "We started using WebflowX internally while it was still rough. The task flow and real-time collaboration genuinely saved us hours every week." },
  { client: "Sarah Malik", role: "Product Designer", testimonial: "What stood out was how fast the team shipped improvements. Features we requested actually showed up in the next iteration." },
  { client: "Usman R.", role: "Startup Founder", testimonial: "WebflowX helped us keep product discussions, tasks, and meetings in one place. It reduced the chaos more than we expected." },
  { client: "Hassan Ali", role: "Remote Team Lead", testimonial: "We used WebflowX during beta with a distributed team. The real-time updates and clarity around ownership made a huge difference." },
];

const ClientTestimonials: FC = () => (
  <section className="w-full bg-[#efe8e3] py-24 md:py-32">
    <div className={wrap}>
      <Reveal>
        <Label>Feedback</Label>
        <Heading className="mt-5 max-w-3xl">Teams building with WebflowX.</Heading>
      </Reveal>
      <div className="mt-14 grid border-t border-[#381d2a]/15 md:grid-cols-2">
        {testimonials.map((t, i) => (
          <Reveal key={t.client} delay={(i % 2) * 80}>
            <figure className={`h-full border-b border-[#381d2a]/15 py-10 md:px-0 ${i % 2 === 0 ? "md:border-r md:pr-12" : "md:pl-12"}`}>
              <blockquote className="text-xl leading-snug tracking-tight text-[#1b1017]">
                &ldquo;{t.testimonial}&rdquo;
              </blockquote>
              <figcaption className="mt-6 text-sm">
                <span className="font-semibold text-[#1b1017]">{t.client}</span>
                <span className="text-[#1b1017]/55">, {t.role}</span>
              </figcaption>
            </figure>
          </Reveal>
        ))}
      </div>
    </div>
  </section>
);

export default ClientTestimonials;
