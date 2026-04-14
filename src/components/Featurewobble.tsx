"use client";

import React from "react";
import { SpotlightHeader } from "./ui/SpotlightHeader";
import { WobbleCardDemo } from "./WobbleCard";

export function FeaturesWobbleSection() {
  return (
    <section className="w-full relative overflow-hidden mt-12 md:mt-20">
      {/* Background blobs (page-level, not boxed) */}
      {/* <div className="pointer-events-none absolute -top-40 -left-40 w-[28rem] h-[28rem] bg-gradient-to-br from-orange-400 to-yellow-200 rounded-full opacity-40 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-56 -right-56 w-[34rem] h-[34rem] bg-gradient-to-br from-orange-300 to-lime-200 rounded-full opacity-30 blur-3xl" /> */}

      <div className="w-full mx-auto px-4 md:px-8 lg:px-16 relative z-10">
        {/* HEADER */}
        <SpotlightHeader
          title="Built for Teams That Ship"
          description="Everything WebflowX provides is designed to reduce friction, accelerate execution, and scale collaboration."
        />

        {/* Cards only — no box, no shadow */}
        <div className="mt-12 md:mt-16 lg:mt-20">
          <WobbleCardDemo />
        </div>
      </div>
    </section>
  );
}