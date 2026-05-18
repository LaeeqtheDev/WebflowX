"use client";

import React, { useEffect, useState } from "react";
import { Button } from "./ui/button";
import { HiArrowNarrowRight } from "react-icons/hi";

const Hero: React.FC = () => {
  const phrases = [
    "Build Amazing Products with Ease.",
    "Collaborate Seamlessly with your Team.",
    "Automate your Workflow and Save Time.",
    "Launch your Ideas to the World.",
  ];

  const [currentText, setCurrentText] = useState("");
  const [phraseIndex, setPhraseIndex] = useState(0);
  const [charIndex, setCharIndex] = useState(0);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const currentPhrase = phrases[phraseIndex];
    const speed = deleting ? 50 : 120;

    const timeout = setTimeout(() => {
      if (!deleting) {
        if (charIndex < currentPhrase.length) {
          setCurrentText(currentPhrase.slice(0, charIndex + 1));
          setCharIndex(charIndex + 1);
        } else {
          setDeleting(true);
        }
      } else {
        if (charIndex > 0) {
          setCurrentText(currentPhrase.slice(0, charIndex - 1));
          setCharIndex(charIndex - 1);
        } else {
          setDeleting(false);
          setPhraseIndex((phraseIndex + 1) % phrases.length);
        }
      }
    }, speed);

    return () => clearTimeout(timeout);
  }, [charIndex, deleting, phraseIndex, phrases]);

  return (
    <section className="" id="hero">
      {/* Background blobs */}
      <div className="pointer-events-none absolute -top-40 -left-40 w-120 h-120 bg-linear-to-br from-orange-400 to-yellow-200 rounded-full opacity-40 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-52 right-0 w-136 h-136 bg-linear-to-br from-orange-300 to-lime-200 rounded-full opacity-30 blur-3xl" />

      {/* Hero content */}
      <div className="container flex mx-auto px-4 md:px-16 py-10 md:py-14 relative z-10">
        <div className="flex flex-col md:flex-row items-center justify-between gap-8 md:gap-14">
          {/* Left */}
          <div className="flex-1 flex flex-col gap-4 md:gap-6">
            {/* Desktop: HARD-LOCKED container, Mobile: auto height */}
            <div className="min-h-[120px] md:h-28 flex items-center">
              <div className="md:w-[44ch] md:h-[20ch] md:overflow-hidden">
                <h1 className="text-3xl md:text-4xl lg:text-5xl font-extrabold leading-tight text-black">
                  {currentText}
                  <span className="blinking-cursor">|</span>
                </h1>
              </div>
            </div>

            <p className="text-base md:text-lg lg:text-xl text-gray-700 max-w-2xl leading-relaxed">
              The all-in-one productivity platform for creators and teams.
              <span className="inline-block mt-2 md:mt-0 md:ml-2 font-bold bg-black text-white px-2 py-1 rounded-md text-sm md:text-base">
                BUILD · COLLABORATE · AUTOMATE
              </span>{" "}
              <span className="hidden md:inline">your workflow like a pro.</span>
            </p>

            {/* Mobile: row buttons, Desktop: same as before */}
            <div className="flex flex-row md:flex-row gap-3 md:gap-4 mt-2 md:mt-4">
              <a href="/signup" className="flex-1 md:flex-none">
                <Button className="w-full flex items-center justify-center gap-2 bg-white border-3 border-black text-black hover:text-white hover:bg-black px-4 md:px-6 py-2.5 md:py-3 rounded-lg font-semibold cursor-pointer text-sm md:text-base">
                  Get Started Free <HiArrowNarrowRight size={20} className="hidden sm:block" />
                </Button>
              </a>

              <a href="#pricing" className="flex-1 md:flex-none">
                <Button
                  variant="outline"
                  className="w-full flex items-center justify-center gap-2 border-2 border-[#ff5018] text-orange-600 hover:bg-[#ff5018] hover:text-white px-4 md:px-6 py-2.5 md:py-3 rounded-lg font-semibold text-sm md:text-base"
                >
                  Learn More <HiArrowNarrowRight size={20} className="hidden sm:block" />
                </Button>
              </a>
            </div>
          </div>

          {/* Right */}
          <div className="flex-1 flex justify-center mt-6 md:mt-0">
            <img
              src="/extra.jpg"
              alt="Hero Dashboard"
              className="w-full max-w-md md:max-w-full object-cover rounded-2xl md:rounded-br-full"
            />
          </div>
        </div>
      </div>

      {/* Cursor animation */}
      <style jsx>{`
        .blinking-cursor {
          color: #ff6d24;
          animation: blink 1s infinite;
        }

        @keyframes blink {
          0%,
          100% {
            opacity: 1;
          }
          50% {
            opacity: 0;
          }
        }
      `}</style>
    </section>
  );
};

export default Hero;