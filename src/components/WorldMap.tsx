"use client";

import React from "react";
import WorldMap from "@/components/ui/world-map";
import { motion } from "motion/react";

interface WorldMapSectionProps {
  title?: string;
  description?: string;
}

export function WorldMapSection({
  title = "Remote Connectivity",
  description = "Break free from traditional boundaries. Work from anywhere with WebflowX — better collaboration than Discord, Notion, or any other tool.",
}: WorldMapSectionProps) {
  return (
    <section className="py-10 w-full bg-white dark:bg-black relative overflow-hidden container">
      {/* Heading */}
      <div className="max-w-7xl mx-auto text-center px-4">
        <h2 className="text-4xl md:text-6xl font-bold text-black dark:text-white bg-clip-text bg-linear-to-b from-neutral-50 to-neutral-400">
          {title.split(" ").map((word, idx) => (
            <motion.span
              key={idx}
              className="inline-block mr-1"
              initial={{ y: -10, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.4, delay: idx * 0.05 }}
            >
              {word}
            </motion.span>
          ))}
        </h2>
        <p className="mt-4 text-base md:text-lg text-neutral-500 dark:text-neutral-400 max-w-2xl mx-auto">
          {description}
        </p>
      </div>

      {/* Decorative background gradients */}


      {/* World Map */}
      <div className="mt-20 relative z-10 container">
        <WorldMap
          lineColor="#f97316"
          dots={[
            { start: { lat: 37.7749, lng: -122.4194 }, end: { lat: 51.5074, lng: -0.1278 } }, // SF -> London
            { start: { lat: 51.5074, lng: -0.1278 }, end: { lat: 28.6139, lng: 77.209 } },     // London -> New Delhi
            { start: { lat: 28.6139, lng: 77.209 }, end: { lat: -33.8688, lng: 151.2093 } },   // New Delhi -> Sydney
            { start: { lat: 40.7128, lng: -74.006 }, end: { lat: 35.6895, lng: 139.6917 } },   // NYC -> Tokyo
            { start: { lat: 34.0522, lng: -118.2437 }, end: { lat: 1.3521, lng: 103.8198 } },  // LA -> Singapore
          ]}
        />
      </div>
    </section>
  );
}

export default WorldMapSection;
