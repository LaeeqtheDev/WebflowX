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
    <section className="py-12 md:py-16 lg:py-20 bg-white overflow-x-hidden w-full">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 overflow-x-hidden">
        {/* Header */}
        <header className="text-center mb-10 md:mb-14">
          <div className="flex items-center justify-center gap-2 sm:gap-3 mb-3 flex-wrap">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-black">
              Teams Building with
            </h2>
            <img
              src="/logo.png"
              alt="Webflow logo"
              className="h-16 w-16 sm:h-20 sm:w-20 md:h-24 md:w-24 object-contain -ml-2 sm:-ml-4 md:-ml-6"
            />
          </div>
          <p className="text-sm sm:text-base text-neutral-600 max-w-2xl mx-auto px-4">
            Early users, real feedback, and lessons learned while building WebflowX
            in production environments.
          </p>
        </header>

        <div className="flex flex-col md:flex-row items-center gap-8 md:gap-12 w-full overflow-x-hidden">
          {/* Left: Image */}
          <div className="relative w-full md:w-1/2 h-56 sm:h-72 md:h-96 lg:h-105 flex-shrink-0 overflow-hidden">
            <Image
              src="/clients.png"
              alt="Teams using WebflowX"
              fill
              className="object-cover rounded-xl md:rounded-2xl shadow-lg"
              priority
            />
          </div>

          {/* Right: Marquee */}
          <div className="w-full md:w-1/2 overflow-x-hidden flex-shrink-0">
            <div className="flex w-max animate-scroll-webflowx">
              {repeatedTestimonials.map((item, index) => (
                <div
                  key={`${item.client}-${index}`}
                  className="min-w-[280px] sm:min-w-[320px] max-w-sm bg-white rounded-xl md:rounded-2xl border border-neutral-200 shadow-sm hover:shadow-md transition-shadow p-5 sm:p-6 m-3 sm:m-4"
                >
                  <p className="text-neutral-700 text-sm sm:text-base leading-relaxed mb-4 sm:mb-5">
                    "{item.testimonial}"
                  </p>

                  <div>
                    <p className="text-sm sm:text-base font-semibold text-black">
                      {item.client}
                    </p>
                    <p className="text-xs sm:text-sm text-neutral-500">
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