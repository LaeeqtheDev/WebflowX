"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { Check } from "lucide-react";

const PricingSection = () => {
  const plans = [
    {
      name: "Free",
      price: "$0",
      period: "forever",
      description: "Perfect for small teams getting started",
      features: [
        "Up to 5 team members",
        "Basic chat and messaging",
        "5 GB file storage",
        "Task management",
        "Mobile app access",
      ],
      cta: "Get Started",
      ctaLink: "/signup",
      popular: false,
    },
    {
      name: "Pro",
      price: "$12",
      period: "per user/month",
      description: "For growing teams that need more power",
      features: [
        "Unlimited team members",
        "Advanced chat features",
        "100 GB file storage",
        "AI meeting summaries",
        "Video calling",
        "Priority support",
        "Advanced analytics",
      ],
      cta: "Start Free Trial",
      ctaLink: "/signup?plan=pro",
      popular: true,
    },
    {
      name: "Enterprise",
      price: "Custom",
      period: "contact us",
      description: "For large organizations with custom needs",
      features: [
        "Everything in Pro",
        "Unlimited storage",
        "Custom AI integrations",
        "Advanced security & compliance",
        "Dedicated account manager",
        "Custom SLA",
        "On-premise deployment",
      ],
      cta: "Contact Sales",
      ctaLink: "/contact-sales",
      popular: false,
    },
  ];

  return (
    <section id="pricing" className="relative w-full bg-gradient-to-b from-white to-gray-50 py-16 sm:py-20 lg:py-24 overflow-hidden">
      {/* Background blobs */}
      <div className="pointer-events-none absolute -top-40 -left-40 w-96 h-96 bg-gradient-to-br from-[#ff5018] to-yellow-200 rounded-full opacity-20 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-52 right-0 w-[500px] h-[500px] bg-gradient-to-br from-[#ff5018] to-lime-200 rounded-full opacity-15 blur-3xl" />

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-12 sm:mb-16">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-gray-900 mb-4 flex items-center justify-center gap-2 flex-wrap">
            <span>Simple Pricing for</span>
            <span className="inline-flex items-center justify-center -ml-2 sm:-ml-3">
              <img 
                src="/logo.png" 
                alt="WebflowX Logo" 
                className="h-12 w-12 sm:h-16 sm:w-16 lg:h-20 lg:w-20 object-contain" 
              />
            </span>
          </h2>
          <p className="text-sm sm:text-base lg:text-lg text-gray-600 max-w-2xl mx-auto px-4">
            Choose the perfect plan for your team. All plans include a 14-day free trial.
          </p>
        </div>

        {/* Pricing Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
          {plans.map((plan, index) => (
            <div
              key={index}
              className={`relative bg-white rounded-2xl shadow-sm hover:shadow-xl transition-all duration-300 overflow-hidden ${
                plan.popular ? "ring-2 ring-[#ff5018] lg:scale-105" : "border border-gray-200"
              }`}
            >
              {/* Popular Badge */}
              {plan.popular && (
                <div className="absolute top-0 right-0">
                  <div className="bg-[#ff5018] text-white text-xs font-bold px-4 py-1.5 rounded-bl-lg">
                    MOST POPULAR
                  </div>
                </div>
              )}

              <div className="p-6 sm:p-8">
                {/* Plan Name */}
                <h3 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">
                  {plan.name}
                </h3>

                {/* Description */}
                <p className="text-xs sm:text-sm text-gray-600 mb-6">
                  {plan.description}
                </p>

                {/* Price */}
                <div className="mb-6">
                  <div className="flex items-baseline gap-2">
                    <span className="text-4xl sm:text-5xl font-extrabold text-gray-900">
                      {plan.price}
                    </span>
                    {plan.price !== "Custom" && (
                      <span className="text-sm sm:text-base text-gray-500">
                        /{plan.period}
                      </span>
                    )}
                  </div>
                  {plan.price === "Custom" && (
                    <span className="text-sm text-gray-500">{plan.period}</span>
                  )}
                </div>

                {/* CTA Button */}
                <a href={plan.ctaLink}>
                  <Button
                    className={`w-full mb-6 font-semibold py-3 sm:py-3.5 rounded-lg transition-all duration-300 ${
                      plan.popular
                        ? "bg-[#ff5018] hover:bg-[#ff5018]/90 text-white shadow-lg hover:shadow-xl"
                        : "bg-white border-2 border-[#ff5018] text-[#ff5018] hover:bg-[#ff5018] hover:text-white"
                    }`}
                  >
                    {plan.cta}
                  </Button>
                </a>

                {/* Features List */}
                <div className="space-y-3">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    What's included:
                  </p>
                  <ul className="space-y-2.5">
                    {plan.features.map((feature, i) => (
                      <li key={i} className="flex items-start gap-3">
                        <Check className="w-5 h-5 text-[#ff5018] flex-shrink-0 mt-0.5" />
                        <span className="text-sm text-gray-700">{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Bottom CTA */}
        <div className="mt-12 sm:mt-16 text-center">
          <p className="text-sm sm:text-base text-gray-600 mb-4">
            Need a custom solution for your organization?
          </p>
          <a href="/contact-sales">
            <Button className="bg-white border-2 border-[#ff5018] text-[#ff5018] hover:bg-[#ff5018] hover:text-white font-semibold px-6 sm:px-8 py-3 rounded-lg transition-all">
              Talk to Sales
            </Button>
          </a>
        </div>
      </div>
    </section>
  );
};

export default PricingSection;