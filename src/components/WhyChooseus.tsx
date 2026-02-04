import React from "react";

const WhyChooseUs = () => {
  return (
    <div className="w-full mt-13 ">
      {/* Text Section */}
      <div className="text-center py-16 px-4 md:px-16 bg-white">
        <h1 className="text-5xl md:text-4xl font-extrabold text-black mb-2">
          Why Choose Us?
        </h1>
        <p className="text-lg md:text-xl text-gray-600 max-w-2xl mx-auto">
          Discover the power of WebflowX — streamlined workflows, smart {""}
         <span className="font-bold text-2xl bg-black text-white rounded-full items-center px-4">Collaboration</span> and a seamless experience that transforms your
          productivity.
        </p>
      </div>

      {/* Video Section */}
      <div className="relative w-full h-screen overflow-hidden">
        <video
          className="absolute top-0 left-0 w-full h-full object-cover"
          autoPlay
          loop
          muted
          playsInline
          src="/video.mp4" // replace with your video path
        />

        {/* Optional overlay */}
        <div className="absolute top-0 left-0 w-full h-full bg-black/80" />
      </div>
    </div>
  );
};

export default WhyChooseUs;
