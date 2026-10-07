"use client";

import { Button } from "@/components/ui/button";
import { AuthField } from "./auth-ui";
import React, { useState } from "react";
import { ArrowLeft, TriangleAlert, MailCheck } from "lucide-react";
import { useAuthActions } from "@convex-dev/auth/react";
import { SignInFlow } from "../../types/types";

const primary =
  "mt-2 h-12 w-full cursor-pointer rounded-xl bg-[#ff5018] text-[15px] font-semibold text-white shadow-[0_10px_30px_-12px_rgba(255,80,24,0.8)] hover:bg-[#e6430f]";

const ErrorBox = ({ text }: { text: string }) =>
  text ? (
    <div className="mt-6 flex items-start gap-x-2 rounded-xl border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive">
      <TriangleAlert className="mt-0.5 size-4 shrink-0" />
      <p className="break-words">{text}</p>
    </div>
  ) : null;

const BackToSignIn = ({ onClick }: { onClick: () => void }) => (
  <button type="button" onClick={onClick} className="mb-10 inline-flex cursor-pointer items-center gap-1.5 text-sm text-[#1b1017]/55 transition-colors hover:text-[#1b1017]">
    <ArrowLeft size={16} /> Back to log in
  </button>
);

/** After sign-up (or first sign-in on an unverified account): enter the 8-digit code we emailed. */
export const VerifyEmailCard = ({ email, setState }: { email: string; setState: (s: SignInFlow) => void }) => {
  const { signIn } = useAuthActions();
  const [code, setCode] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPending(true);
    setError("");
    signIn("password", { email, code: code.trim(), flow: "email-verification" })
      .catch(() => setError("That code is wrong or has expired. Check it, or go back and sign in again to get a new one."))
      .finally(() => setPending(false));
  };

  return (
    <div className="w-full">
      <BackToSignIn onClick={() => setState("signIn")} />
      <MailCheck className="size-9 text-[#ff5018]" />
      <h1 className="mt-4 text-[2rem] font-semibold leading-tight tracking-[-0.03em] text-[#1b1017]">Check your email</h1>
      <p className="mt-2 text-[15px] text-[#1b1017]/65">We sent an 8-digit code to <strong className="text-[#1b1017]">{email}</strong>. It expires in 15 minutes.</p>
      <ErrorBox text={error} />
      <form onSubmit={onSubmit} className="mt-8 space-y-4">
        <AuthField label="Verification code" value={code} onChange={(e) => setCode(e.target.value)} placeholder="12345678" inputMode="numeric" autoComplete="one-time-code" disabled={pending} required minLength={8} maxLength={8} />
        <Button type="submit" className={primary} size="lg" disabled={pending}>Verify and continue</Button>
      </form>
    </div>
  );
};

/** Two steps: ask for the email, then code + new password. */
export const ResetPasswordCard = ({ initialEmail, setState }: { initialEmail: string; setState: (s: SignInFlow) => void }) => {
  const { signIn } = useAuthActions();
  const [step, setStep] = useState<"request" | "code">("request");
  const [email, setEmail] = useState(initialEmail);
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState(false);

  const request = (e: React.FormEvent) => {
    e.preventDefault();
    setPending(true);
    setError("");
    signIn("password", { email, flow: "reset" })
      .then(() => setStep("code"))
      .catch((e: unknown) => {
        const msg = String((e as Error)?.message ?? "");
        if (msg.includes("not enabled")) {
          setError("Password reset by email isn't switched on for this app yet. Please contact support@northfoundry.co.");
          return;
        }
        // Emails with no password account (never signed up, or signed up with Google/GitHub) land here.
        // We don't reveal which, so move on and explain what to check.
        setNotice(true);
        setStep("code");
      })
      .finally(() => setPending(false));
  };

  const finish = (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 8) {
      setError("Use at least 8 characters for your new password.");
      return;
    }
    setPending(true);
    setError("");
    signIn("password", { email, code: code.trim(), newPassword, flow: "reset-verification" })
      .catch(() => setError("That code is wrong or has expired, or the password isn't allowed. Please try again."))
      .finally(() => setPending(false));
  };

  return (
    <div className="w-full">
      <BackToSignIn onClick={() => setState("signIn")} />
      <h1 className="text-[2rem] font-semibold leading-tight tracking-[-0.03em] text-[#1b1017]">Reset your password</h1>
      <p className="mt-2 text-[15px] text-[#1b1017]/65">
        {step === "request" ? "Enter your email and we'll send you a code." : `Enter the code we sent to ${email} and choose a new password.`}
      </p>
      <ErrorBox text={error} />
      {step === "code" && notice && (
        <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
          If <strong>{email}</strong> has a password account, a code is on its way (check spam too). If you normally log in with Google or GitHub, that account has no password, so go back and use that button.{" "}
          <button type="button" onClick={() => { setStep("request"); setNotice(false); }} className="cursor-pointer font-semibold underline underline-offset-2">Use a different email</button>
        </div>
      )}
      {step === "request" ? (
        <form onSubmit={request} className="mt-8 space-y-4">
          <AuthField label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@company.com" disabled={pending} required />
          <Button type="submit" className={primary} size="lg" disabled={pending}>Send code</Button>
        </form>
      ) : (
        <form onSubmit={finish} className="mt-8 space-y-4">
          <AuthField label="Code" value={code} onChange={(e) => setCode(e.target.value)} placeholder="12345678" inputMode="numeric" autoComplete="one-time-code" disabled={pending} required minLength={8} maxLength={8} />
          <AuthField label="New password" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="At least 8 characters" disabled={pending} required minLength={8} />
          <Button type="submit" className={primary} size="lg" disabled={pending}>Set password and log in</Button>
        </form>
      )}
    </div>
  );
};
