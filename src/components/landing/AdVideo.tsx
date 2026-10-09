"use client";

import { useEffect, useRef, useState } from "react";

/** Looping ad that starts muted; viewers can turn sound on. Loads only when near the viewport. */
export default function AdVideo() {
  const ref = useRef<HTMLVideoElement>(null);
  const [muted, setMuted] = useState(true);
  const [src, setSrc] = useState<string | undefined>();

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setSrc((s) => s ?? "/webflowx-ad.mp4");
          el.play().catch(() => {});
        } else {
          el.pause();
        }
      },
      { rootMargin: "200px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const toggle = () => {
    const el = ref.current;
    if (!el) return;
    el.muted = !el.muted;
    setMuted(el.muted);
    if (!el.muted) el.play().catch(() => {});
  };

  return (
    <div className="relative">
      <video
        ref={ref}
        className="aspect-video w-full object-cover"
        autoPlay
        loop
        muted
        playsInline
        preload="none"
        poster="/webflowx-ad-poster.webp"
        aria-label="Short ad showing WebflowX in use"
        src={src}
      />
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
