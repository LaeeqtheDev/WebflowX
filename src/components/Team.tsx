"use client";

import React from "react";
import { Carousel, Card } from "@/components/ui/apple-cards-carousel";

export function AppleCardsCarouselDemo() {
  const cards = data.map((card, index) => (
    <Card key={card.src} card={card} index={index} />
  ));

  return (
    <div id="team" className="w-full h-full py-10 px-4">
      <div className="text-center mb-12 max-w-3xl mx-auto">
        <h1 className="text-3xl md:text-4xl font-bold text-black dark:text-white flex items-center justify-center gap-2">
          Meet the Founders of Webflow{" "}
          <span className="inline-flex items-center justify-center -ml-5">
            <img 
              src="/logo.png" 
              alt="WebflowX Logo" 
              className="h-20 w-20 object-contain" 
            />
          </span>
        </h1>
        <p className="mt-4 text-base md:text-lg text-gray-800 dark:text-gray-300">
          Our diverse team of developers, designers, and AI experts work
          together to create seamless collaboration experiences.
        </p>
      </div>
      <Carousel items={cards} />
    </div>
  );
}

// Simple bio for co-founders
const BioContent = ({ name, bio }: { name: string; bio: string }) => {
  return (
    <div className="bg-[#F5F5F7] dark:bg-neutral-800 p-8 md:p-14 rounded-3xl mb-4">
      <p className="text-neutral-600 dark:text-neutral-400 text-base md:text-2xl font-sans max-w-3xl mx-auto">
        <span className="font-bold text-neutral-700 dark:text-neutral-200">
          About {name}: 
        </span>{" "}
        {bio}
      </p>
    </div>
  );
};

