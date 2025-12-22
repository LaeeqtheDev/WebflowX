"use client";

import React from "react";
import { SpotlightHeader } from "./ui/SpotlightHeader";
import { WobbleCardDemo } from "./WobbleCard";

export function FeaturesWobbleSection() {
  return (
    <section className="w-full container mt-20">
      
      {/* HEADER — OUTSIDE visual container */}
      <SpotlightHeader
        title="Built for Teams That Ship"
        description="Everything WebflowX provides is designed to reduce friction, accelerate execution, and scale collaboration."
      />

      {/* VISUAL CONTAINER — ONLY CARDS */}
      <div className="relative mt-16 rounded-3xl overflow-hidden border-2 drop-shadow-4xl">
        
        {/* Background blobs */}
        <div className="absolute inset-0 z-0 pointer-events-none">
          <div className="absolute -top-32 -left-32 w-125 h-125 bg-linear-to-br from-orange-500 to-[#b5b399] rounded-full opacity-30 blur-3xl" />
          <div className="absolute -bottom-40 -right-40 w-150 h-150 bg-linear-to-br from-orange-500 to-[#d8da72] rounded-full opacity-20 blur-3xl" />
        </div>

        {/* Cards */}
        <div className="relative z-10 py-20">
          <WobbleCardDemo />
        </div>
      </div>
    </section>
  );
}
