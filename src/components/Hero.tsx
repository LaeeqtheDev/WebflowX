"use client";

import React, { useEffect, useState } from "react";
import { Button } from "./ui/button";
import { HiArrowNarrowRight } from "react-icons/hi";

const Hero: React.FC = () => {
  const phrases = [
    "Build amazing products with ease.",
    "Collaborate seamlessly with your team.",
    "Automate your workflow and save time.",
    "Launch your ideas to the world.",
  ];

  const [currentText, setCurrentText] = useState("");
  const [phraseIndex, setPhraseIndex] = useState(0);
  const [charIndex, setCharIndex] = useState(0);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const currentPhrase = phrases[phraseIndex];
    const speed = deleting ? 50 : 150;

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
    <section className="container w-full px-4 md:px-16 flex flex-col md:flex-row items-center justify-between py-20 md:py-48 gap-8 bg-orange-500/10 rounded-4xl shadow-sm mt-8">
      {/* Left Side Text */}
      <div className="flex-1 flex flex-col gap-6 overflow-hidden">
        {/* Fixed height container for phrases */}
        <div className="h-24 md:h-32 flex items-center">
          <h2
            className="text-4xl md:text-5xl font-extrabold tracking-wide leading-tight wrap-break-word w-full"
            style={{
              color: "transparent",
              WebkitTextStroke: "1px #FF6D24",
              wordWrap: "break-word",
              wordBreak: "break-word",
            }}
          >
            {currentText}
            <span className="blinking-cursor">|</span>
          </h2>
        </div>

        {/* Paragraph */}
        <p className="text-lg md:text-xl text-gray-900 max-w-full md:max-w-2xl wrap-break-word leading-relaxed">
  The all-in-one productivity platform for creators and teams. <span className="font-bold text-lg bg-red-400 py-1 rounded-lg text-white">BUILD
  COLLABORATE AUTOMATE </span>   your workflow like a pro. Stay organized, track
  progress effortlessly, and turn ideas into action seamlessly.
</p>


        {/* Buttons */}
        <div className="flex flex-col md:flex-row items-start md:items-center gap-4 mt-4">
          <Button className="flex items-center gap-2 text-white bg-orange-500 hover:bg-orange-600 px-6 py-3 rounded-lg font-semibold cursor-pointer">
            Get Started Free <HiArrowNarrowRight size={20} />
          </Button>
          <Button className="flex items-center gap-2 text-orange-500 bg-transparent border border-orange-500 hover:bg-orange-600 cursor-pointer hover:text-white px-6 py-3 rounded-lg font-semibold">
            Learn More <HiArrowNarrowRight size={20} />
          </Button>
        </div>
      </div>

      {/* Right Side Image */}
      <div className="flex-1 flex justify-center md:justify-end">
        <img
          src="/hero.png"
          alt="Hero Dashboard"
          className="w-full rounded-xl shadow-lg object-cover"
        />
      </div>

      {/* Cursor Animation */}
      <style jsx>{`
        .blinking-cursor {
          font-weight: 100;
          font-size: 1em;
          color: #ff6d24;
          animation: blink 1s infinite;
        }

        @keyframes blink {
          0% {
            opacity: 1;
          }
          50% {
            opacity: 0;
          }
          100% {
            opacity: 1;
          }
        }
      `}</style>
    </section>
  );
};

export default Hero;
