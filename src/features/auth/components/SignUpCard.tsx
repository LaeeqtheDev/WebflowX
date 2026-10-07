"use client";

import { Button } from "@/components/ui/button";
import { AuthDivider, AuthField } from "./auth-ui";
import React, { useState } from "react";
import { FcGoogle } from "react-icons/fc";
import { FaGithub } from "react-icons/fa";
import { TriangleAlert, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { SignInFlow } from "../../types/types";
import { useAuthActions } from "@convex-dev/auth/react";

interface SignUpCardProps {
  setState: (state: SignInFlow) => void;
  onEmail: (email: string) => void;
}

export const SignUpCard = ({ setState, onEmail }: SignUpCardProps) => {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  const { signIn } = useAuthActions();

  const onPasswordSignUp = (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setError("Passwords do not match. Please try again.");
      return;
    }

    setPending(true);
    setError("");
    signIn("password", { name, email, password, flow: "signUp" })
      .then((res) => {
        // email verification is on: a code was emailed, ask for it
        if (res && res.signingIn === false) {
          onEmail(email);
          setState("verify");
        }
      })
      .catch(() => setError("Failed to sign up. This email may already be registered, or the password is under 8 characters."))
      .finally(() => setPending(false));
  };

  const handleProviderSignIn = (value: "github" | "google") => {
    setPending(true);
    const next = new URLSearchParams(window.location.search).get("next");
    const redirectTo = next && next.startsWith("/") && !next.startsWith("//") ? next : undefined;
    signIn(value, redirectTo ? { redirectTo } : undefined).finally(() => setPending(false));
  };

  return (
    <div className="w-full">
      <Link href="/" className="mb-10 inline-flex items-center gap-1.5 text-sm text-[#1b1017]/55 transition-colors hover:text-[#1b1017]">
        <ArrowLeft size={16} />
        Back to home
      </Link>

      <h1 className="text-[2rem] font-semibold leading-tight tracking-[-0.03em] text-[#1b1017]">Create your account</h1>
      <p className="mt-2 text-[15px] text-[#1b1017]/65">Set up your workspace in a few steps.</p>

      {!!error && (
        <div className="mt-6 flex items-start gap-x-2 rounded-xl border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive">
          <TriangleAlert className="mt-0.5 size-4 shrink-0" />
          <p className="break-words">{error}</p>
        </div>
      )}

      <form onSubmit={onPasswordSignUp} className="mt-8 space-y-4">
          <AuthField label="Full name" disabled={pending} value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" required />
          <AuthField label="Email" disabled={pending} value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@company.com" type="email" required />
          <div className="grid gap-4 sm:grid-cols-2">
            <AuthField label="Password" disabled={pending} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" type="password" required />
            <AuthField label="Confirm password" disabled={pending} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Repeat password" type="password" required />
          </div>
        <Button
          type="submit"
          className="mt-2 h-12 w-full cursor-pointer rounded-xl bg-[#ff5018] text-[15px] font-semibold text-white shadow-[0_10px_30px_-12px_rgba(255,80,24,0.8)] hover:bg-[#e6430f]"
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
          className="h-12 cursor-pointer gap-2.5 rounded-xl border-[#381d2a]/15 bg-white text-[15px] hover:bg-[#f3eeea]"
        >
          <FcGoogle className="size-5" />
          Google
        </Button>
        <Button
          disabled={pending}
          onClick={() => handleProviderSignIn("github")}
          variant="outline"
          size="lg"
          className="h-12 cursor-pointer gap-2.5 rounded-xl border-[#381d2a]/15 bg-white text-[15px] hover:bg-[#f3eeea]"
        >
          <FaGithub className="size-5" />
          GitHub
        </Button>
      </div>

      <p className="mt-6 text-center text-xs text-[#1b1017]/55">
        By continuing you agree to our{" "}
        <Link href="/terms" className="underline underline-offset-2 hover:text-[#ff5018]">Terms</Link> and{" "}
        <Link href="/privacy" className="underline underline-offset-2 hover:text-[#ff5018]">Privacy Policy</Link>.
      </p>

      <p className="mt-5 text-center text-sm text-[#1b1017]/65">
        Already have an account?{" "}
        <button
          type="button"
          onClick={() => setState("signIn")}
          className="cursor-pointer font-semibold text-[#ff5018] underline-offset-4 hover:underline"
        >
          Log in
        </button>
      </p>
    </div>
  );
};