// Detailed bio for Laeeq
const LaeeqDetailedBio = () => {
  return (
    <div className="bg-gradient-to-br from-[#F5F5F7] to-white dark:from-neutral-800 dark:to-neutral-900 p-4 sm:p-6 md:p-10 rounded-2xl md:rounded-3xl mb-4 max-h-[80vh] overflow-y-auto">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-6 md:mb-8">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-black dark:text-white mb-2">
            Syed Laeeq Ahmed
          </h2>
          <p className="text-base sm:text-lg md:text-xl text-orange-600 dark:text-orange-400 font-semibold">
            CEO & Founder of WebflowX
          </p>
          <p className="text-xs sm:text-sm md:text-base text-neutral-600 dark:text-neutral-400 mt-2 px-2">
            Frontend-Led Full Stack Engineer | Next.js · TypeScript · React · Convex
          </p>
        </div>

        {/* About */}
        <div className="mb-6 md:mb-8">
          <h3 className="text-xl sm:text-2xl font-bold text-black dark:text-white mb-3 md:mb-4 flex items-center gap-2">
            <span className="w-1 h-5 md:h-6 bg-orange-500 rounded-full"></span>
            About
          </h3>
          <p className="text-neutral-700 dark:text-neutral-300 leading-relaxed text-sm sm:text-base">
            In 5+ years of full stack engineering, I've cut CI build times by 45%, reduced API latency by 30%, 
            and shrunk frontend bundle sizes by 28% — across production B2B SaaS platforms serving real mid-market clients.
          </p>
          <p className="text-neutral-700 dark:text-neutral-300 leading-relaxed text-sm sm:text-base mt-3">
            I specialize in frontend-led full stack architecture using Next.js, TypeScript, React, and Node.js — 
            building multi-tenant systems, real-time dashboards, and role-based access controls that scale cleanly.
          </p>
        </div>

        {/* Key Highlights */}
        <div className="mb-6 md:mb-8">
          <h3 className="text-xl sm:text-2xl font-bold text-black dark:text-white mb-3 md:mb-4 flex items-center gap-2">
            <span className="w-1 h-5 md:h-6 bg-orange-500 rounded-full"></span>
            Key Highlights
          </h3>
          <div className="grid grid-cols-2 gap-3 md:gap-4">
            <div className="bg-white dark:bg-neutral-700 p-3 md:p-4 rounded-lg md:rounded-xl border border-orange-200 dark:border-orange-800">
              <p className="text-xl sm:text-2xl font-bold text-orange-600 dark:text-orange-400">45%</p>
              <p className="text-xs sm:text-sm text-neutral-600 dark:text-neutral-300">CI Build Time Reduction</p>
            </div>
            <div className="bg-white dark:bg-neutral-700 p-3 md:p-4 rounded-lg md:rounded-xl border border-orange-200 dark:border-orange-800">
              <p className="text-xl sm:text-2xl font-bold text-orange-600 dark:text-orange-400">30%</p>
              <p className="text-xs sm:text-sm text-neutral-600 dark:text-neutral-300">API Latency Improvement</p>
            </div>
            <div className="bg-white dark:bg-neutral-700 p-3 md:p-4 rounded-lg md:rounded-xl border border-orange-200 dark:border-orange-800">
              <p className="text-xl sm:text-2xl font-bold text-orange-600 dark:text-orange-400">28%</p>
              <p className="text-xs sm:text-sm text-neutral-600 dark:text-neutral-300">Frontend Bundle Size Reduction</p>
            </div>
            <div className="bg-white dark:bg-neutral-700 p-3 md:p-4 rounded-lg md:rounded-xl border border-orange-200 dark:border-orange-800">
              <p className="text-xl sm:text-2xl font-bold text-orange-600 dark:text-orange-400">5+ Years</p>
              <p className="text-xs sm:text-sm text-neutral-600 dark:text-neutral-300">Full Stack Experience</p>
            </div>
          </div>
        </div>

        {/* Core Stack */}
        <div className="mb-6 md:mb-8">
          <h3 className="text-xl sm:text-2xl font-bold text-black dark:text-white mb-3 md:mb-4 flex items-center gap-2">
            <span className="w-1 h-5 md:h-6 bg-orange-500 rounded-full"></span>
            Core Stack
          </h3>
          <div className="flex flex-wrap gap-2">
            {['Next.js', 'React', 'TypeScript', 'Node.js', 'Convex', 'Multi-tenant SaaS', 'RBAC', 'Real-time Systems', 'AI Integration', 'CI/CD', 'Jest', 'Playwright', 'ShadCN', 'Tailwind'].map(tech => (
              <span key={tech} className="px-2.5 py-1 sm:px-3 sm:py-1.5 bg-orange-100 dark:bg-orange-900 text-orange-700 dark:text-orange-300 rounded-full text-xs sm:text-sm font-medium">
                {tech}
              </span>
            ))}
          </div>
        </div>

        {/* Experience Highlights */}
        <div className="mb-6 md:mb-8">
          <h3 className="text-xl sm:text-2xl font-bold text-black dark:text-white mb-3 md:mb-4 flex items-center gap-2">
            <span className="w-1 h-5 md:h-6 bg-orange-500 rounded-full"></span>
            Experience Highlights
          </h3>
          <div className="space-y-3 md:space-y-4">
            <div className="bg-white dark:bg-neutral-700 p-3 sm:p-4 md:p-5 rounded-lg md:rounded-xl border-l-4 border-orange-500">
              <h4 className="font-bold text-black dark:text-white text-sm sm:text-base md:text-lg">WebflowX - Full Stack Engineer</h4>
              <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400 mb-2">Oct 2025 - Present</p>
              <ul className="text-xs sm:text-sm md:text-base text-neutral-700 dark:text-neutral-300 space-y-1 list-disc list-inside">
                <li>Architected multi-tenant SaaS system from scratch</li>
                <li>Built real-time chat and video calling with WebRTC</li>
                <li>Integrated OpenAI and Gemini for AI-powered summaries</li>
                <li>Implemented organization-level RBAC and data isolation</li>
              </ul>
            </div>

            <div className="bg-white dark:bg-neutral-700 p-3 sm:p-4 md:p-5 rounded-lg md:rounded-xl border-l-4 border-blue-500">
              <h4 className="font-bold text-black dark:text-white text-sm sm:text-base md:text-lg">Nexora Systems - Full Stack Engineer</h4>
              <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400 mb-2">Jul 2024 - Oct 2025</p>
              <ul className="text-xs sm:text-sm md:text-base text-neutral-700 dark:text-neutral-300 space-y-1 list-disc list-inside">
                <li>Cut CI build times by 45%</li>
                <li>Reduced API latency by 25-30% with GraphQL</li>
                <li>Built shared UI library adopted across 8+ modules</li>
                <li>Established automated testing with Playwright + Jest</li>
              </ul>
            </div>

            <div className="bg-white dark:bg-neutral-700 p-3 sm:p-4 md:p-5 rounded-lg md:rounded-xl border-l-4 border-green-500">
              <h4 className="font-bold text-black dark:text-white text-sm sm:text-base md:text-lg">InvoiceStock - Full Stack Engineer</h4>
              <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400 mb-2">Jul 2022 - Jun 2024</p>
              <ul className="text-xs sm:text-sm md:text-base text-neutral-700 dark:text-neutral-300 space-y-1 list-disc list-inside">
                <li>Reduced frontend bundle size by 28%</li>
                <li>Architected multi-tenant RBAC system</li>
                <li>Built end-to-end invoicing workflows</li>
                <li>Streamlined CI/CD pipelines</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Projects */}
        <div className="mb-6 md:mb-8">
          <h3 className="text-xl sm:text-2xl font-bold text-black dark:text-white mb-3 md:mb-4 flex items-center gap-2">
            <span className="w-1 h-5 md:h-6 bg-orange-500 rounded-full"></span>
            Featured Projects
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
            <div className="bg-white dark:bg-neutral-700 p-3 md:p-4 rounded-lg md:rounded-xl">
              <h4 className="font-bold text-black dark:text-white mb-2 text-sm sm:text-base">AI Resume Analyzer</h4>
              <p className="text-xs sm:text-sm text-neutral-600 dark:text-neutral-400">
                ATS scoring & AI-powered improvement tool built with Claude AI and NLP intelligence
              </p>
            </div>
            <div className="bg-white dark:bg-neutral-700 p-3 md:p-4 rounded-lg md:rounded-xl">
              <h4 className="font-bold text-black dark:text-white mb-2 text-sm sm:text-base">LLM-SaaS</h4>
              <p className="text-xs sm:text-sm text-neutral-600 dark:text-neutral-400">
                AI-powered learning management system with OpenAI and Vapi voice tutors
              </p>
            </div>
          </div>
        </div>

        {/* Education */}
        <div className="mb-6 md:mb-8">
          <h3 className="text-xl sm:text-2xl font-bold text-black dark:text-white mb-3 md:mb-4 flex items-center gap-2">
            <span className="w-1 h-5 md:h-6 bg-orange-500 rounded-full"></span>
            Education
          </h3>
          <div className="space-y-3">
            <div className="bg-white dark:bg-neutral-700 p-3 md:p-4 rounded-lg md:rounded-xl border-l-4 border-purple-500">
              <h4 className="font-bold text-black dark:text-white text-sm sm:text-base">The University of Lahore</h4>
              <p className="text-xs sm:text-sm text-neutral-600 dark:text-neutral-400">
                Bachelor of Science - BS, Computer Science
              </p>
              <p className="text-xs text-neutral-500 dark:text-neutral-500 mt-1">August 2022 - May 2026</p>
            </div>
            <div className="bg-white dark:bg-neutral-700 p-3 md:p-4 rounded-lg md:rounded-xl border-l-4 border-blue-500">
              <h4 className="font-bold text-black dark:text-white text-sm sm:text-base">British Council</h4>
              <p className="text-xs sm:text-sm text-neutral-600 dark:text-neutral-400">
                A levels, Computer Science
              </p>
              <p className="text-xs text-neutral-500 dark:text-neutral-500 mt-1">August 2018 - August 2021</p>
            </div>
            <div className="bg-white dark:bg-neutral-700 p-3 md:p-4 rounded-lg md:rounded-xl border-l-4 border-teal-500">
              <h4 className="font-bold text-black dark:text-white text-sm sm:text-base">British Council</h4>
              <p className="text-xs sm:text-sm text-neutral-600 dark:text-neutral-400">
                O levels, Engineering
              </p>
              <p className="text-xs text-neutral-500 dark:text-neutral-500 mt-1">March 2016 - August 2018</p>
            </div>
          </div>
        </div>

        {/* Certifications */}
        <div className="mb-6 md:mb-8">
          <h3 className="text-xl sm:text-2xl font-bold text-black dark:text-white mb-3 md:mb-4 flex items-center gap-2">
            <span className="w-1 h-5 md:h-6 bg-orange-500 rounded-full"></span>
            Certifications
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 md:gap-3">
            {['React: Software Architecture', 'AI for App Building', 'JavaScript Specialist', 'AI Fundamentals', 'Problem Solving (Intermediate)'].map(cert => (
              <div key={cert} className="bg-white dark:bg-neutral-700 p-2.5 md:p-3 rounded-lg border border-orange-100 dark:border-orange-900">
                <p className="text-xs sm:text-sm text-neutral-700 dark:text-neutral-300 font-medium">✓ {cert}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Contact */}
        <div className="pt-4 md:pt-6 border-t border-neutral-200 dark:border-neutral-700">
          <div className="text-center mb-3">
            <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400">
              📍 37-A TNT Abpara Housing Society, Lahore, Pakistan
            </p>
            <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400 mt-1">
              📱 +92 923 324 265 921
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3 text-xs sm:text-sm px-2">
            <a 
              href="mailto:laeeqthedev@gmail.com" 
              className="text-neutral-600 dark:text-neutral-400 hover:text-orange-600 dark:hover:text-orange-400 transition-colors"
            >
              📧 Email
            </a>
            <span className="text-neutral-400">·</span>
            <a 
              href="https://laeeqthedevportfolio.vercel.app" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-neutral-600 dark:text-neutral-400 hover:text-orange-600 dark:hover:text-orange-400 transition-colors"
            >
              🌐 Portfolio
            </a>
            <span className="text-neutral-400">·</span>
            <a 
              href="https://www.linkedin.com/in/syed-laeeq-ahmed" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-neutral-600 dark:text-neutral-400 hover:text-orange-600 dark:hover:text-orange-400 transition-colors"
            >
              💼 LinkedIn
            </a>
            <span className="text-neutral-400">·</span>
            <a 
              href="https://github.com/LaeeqtheDev" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-neutral-600 dark:text-neutral-400 hover:text-orange-600 dark:hover:text-orange-400 transition-colors"
            >
              💻 GitHub
            </a>
            <span className="text-neutral-400">·</span>
            <a 
              href="https://www.behance.net/laeeqthedevdesigner" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-neutral-600 dark:text-neutral-400 hover:text-orange-600 dark:hover:text-orange-400 transition-colors"
            >
              🎨 Behance
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};

// Data items
const data = [
  {
    category: "CEO & Founder",
    title: "Laeeq.",
    src: "/av3.jpg",
    content: <LaeeqDetailedBio />,
  },
  {
    category: "Co-Founder & CTO",
    title: "Shanzay.",
    src: "/shanzay.jpg",
    content: (
      <BioContent 
        name="Shanzay" 
        bio="She leads the engineering team, architecting high-performance solutions and ensuring that our AI integrations remain at the cutting edge of technology." 
      />
    ),
  },
  {
    category: "Co-Founder & CPO",
    title: "Arooj.",
    src: "/arooj2.jpg",
    content: (
      <BioContent 
        name="Arooj" 
        bio="She is dedicated to the user experience, meticulously designing every interaction to ensure WebflowX is as intuitive as it is powerful." 
      />
    ),
  }
];