"use client";

import React, { useState } from "react";
import Link from "next/link";
import { ArrowRight, Check } from "lucide-react";
import { api } from "../../convex/_generated/api";
import { Reveal } from "./landing/ui";
import { wrap } from "./landing/tokens";

type State = { kind: "idle" } | { kind: "sending" } | { kind: "done" } | { kind: "error"; message: string };

function SubscribeForm() {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<State>({ kind: "idle" });

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (state.kind === "sending") return;
    setState({ kind: "sending" });
    try {
      // The Convex client loads only now, so the landing page doesn't download it just to show a form.
      const { ConvexHttpClient } = await import("convex/browser");
      const client = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);
      const res = await client.mutation(api.newsletter.subscribe, { email, source: "landing" });
      if (res.ok) {
        setState({ kind: "done" });
        setEmail("");
      } else {
        setState({ kind: "error", message: res.error });
      }
    } catch {
      setState({ kind: "error", message: "Something went wrong. Please try again." });
    }
  };

  return (
    <div className="w-full max-w-md">
      <form onSubmit={onSubmit} noValidate className="flex flex-col gap-3 sm:flex-row">
        <label htmlFor="newsletter-email" className="sr-only">Email address</label>
        <input
          id="newsletter-email"
          type="email"
          name="email"
          autoComplete="email"
          required
          maxLength={254}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@company.com"
          aria-describedby="newsletter-status"
          aria-invalid={state.kind === "error"}
          className="h-12 min-w-0 flex-1 rounded-md border border-[#381d2a]/20 bg-white px-4 text-[15px] text-[#1b1017] placeholder:text-[#1b1017]/45 focus:border-[#ff5018] focus:outline-none focus:ring-2 focus:ring-[#ff5018]/30"
        />
        <button
          type="submit"
          disabled={state.kind === "sending"}
          className="h-12 rounded-md bg-[#381d2a] px-6 text-[15px] font-semibold text-white transition-colors hover:bg-[#1b1017] disabled:opacity-60"
        >
          {state.kind === "sending" ? "Subscribing..." : "Subscribe"}
        </button>
      </form>
      <div id="newsletter-status" aria-live="polite" role="status" className="mt-3 min-h-[1.5rem] text-sm">
        {state.kind === "done" && (
          <p className="flex items-start gap-2 text-[#381d2a]">
            <Check className="mt-0.5 h-4 w-4 shrink-0 text-[#ff5018]" aria-hidden />
            Check your inbox to confirm your subscription.
          </p>
        )}
        {state.kind === "error" && <p className="text-[#b42318]">{state.message}</p>}
        {(state.kind === "idle" || state.kind === "sending") && (
          <p className="text-[#381d2a]/65">Product updates and tips. No spam. Unsubscribe any time.</p>
        )}
      </div>
    </div>
  );
}

export const NewsletterSignup = () => (
  <>
    <section className="w-full bg-[#ff5018] py-20 md:py-28">
      <div className={`${wrap} flex flex-col items-start justify-between gap-10 md:flex-row md:items-end`}>
        <Reveal>
          <h2 className="lp-h max-w-2xl text-4xl text-white sm:text-5xl md:text-6xl">
            Bring your team into one workspace.
          </h2>
          <p className="mt-5 max-w-md text-lg text-white/85">
            Start on the free plan and upgrade when your team needs more room.
          </p>
        </Reveal>
        <Link
          href="/auth"
          className="inline-flex items-center gap-2 rounded-md bg-[#381d2a] px-8 py-4 text-[15px] font-semibold text-white transition-colors hover:bg-[#1b1017]"
        >
          Start free <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </section>
    <section aria-labelledby="newsletter-heading" className="w-full bg-[#f7f2ee] py-14 md:py-16">
      <div className={`${wrap} flex flex-col items-start justify-between gap-8 md:flex-row md:items-center`}>
        <div className="max-w-md">
          <h3 id="newsletter-heading" className="lp-h text-2xl text-[#381d2a] sm:text-3xl">
            Not ready yet? Stay in the loop.
          </h3>
          <p className="mt-3 text-[15px] text-[#381d2a]/75">
            Occasional emails about new WebflowX features and ways to run your team better.
          </p>
        </div>
        <SubscribeForm />
      </div>
    </section>
  </>
);
