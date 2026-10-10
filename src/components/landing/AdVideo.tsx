"use client";

import { useEffect, useRef, useState } from "react";
import { shouldAnimate } from "./gsap";

/**
 * Looping ad that starts muted; viewers can turn sound on. The file isn't downloaded until it is near the screen
 * (preload="none"), never starts by itself on a slow link or with data saver on, and shows a Play button whenever the
 * browser refuses to start it (battery saver, strict autoplay rules) instead of sitting on a still poster.
 */
export default function AdVideo() {
  const ref = useRef<HTMLVideoElement>(null);
  const [muted, setMuted] = useState(true);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);
    el.addEventListener("playing", onPlay);
    el.addEventListener("pause", onPause);
    const auto = shouldAnimate();
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          if (auto) el.play().catch(() => setPlaying(false));
        } else if (!el.paused) {
          el.pause();
        }
      },
      { rootMargin: "200px" },
    );
    io.observe(el);
    return () => {
      io.disconnect();
      el.removeEventListener("playing", onPlay);
      el.removeEventListener("pause", onPause);
    };
  }, []);

  const toggle = () => {
    const el = ref.current;
    if (!el) return;
    el.muted = !el.muted;
    setMuted(el.muted);
    if (!el.muted) el.play().catch(() => {});
  };

  const start = () => {
    ref.current?.play().catch(() => {});
  };

  return (
    <div className="relative">
      <video
        ref={ref}
        className="aspect-video w-full object-cover"
        loop
        muted
        playsInline
        preload="none"
        poster="/webflowx-ad-poster.webp"
        aria-label="Short ad showing WebflowX in use"
        src="/webflowx-ad.mp4"
      />
      {!playing && (
        <button
          type="button"
          onClick={start}
          aria-label="Play video"
          className="absolute inset-0 flex items-center justify-center bg-black/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
        >
          <span className="flex h-16 w-16 items-center justify-center rounded-full bg-[#ff5018] text-white shadow-lg">
            <svg viewBox="0 0 24 24" className="ml-1 h-7 w-7 fill-current" aria-hidden="true"><path d="M8 5v14l11-7z" /></svg>
          </span>
        </button>
      )}
      <button
        type="button"
        onClick={toggle}
        aria-pressed={!muted}
        className="absolute bottom-3 right-3 rounded-full bg-black/60 px-4 py-2 text-sm font-medium text-white backdrop-blur transition hover:bg-black/80 focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
      >
        {muted ? "Unmute" : "Mute"}
      </button>
    </div>
  );
}
