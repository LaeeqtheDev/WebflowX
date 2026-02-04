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

  const longestPhrase = "Collaborate Seamlessly with your Team.";

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
  }, [charIndex, deleting, phraseIndex]);

  return (
    <section className="">
      {/* Background blobs */}
      <div className="  pointer-events-none absolute -top-40 -left-40 w-120 h-120 bg-linear-to-br from-orange-400 to-yellow-200 rounded-full opacity-40 blur-3xl" />
      <div className="  pointer-events-none absolute -bottom-52 right-0 w-136 h-136 bg-linear-to-br from-orange-300 to-lime-200 rounded-full opacity-30 blur-3xl" />

      {/* Hero content */}
      <div className="container flex mx-auto px-4 md:px-16 py-10  md:py-14 relative z-10">
        <div className="flex flex-col md:flex-row items-center justify-between gap-14">
          {/* Left */}
          <div className="flex-1 flex flex-col gap-6">
            {/* HARD-LOCKED typing container */}
            <div className="h-28 flex items-center">
              <div className="w-[44ch] h-[20ch] overflow-hidden ">
                <h1 className="text-4xl md:text-5xl font-extrabold leading-tight text-black">
                  {currentText}
                  <span className="blinking-cursor">|</span>
                </h1>
              </div>
            </div>

            <p className="text-lg md:text-xl text-gray-700 max-w-2xl leading-relaxed">
              The all-in-one productivity platform for creators and teams.
              <span className="ml-2 font-bold bg-black text-white px-2 py-1 rounded-md">
                BUILD · COLLABORATE · AUTOMATE
              </span>{" "}
              your workflow like a pro.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 mt-4">
              <Button className="flex items-center gap-2 bg-white border-3 border-black text-black hover:text-white hover:bg-black px-6 py-3 rounded-lg font-semibold cursor-pointer">
                Get Started Free <HiArrowNarrowRight size={20} />
              </Button>

              <Button
                variant="outline"
                className="flex items-center gap-2 border-2 border-orange-500 text-orange-600 hover:bg-orange-500 hover:text-white px-6 py-3 rounded-lg font-semibold"
              >
                Learn More <HiArrowNarrowRight size={20} />
              </Button>
            </div>
          </div>

          {/* Right */}
          <div className="flex-1 flex justify-center">
            <img
              src="/extra.jpg"
              alt="Hero Dashboard"
              className="w-full object-cover rounded-br-full  "
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
