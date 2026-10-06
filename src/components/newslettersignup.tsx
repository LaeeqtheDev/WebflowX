import React from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Reveal } from "./landing/ui";
import { wrap } from "./landing/tokens";

export const NewsletterSignup = () => (
  <section className="w-full bg-[#ff5018] py-20 md:py-28">
    <div className={`${wrap} flex flex-col items-start justify-between gap-10 md:flex-row md:items-end`}>
      <Reveal>
        <h2 className="lp-h max-w-2xl text-4xl text-white sm:text-5xl md:text-6xl">
          Bring your team into one workspace.
        </h2>
        <p className="mt-5 max-w-md text-lg text-white/85">
          Start on the free plan and upgrade when your team needs more room.
        </p>
      </Reveal>
      <Link
        href="/auth"
        className="inline-flex items-center gap-2 rounded-md bg-[#381d2a] px-8 py-4 text-[15px] font-semibold text-white transition-colors hover:bg-[#1b1017]"
      >
        Start free <ArrowRight className="h-4 w-4" />
      </Link>
    </div>
  </section>
);
