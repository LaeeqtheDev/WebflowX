"use client";

import React from "react";
import { Spotlight } from "@/components/ui/spotlight-new";

interface SpotlightHeaderProps {
  title: string;
  description?: string;
}

export function SpotlightHeader({
  title,
  description,
}: SpotlightHeaderProps) {
  return (
    <div className="relative w-full overflow-hidden py-10">
      <Spotlight />

      <div className="relative z-10 max-w-4xl mx-auto px-4 text-center">
        <h2 className="text-4xl md:text-6xl font-bold bg-clip-text text-transparent bg-linear-to-b from-neutral-900 to-gray-600">
          {title}
        </h2>

        {description && (
          <p className="mt-4 text-base md:text-lg text-neutral-400 max-w-2xl mx-auto">
            {description}
          </p>
        )}
      </div>
    </div>
  );
}
