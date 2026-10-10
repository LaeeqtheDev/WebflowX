"use client";

import type gsapType from "gsap";
import type { ScrollTrigger as ScrollTriggerType } from "gsap/ScrollTrigger";
import { DATA_SAVER_KEY, isDataSaverPref, isLowData } from "@/lib/network";

export type Gsap = typeof gsapType;
export type ScrollTrigger = ScrollTriggerType;
export type GsapKit = { gsap: Gsap; ScrollTrigger: typeof ScrollTriggerType };

// Core animations always run (they are short, one-shot reveals).
// Looping and parallax effects check prefersReducedMotion() themselves.
export const MOTION_OK = "all";
export const prefersReducedMotion = () =>
  typeof window !== "undefined" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/** Animation is decoration. On a very slow link or with data saver on, the page stays still and loads ~44 KB less. */
export const shouldAnimate = () => {
  if (typeof window === "undefined") return false;
  let pref: "auto" | "on" | "off" = "auto";
  try {
    const v = window.localStorage.getItem(DATA_SAVER_KEY);
    if (isDataSaverPref(v)) pref = v;
  } catch { /* private mode */ }
  const conn = (navigator as Navigator & { connection?: { saveData?: boolean; effectiveType?: string; downlink?: number } }).connection;
  return !isLowData(conn, pref);
};

let kit: Promise<GsapKit> | null = null;
const loadGsap = () =>
  (kit ??= Promise.all([import("gsap"), import("gsap/ScrollTrigger")]).then(([g, s]) => {
    g.gsap.registerPlugin(s.ScrollTrigger);
    return { gsap: g.gsap, ScrollTrigger: s.ScrollTrigger };
  }));

/**
 * Runs `setup` once GSAP has loaded (a separate chunk, so it never blocks first paint) and returns the cleanup for useEffect.
 * Does nothing at all when animation is switched off; the page is complete without it.
 * Pass `near` for something below the fold: setup then waits until it is within 700px of the screen, so the phone isn't
 * building every section's scroll animations while it is still trying to show the first one.
 */
export const whenGsap = (setup: (k: GsapKit) => void | (() => void), near?: Element | null): (() => void) => {
  if (!shouldAnimate()) return () => {};
  let dead = false;
  let undo: void | (() => void);
  let io: IntersectionObserver | undefined;
  const go = () => {
    loadGsap().then((k) => {
      if (!dead) undo = setup(k);
    }, () => {});
  };
  if (near && typeof IntersectionObserver !== "undefined") {
    io = new IntersectionObserver((entries) => {
      if (entries.some((e) => e.isIntersecting)) {
        io?.disconnect();
        go();
      }
    }, { rootMargin: "700px 0px" });
    io.observe(near);
  } else {
    go();
  }
  return () => {
    dead = true;
    io?.disconnect();
    if (typeof undo === "function") undo();
  };
};
