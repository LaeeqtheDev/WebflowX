"use client";

import React, { FC } from "react";
import Image from "next/image";

interface Testimonial {
  client: string;
  role: string;
  testimonial: string;
}

const testimonials: Testimonial[] = [
  {
    client: "Ammar Khan",
    role: "Frontend Engineer",
    testimonial:
      "We started using WebflowX internally while it was still rough. The task flow and real-time collaboration genuinely saved us hours every week.",
  },
  {
    client: "Sarah Malik",
    role: "Product Designer",
    testimonial:
      "What stood out was how fast the team shipped improvements. Features we requested actually showed up in the next iteration.",
  },
  {
    client: "Usman R.",
    role: "Startup Founder",
    testimonial:
      "WebflowX helped us keep product discussions, tasks, and meetings in one place. It reduced the chaos more than we expected.",
  },
  {
    client: "Hassan Ali",
    role: "Remote Team Lead",
    testimonial:
      "We used WebflowX during beta with a distributed team. The real-time updates and clarity around ownership made a huge difference.",
  },
];

// Duplicate for seamless scroll
const repeatedTestimonials = [...testimonials, ...testimonials];

const ClientTestimonials: FC = () => {
  return (
    <section className="py-20">
      <div className="max-w-7xl mx-auto px-6 md:px-8">
        {/* Header */}
        <header className="text-center mb-14">
         <div className=" inline-flex">
         <h2 className="flex items-center justify-center gap-3 text-3xl md:text-4xl font-bold text-black mb-3">
  <span>Teams Building with</span>
  <img
    src="/logo.png"
    alt="Webflow logo"
    className="h-24 w-24 object-contain -ml-10"
  />
</h2>
         </div>
          <p className="text-neutral-600 max-w-2xl mx-auto">
            Early users, real feedback, and lessons learned while building WebflowX
            in production environments.
          </p>
        </header>

        <div className="flex flex-col md:flex-row items-center gap-12">
          {/* Left: Image */}
          <div className="relative w-full md:w-1/2 h-64 md:h-105">
            <Image
              src="/clients.png"
              alt="Teams using WebflowX"
              fill
              className="object-cover rounded-2xl"
              priority
            />
          </div>

          {/* Right: Marquee */}
          <div className="w-full md:w-1/2 overflow-hidden">
            <div className="flex w-max animate-scroll-webflowx">
              {repeatedTestimonials.map((item, index) => (
                <div
                  key={`${item.client}-${index}`}
                  className="min-w-[320px] max-w-sm bg-white rounded-2xl border border-neutral-200 p-6 m-4"
                >
                  <p className="text-neutral-700 text-sm leading-relaxed mb-5">
                    “{item.testimonial}”
                  </p>

                  <div>
                    <p className="text-sm font-semibold text-black">
                      {item.client}
                    </p>
                    <p className="text-xs text-neutral-500">
                      {item.role}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default ClientTestimonials;
