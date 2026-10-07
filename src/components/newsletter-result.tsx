"use client";

import React, { Suspense, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";

type Mode = "confirm" | "unsubscribe";
type Result = { kind: "loading" } | { kind: "ok" } | { kind: "error"; message: string };

const COPY = {
  confirm: {
    loading: "Confirming your subscription...",
    okTitle: "You're subscribed",
    okBody: "Thanks for confirming. You'll get WebflowX product updates and tips. You can unsubscribe from any email.",
    errTitle: "We couldn't confirm that",
  },
  unsubscribe: {
    loading: "Unsubscribing you...",
    okTitle: "You're unsubscribed",
    okBody: "You won't receive any more newsletter emails from us. Changed your mind? You can sign up again any time from our homepage.",
    errTitle: "We couldn't unsubscribe you",
  },
} as const;

function Inner({ mode }: { mode: Mode }) {
  const token = useSearchParams().get("token") ?? "";
  const confirm = useMutation(api.newsletter.confirm);
  const unsubscribe = useMutation(api.newsletter.unsubscribe);
  const [result, setResult] = useState<Result>({ kind: "loading" });
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    if (!token) return;
    (mode === "confirm" ? confirm : unsubscribe)({ token })
      .then((r) => setResult(r.ok ? { kind: "ok" } : { kind: "error", message: r.error ?? "This link is not valid." }))
      .catch(() => setResult({ kind: "error", message: "Something went wrong. Please try again." }));
  }, [token, mode, confirm, unsubscribe]);

  const c = COPY[mode];
  const shown: Result = token
    ? result
    : { kind: "error", message: "This link is missing its token. Please use the link from your email." };
  return (
    <div aria-live="polite" className="rounded-2xl border border-[#381d2a]/10 bg-white p-8 shadow-sm sm:p-10">
      <div className="mb-6 h-1 w-12 rounded-full bg-[#ff5018]" />
      {shown.kind === "loading" && <p className="text-[#381d2a]/75">{c.loading}</p>}
      {shown.kind === "ok" && (
        <>
          <h1 className="text-3xl font-bold tracking-tight text-[#1b1017]">{c.okTitle}</h1>
          <p className="mt-3 text-[#381d2a]/75">{c.okBody}</p>
        </>
      )}
      {shown.kind === "error" && (
        <>
          <h1 className="text-3xl font-bold tracking-tight text-[#1b1017]">{c.errTitle}</h1>
          <p className="mt-3 text-[#381d2a]/75">{shown.message}</p>
        </>
      )}
      <Link
        href="/"
        className="mt-8 inline-flex rounded-md bg-[#381d2a] px-6 py-3 text-[15px] font-semibold text-white transition-colors hover:bg-[#1b1017]"
      >
        Back to WebflowX
      </Link>
    </div>
  );
}

export function NewsletterResult({ mode }: { mode: Mode }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f7f2ee] px-5 py-16">
      <div className="w-full max-w-lg">
        <p className="mb-5 text-lg font-bold text-[#381d2a]">WebflowX</p>
        <Suspense fallback={<div className="rounded-2xl bg-white p-8 text-[#381d2a]/75">Loading...</div>}>
          <Inner mode={mode} />
        </Suspense>
      </div>
    </main>
  );
}
