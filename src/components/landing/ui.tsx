"use client";

import React, { useEffect, useRef } from "react";
import { prefersReducedMotion, shouldAnimate } from "./gsap";

/**
 * Scroll reveal without an animation library: an IntersectionObserver adds a class and CSS does the motion
 * (opacity + transform only, so it stays on the GPU). Things already on screen when the page loads are never
 * hidden, so the page reads fine before scripts run, for search engines, and with reduced motion or data saver on.
 * `variant`: "up" (default), "scale" (cards), "blur" (big headings), "left".
 */
export function Reveal({
  children,
  className = "",
  delay = 0,
  variant = "up",
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  variant?: "up" | "scale" | "blur" | "left";
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined" || !shouldAnimate() || prefersReducedMotion()) return;
    // already visible: leave it alone (no flash)
    if (el.getBoundingClientRect().top < window.innerHeight * 0.92) return;
    el.classList.add("lp-rv-wait");
    const io = new IntersectionObserver((entries) => {
      if (!entries.some((e) => e.isIntersecting)) return;
      io.disconnect();
      el.classList.add("lp-rv-in");
    }, { rootMargin: "0px 0px -8% 0px" });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div ref={ref} data-rv={variant} className={`lp-rv ${className}`} style={delay ? ({ "--rv-d": `${delay}ms` } as React.CSSProperties) : undefined}>
      {children}
    </div>
  );
}

/** Counts a number up from zero the first time it scrolls into view ("100+" keeps its "+"). */
export function CountUp({ value, className = "" }: { value: string; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const el = ref.current;
    // only plain counts ("68", "100+"), never dates or words
    const m = /^()(\d[\d,]*)(\D{0,2})$/.exec(value);
    if (!el || !m || typeof IntersectionObserver === "undefined" || !shouldAnimate() || prefersReducedMotion()) return;
    const target = Number(m[2].replace(/,/g, ""));
    let raf = 0;
    const io = new IntersectionObserver((entries) => {
      if (!entries.some((e) => e.isIntersecting)) return;
      io.disconnect();
      const t0 = performance.now();
      const tick = (t: number) => {
        const p = Math.min(1, (t - t0) / 1400);
        const eased = 1 - Math.pow(1 - p, 3);
        el.textContent = `${m[1]}${Math.round(target * eased).toLocaleString("en-US")}${m[3]}`;
        if (p < 1) raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
    }, { threshold: 0.6 });
    io.observe(el);
    return () => { io.disconnect(); cancelAnimationFrame(raf); };
  }, [value]);
  return <span ref={ref} className={className}>{value}</span>;
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
