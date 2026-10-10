"use client";

import { Button } from "@/components/ui/button";
import { AuthDivider, AuthField } from "./auth-ui";
import React, { useState } from "react";
import { FcGoogle } from "react-icons/fc";
import { FaGithub, FaMicrosoft } from "react-icons/fa";
import { TriangleAlert, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { safeNext } from "@/lib/safe-next";
import { SignInFlow } from "../../types/types";
import { useAuthActions } from "@convex-dev/auth/react";

interface SignInCardProps {
  setState: (state: SignInFlow) => void;
  onEmail: (email: string) => void;
}

export const SignInCard = ({ setState, onEmail }: SignInCardProps) => {
  const { signIn } = useAuthActions();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  const onPasswordSignIn = (e: React.FormEvent) => {
    e.preventDefault();
    setPending(true);
    setError("");
    signIn("password", { email, password, flow: "signIn" })
      .then((res) => {
        // account exists but its email isn't verified yet: a code was just emailed
        if (res && res.signingIn === false) {
          onEmail(email);
          setState("verify");
        }
      })
      .catch(() => setError("Invalid email or password. Please try again."))
      .finally(() => setPending(false));
  };

  const handleProviderSignIn = (value: "github" | "google" | "microsoft-entra-id") => {
    setPending(true);
    const next = new URLSearchParams(window.location.search).get("next");
    const redirectTo = safeNext(next);
    signIn(value, redirectTo ? { redirectTo } : undefined).finally(() => setPending(false));
  };

  return (
    <div className="w-full">
      <Link href="/" className="mb-10 inline-flex items-center gap-1.5 text-sm text-ink/60 transition-colors hover:text-ink">
        <ArrowLeft size={16} />
        Back to home
      </Link>

      <h1 className="text-[2rem] font-semibold leading-tight tracking-[-0.03em] text-ink">Welcome back</h1>
      <p className="mt-2 text-[15px] text-ink/65">Log in to your workspace.</p>

      {!!error && (
        <div className="mt-6 flex items-start gap-x-2 rounded-xl border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive">
          <TriangleAlert className="mt-0.5 size-4 shrink-0" />
          <p className="break-words">{error}</p>
        </div>
      )}

      <form onSubmit={onPasswordSignIn} className="mt-8 space-y-4">
          <AuthField label="Email" disabled={pending} value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@company.com" type="email" required />
          <AuthField label="Password" disabled={pending} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Your password" type="password" required />
        <div className="-mt-1 text-right">
          <button type="button" onClick={() => { onEmail(email); setState("resetPassword"); }} className="cursor-pointer text-sm font-medium text-brand underline-offset-4 hover:underline">
            Forgot password?
          </button>
        </div>
        <Button
          type="submit"
          className="mt-2 h-12 w-full cursor-pointer rounded-xl bg-brand text-[15px] font-semibold text-white shadow-[0_10px_30px_-12px_color-mix(in_srgb,var(--wfx-accent)_80%,transparent)] hover:bg-brand-hover"
          size="lg"
          disabled={pending}
        >
          Continue
        </Button>
      </form>

      <AuthDivider />

      <div className="grid grid-cols-2 gap-3">
        <Button
          disabled={pending}
          onClick={() => handleProviderSignIn("google")}
          variant="outline"
          size="lg"
          className="h-12 cursor-pointer gap-2.5 rounded-xl border-plum/15 bg-surface text-[15px] hover:bg-cream-deep"
        >
          <FcGoogle className="size-5" />
          Google
        </Button>
        <Button
          disabled={pending}
          onClick={() => handleProviderSignIn("github")}
          variant="outline"
          size="lg"
          className="h-12 cursor-pointer gap-2.5 rounded-xl border-plum/15 bg-surface text-[15px] hover:bg-cream-deep"
        >
          <FaGithub className="size-5" />
          GitHub
        </Button>
      </div>
      {process.env.NEXT_PUBLIC_MICROSOFT_SIGNIN === "1" && (
        <Button
          disabled={pending}
          onClick={() => handleProviderSignIn("microsoft-entra-id")}
          variant="outline"
          size="lg"
          className="mt-3 h-12 w-full cursor-pointer gap-2.5 rounded-xl border-plum/15 bg-surface text-[15px] hover:bg-cream-deep"
        >
          <FaMicrosoft className="size-5" />
          Microsoft
        </Button>
      )}

      <p className="mt-8 text-center text-sm text-ink/65">
        Don&apos;t have an account?{" "}
        <button
          type="button"
          onClick={() => setState("signUp")}
          className="cursor-pointer font-semibold text-brand underline-offset-4 hover:underline"
        >
          Sign up
        </button>
      </p>
    </div>
  );
};
