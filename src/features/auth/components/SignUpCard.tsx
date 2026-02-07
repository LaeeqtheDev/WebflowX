"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Separator } from "@radix-ui/react-separator";
import React, { useState } from "react";
import { FcGoogle } from "react-icons/fc";
import { FaGithub } from "react-icons/fa";
import { TriangleAlert, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { SignInFlow } from "../../types/types";
import { useAuthActions } from "@convex-dev/auth/react";

interface SignUpCardProps {
  setState: (state: SignInFlow) => void;
}

export const SignUpCard = ({ setState }: SignUpCardProps) => {
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
    signIn("password", { name, email, password, flow: "signUp" })
      .catch(() => setError("Failed to sign up. Please try again."))
      .finally(() => setPending(false));
  };

  const handleProviderSignIn = (value: "github" | "google") => {
    setPending(true);
    signIn(value).finally(() => setPending(false));
  };

  return (
    <Card className="w-full h-full p-12 border-2 drop-shadow-2xl relative">
      {/* Back Arrow */}
      <Link href="/" className="absolute top-6 left-6 flex items-center gap-1 text-gray-500 hover:text-black">
        <ArrowLeft size={20} />
      </Link>

      <div className="flex gap-3 mx-auto items-center justify-center">
        <div className="w-24 h-24 rounded-full items-center justify-center mx-auto flex">
          <img src={"/logo.png"} alt="Logo" className="w-24 h-24 mb-0 mt-0 mx-auto" />
        </div>
      </div>

      <CardHeader className="px-0 pt-8">
        <CardTitle>Sign Up to Continue</CardTitle>
        <CardDescription>
          Use your email or another service to continue
        </CardDescription>
      </CardHeader>

      {!!error && (
        <div className="bg-destructive/15 p-3 rounded-md flex items-center gap-x-2 text-sm text-destructive mb-3">
          <TriangleAlert className="size-4" />
          <p>{error}</p>
        </div>
      )}

      <CardContent className="space-y-5 px-0 pb-0">
        <form onSubmit={onPasswordSignUp} className="space-y-2.5">
          <Input
            disabled={pending}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Full Name"
            required
          />

          <Input
            disabled={pending}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email"
            type="email"
            required
          />

          <Input
            disabled={pending}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            type="password"
            required
          />

          <Input
            disabled={pending}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Confirm Password"
            type="password"
            required
          />

          <Button
            type="submit"
            className="w-full bg-black/70 hover:bg-black cursor-pointer"
            size="lg"
            disabled={pending}
          >
            Continue
          </Button>
        </form>

        <Separator />

        <div className="flex flex-col gap-y-2.5">
          <Button
            disabled={pending}
            onClick={() => handleProviderSignIn("google")}
            variant="outline"
            size="lg"
            className="w-full relative flex items-center justify-center gap-x-2.5 cursor-pointer"
          >
            <FcGoogle size={20} />
            Continue with Google
          </Button>

          <Button
            disabled={pending}
            onClick={() => handleProviderSignIn("github")}
            variant="outline"
            size="lg"
            className="w-full relative flex items-center justify-center gap-x-2.5 cursor-pointer"
          >
            <FaGithub size={20} />
            Continue with Github
          </Button>
        </div>

        <p>
          Already have an account?{" "}
          <span
            onClick={() => setState("signIn")}
            className="text-orange-600 hover:underline cursor-pointer"
          >
            Sign In
          </span>
        </p>
      </CardContent>
    </Card>
  );
};
