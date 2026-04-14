import React from "react";

const WhyChooseUs = () => {
  return (
    <div  className="w-full mt-8 md:mt-13">
      {/* Text Section */}
      <div className="text-center py-12 md:py-16 px-4 md:px-16 bg-white">
        <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-black mb-3 md:mb-4">
          Why Choose Us?
        </h1>
        <p className="text-base sm:text-lg md:text-xl text-gray-600 max-w-2xl mx-auto leading-relaxed">
          Discover the power of WebflowX — streamlined workflows, smart{" "}
          <span className="inline-block font-bold text-lg sm:text-xl md:text-2xl bg-black text-white rounded-full px-3 md:px-4 py-0.5 md:py-1 mx-1">
            Collaboration
          </span>{" "}
          and a seamless experience that transforms your productivity.
        </p>
      </div>

      {/* Video Section */}
      <div className="relative w-full h-[50vh] sm:h-[60vh] md:h-[70vh] lg:h-screen overflow-hidden">
        <video
          className="absolute top-0 left-0 w-full h-full object-cover"
          autoPlay
          loop
          muted
          playsInline
          src="/video.mp4"
        />

        {/* Overlay */}
        <div className="absolute top-0 left-0 w-full h-full bg-black/80" />
      </div>
    </div>
  );
};

export default WhyChooseUs;