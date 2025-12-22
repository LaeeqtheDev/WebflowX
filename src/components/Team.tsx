"use client";

import React from "react";
import { Carousel, Card } from "@/components/ui/apple-cards-carousel";

export function AppleCardsCarouselDemo() {
  const cards = data.map((card, index) => (
    <Card key={card.src} card={card} index={index} />
  ));

  return (
    <div className="w-full h-full py-10 px-4">
      {/* Centered heading for Meet the Team */}
      <div className="text-center mb-12 max-w-3xl mx-auto">
        <h1 className="text-3xl md:text-4xl font-bold text-black">
          Meet the Webflow<span className="text-6xl font-extrabold text-orange-500">X</span> <span>Team</span>
        </h1>
        <p className="mt-4 text-base md:text-lg text-gray-800">
          Our diverse team of developers, designers, and AI experts work
          together to create seamless collaboration experiences. Get to know
          the people behind WebflowX!
        </p>
      </div>

      {/* Carousel */}
      <Carousel items={cards} />
    </div>
  );
}

const DummyContent = () => {
  return (
    <>
      {[...new Array(1).fill(1)].map((_, index) => {
        return (
          <div
            key={"dummy-content" + index}
            className="bg-black dark:bg-neutral-800 p-8 md:p-14 rounded-3xl mb-4"
          >
            <p className="text-neutral-600 dark:text-black text-base md:text-2xl font-sans max-w-3xl mx-auto">
              <span className="font-bold text-black dark:text-black">
                The first rule of WebflowX club is that you talk about WebflowX
                club.
              </span>{" "}
              Collaborate seamlessly, jot down ideas, manage tasks, and capture
              every thought. Our tools are ready to empower your workflow.
            </p>
            <img
              src="https://assets.aceternity.com/macbook.png"
              alt="Macbook mockup from Aceternity UI"
              height="500"
              width="500"
              className="md:w-1/2 md:h-1/2 h-full w-full mx-auto object-contain"
            />
          </div>
        );
      })}
    </>
  );
};

const data = [
  {
    category: "CEO & Founder",
    title: "Larry.",
    src: "/Larry.jpg",
    content: <DummyContent />,
  },
  {
    category: "Co-Founder & CTO",
    title: "Shanel.",
    src: "/Shanel.jpg",
    content: <DummyContent />,
  },
  {
    category: "Co-Founder & CPO",
    title: "Rooj.",
    src: "/Rooj.jpg",
    content: <DummyContent />,
  },
  {
    category: "Lead Developer", 
    title: "Rozaine.",
    src: "/ali.jpg",
    content: <DummyContent />,
  },
  {
    category: "Lead Designer",
    title: "Ali.",
    src: "alireal.jpg",
    content: <DummyContent />,
  },
  {
    category: "Jonathan C.",
    title: "Ai Developer",
    src: "/01.jpg",
    content: <DummyContent />,
  },
];
