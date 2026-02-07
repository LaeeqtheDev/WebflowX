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
    <section className="relative w-full bg-black text-white py-20 flex flex-col items-center justify-center overflow-hidden">
      {/* Background floating shapes */}
      <div className="absolute top-0 left-1/2 w-[500px] h-[500px] bg-orange-500/20 rounded-full -translate-x-1/2 animate-pulse mix-blend-multiply blur-3xl"></div>
      <div className="absolute bottom-0 right-1/3 w-[400px] h-[400px] bg-indigo-500/10 rounded-full -translate-x-1/2 animate-pulse mix-blend-multiply blur-3xl"></div>

      <h2 className="text-3xl md:text-4xl font-bold z-10 text-center">
        Level Up Your WebflowX Experience
      </h2>
      <p className="text-gray-300 max-w-xl text-center mt-4 z-10">
        Get exclusive updates, new features, and early access to our latest releases.
      </p>

      {!submitted ? (
        <form
          onSubmit={handleSubmit}
          className="flex flex-col sm:flex-row items-center mt-8 gap-4 z-10 w-full max-w-xl"
        >
          <Input
            type="email"
            placeholder="Your email address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="flex-1 min-w-0"
          />
          <Button
            type="submit"
            className="bg-orange-500 hover:bg-orange-600 text-white font-semibold px-6 py-3 rounded-lg shadow-lg transform hover:scale-105 transition-all duration-300"
          >
            Subscribe
          </Button>
        </form>
      ) : (
        <p className="text-green-400 font-medium mt-6 z-10">
          🎉 Thanks for subscribing! Stay tuned.
        </p>
      )}

      <p className="text-gray-400 text-sm mt-4 z-10">
        We value your privacy. No spam. Unsubscribe anytime.
      </p>
    </section>
  );
};
