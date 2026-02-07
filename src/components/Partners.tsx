"use client";

import Image from "next/image";
import React, { FC } from "react";

// Partner type
interface Partner {
  name: string;
  logo: string;
}

// Sample partner data
const partners: Partner[] = [
  { name: "TQL", logo: "/partner-1.jpg" },
  { name: "LANDSTAR", logo: "/partner-2.jpeg" },
  { name: "AXLE LOGISICS", logo: "/partner-3.png" },
  { name: "COYOTE LOGISICS", logo: "/partner-4.png" },
  { name: "CH ROBINSON", logo: "/partner-5.jpg" },
  { name: "XPO", logo: "/partner-6.jpg" },
];

// Duplicate for seamless scrolling
const repeatedPartners: Partner[] = [...partners, ...partners];

const Partners: FC = () => {
  return (
    <section className="py-12 overflow-hidden">
      {/* Heading */}
      <h2 className="text-center text-4xl font-bold mb-4 text-black">
        Our Partners
      </h2>

      {/* Description */}
      <p className="text-center text-lg text-gray-600 mb-8">
        We proudly collaborate with industry leaders to deliver exceptional solutions.
      </p>

      {/* Scrolling Logos */}
      <div className="overflow-hidden w-full relative">
        <div className="flex w-max animate-scroll">
          {repeatedPartners.map((partner, index) => (
            <div
              key={`${partner.name}-${index}`}
              className="flex-shrink-0 w-48 h-24 relative mx-4"
            >
              <Image
                src={partner.logo}
                alt={partner.name}
                fill
                className="object-contain grayscale hover:grayscale-0 transition duration-300"
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Partners;
