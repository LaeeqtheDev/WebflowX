"use client";

import React from "react";
import { WobbleCard } from "../components/ui/wobble-card";

export function WobbleCardDemo() {
  return (
    <div className="max-w-7xl mx-auto w-full px-4 mb-20">
      {/* Cards grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        
        {/* Card 1 - Pink */}
        <WobbleCard
          containerClassName="col-span-1 lg:col-span-2 h-full bg-pink-800 min-h-[500px] lg:min-h-[300px]"
        >
          <div className="max-w-xs relative z-10">
            <h2 className="text-left text-balance text-base md:text-xl lg:text-3xl font-semibold tracking-[-0.015em] text-white">
              WebflowX: Build Smarter, Together
            </h2>
            <p className="mt-4 text-left text-base/6 text-neutral-200">
              Empower your team with AI-driven collaboration, real-time editing, and seamless workflow management — all in one platform.
            </p>
          </div>
          <img
            src="hr2.png"
            width={500}
            height={500}
            alt="WebflowX demo image"
            className="absolute -right-4 lg:-right-[40%] grayscale filter -bottom-10 object-contain rounded-2xl opacity-30 md:opacity-100"
          />
        </WobbleCard>

        {/* Card 2 - Default */}
        <WobbleCard containerClassName="col-span-1 min-h-[300px]">
          <h2 className="max-w-80 text-left text-balance text-base md:text-xl lg:text-3xl font-semibold tracking-[-0.015em] text-white">
            Collaborate Without Limits
          </h2>
          <p className="mt-4 max-w-104 text-left text-base/6 text-neutral-200">
            Share ideas, assign tasks, and iterate faster with WebflowX — designed to keep teams aligned and productive.
          </p>
        </WobbleCard>

        {/* Card 3 - Blue */}
        <WobbleCard containerClassName="col-span-1 lg:col-span-3 bg-blue-900 min-h-[500px] lg:min-h-[600px] xl:min-h-[300px]">
          <div className="max-w-sm relative z-10">
            <h2 className="max-w-sm md:max-w-lg text-left text-balance text-base md:text-xl lg:text-3xl font-semibold tracking-[-0.015em] text-white">
              Start Your WebflowX Journey Today
            </h2>
            <p className="mt-4 max-w-104 text-left text-base/6 text-neutral-200">
              Experience the future of team productivity with WebflowX — AI-powered tools that help you plan, build, and launch faster than ever.
            </p>
          </div>
          <img
            src="/hr11.png"
            width={500}
            height={500}
            alt="WebflowX wrapper demo"
            className="absolute -right-10 md:-right-[40%] lg:-right-[20%] -bottom-10 object-contain rounded-2xl opacity-30 md:opacity-100"
          />
        </WobbleCard>
        
      </div>
    </div>
  );
}