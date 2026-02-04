"use client";

import React from "react";
import { Carousel, Card } from "@/components/ui/apple-cards-carousel";

export function AppleCardsCarouselDemo() {
  const cards = data.map((card, index) => (
    <Card key={card.src} card={card} index={index} />
  ));

  return (
    <div className="w-full h-full py-10 px-4">
      <div className="text-center mb-12 max-w-3xl mx-auto">
        <h1 className="text-3xl md:text-4xl font-bold text-black dark:text-white flex items-center justify-center gap-2">
          Meet the Founders of Webflow{" "}
          <span className="inline-flex items-center justify-center -ml-5">
            <img 
              src="/logo.png" 
              alt="WebflowX Logo" 
              className="h-20 w-20 object-contain" 
            />
          </span>
        </h1>
        <p className="mt-4 text-base md:text-lg text-gray-800 dark:text-gray-300">
          Our diverse team of developers, designers, and AI experts work
          together to create seamless collaboration experiences.
        </p>
      </div>
      <Carousel items={cards} />
    </div>
  );
}

// 1. Updated BioContent to accept dynamic text
const BioContent = ({ name, bio }: { name: string; bio: string }) => {
  return (
    <div className="bg-[#F5F5F7] dark:bg-neutral-800 p-8 md:p-14 rounded-3xl mb-4">
      <p className="text-neutral-600 dark:text-neutral-400 text-base md:text-2xl font-sans max-w-3xl mx-auto">
        <span className="font-bold text-neutral-700 dark:text-neutral-200">
          About {name}: 
        </span>{" "}
        {bio}
      </p>
      {/* Image removed as requested */}
    </div>
  );
};

// 2. Data items now pass unique content to BioContent
const data = [
  {
    category: "CEO & Founder",
    title: "Laeeq.",
    src: "/av3.jpg",
    content: (
      <BioContent 
        name="Laeeq" 
        bio=" He is the visionary behind WebflowX, focusing on scaling the platform's reach and ensuring our mission of seamless collaboration is met across the globe." 
      />
    ),
  },
  {
    category: "Co-Founder & CTO",
    title: "Shanzay.",
    src: "/shanzay.jpg",
    content: (
      <BioContent 
        name="Shanzay" 
        bio="She leads the engineering team, architecting high-performance solutions and ensuring that our AI integrations remain at the cutting edge of technology." 
      />
    ),
  },
  {
    category: "Co-Founder & CPO",
    title: "Arooj.",
    src: "/arooj2.jpg",
    content: (
      <BioContent 
        name="Arooj" 
        bio="She is dedicated to the user experience, meticulously designing every interaction to ensure WebflowX is as intuitive as it is powerful." 
      />
    ),
  }
];