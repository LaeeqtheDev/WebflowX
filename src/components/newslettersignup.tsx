"use client"
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export const NewsletterSignup = () => {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log("Email submitted:", email);
    setSubmitted(true);
    setEmail("");
  };

  return (
    <section className="relative w-full bg-black text-white py-12 sm:py-16 md:py-20 flex flex-col items-center justify-center overflow-hidden">
      {/* Background floating shapes */}
      <div className="absolute top-0 left-1/2 w-[300px] h-[300px] sm:w-[400px] sm:h-[400px] md:w-[500px] md:h-[500px] bg-orange-500/20 rounded-full -translate-x-1/2 animate-pulse mix-blend-multiply blur-3xl"></div>
      <div className="absolute bottom-0 right-1/3 w-[250px] h-[250px] sm:w-[300px] sm:h-[300px] md:w-[400px] md:h-[400px] bg-indigo-500/10 rounded-full -translate-x-1/2 animate-pulse mix-blend-multiply blur-3xl"></div>

      <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold z-10 text-center px-4">
        Level Up Your WebflowX Experience
      </h2>
      <p className="text-sm sm:text-base text-gray-300 max-w-xl text-center mt-3 sm:mt-4 z-10 px-4">
        Get exclusive updates, new features, and early access to our latest releases.
      </p>

      {!submitted ? (
        <form
          onSubmit={handleSubmit}
          className="flex flex-col sm:flex-row items-stretch sm:items-center mt-6 sm:mt-8 gap-3 sm:gap-4 z-10 w-full max-w-xl px-4"
        >
          <Input
            type="email"
            placeholder="Your email address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="flex-1 min-w-0 h-11 sm:h-12"
          />
          <Button
            type="submit"
            className="w-full sm:w-auto bg-[#ff5018] hover:bg-[#ff5018]/90 text-white font-semibold px-6 py-3 rounded-lg shadow-lg transform hover:scale-105 transition-all duration-300"
          >
            Subscribe
          </Button>
        </form>
      ) : (
        <p className="text-green-400 font-medium mt-6 z-10 text-sm sm:text-base px-4 text-center">
          🎉 Thanks for subscribing! Stay tuned.
        </p>
      )}

      <p className="text-gray-400 text-xs sm:text-sm mt-3 sm:mt-4 z-10 px-4 text-center">
        We value your privacy. No spam. Unsubscribe anytime.
      </p>
    </section>
  );
};