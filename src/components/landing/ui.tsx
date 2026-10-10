"use client";

import React, { useEffect, useRef } from "react";
import { MOTION_OK, whenGsap } from "./gsap";

export function Reveal({
  children,
  className = "",
  delay = 0,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    return whenGsap(({ gsap }) => {
    const mm = gsap.matchMedia();
    mm.add(MOTION_OK, () => {
      gsap.fromTo(
        el,
        { y: 28, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 0.9,
          delay: delay / 1000,
          ease: "power3.out",
          scrollTrigger: { trigger: el, start: "top 90%", once: true },
        }
      );
    });
    return () => mm.revert();
    }, el);
  }, [delay]);

  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}

export function Label({
  children,
  dark = false,
}: {
  children: React.ReactNode;
  dark?: boolean;
}) {
  return (
    <p
      className={`lp-label flex items-center gap-3 ${
        dark ? "text-white/55" : "text-[#381d2a]/60"
      }`}
    >
      <span className="h-px w-8 bg-[#ff5018]" />
      {children}
    </p>
  );
}

export function Heading({
  children,
  dark = false,
  className = "",
}: {
  children: React.ReactNode;
  dark?: boolean;
  className?: string;
}) {
  return (
    <h2
      className={`lp-h text-[2.5rem] sm:text-5xl md:text-[3.5rem] ${
        dark ? "text-white" : "text-[#1b1017]"
      } ${className}`}
    >
      {children}
    </h2>
  );
}
