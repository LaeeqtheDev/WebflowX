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

interface SignInCardProps {
  setState: (state: SignInFlow) => void;
}

export const SignInCard = ({ setState }: SignInCardProps) => {
  const { signIn } = useAuthActions();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  const onPasswordSignIn = (e: React.FormEvent) => {
    e.preventDefault();
    setPending(true);
    signIn("password", { email, password, flow: "signIn" })
      .catch(() => setError("Invalid email or password. Please try again."))
      .finally(() => setPending(false));
  };

  const handleProviderSignIn = (value: "github" | "google") => {
    setPending(true);
    signIn(value).finally(() => setPending(false));
  };

  return (
    <Card className="w-full h-full max-w-md mx-auto p-6 sm:p-8 md:p-12 border-2 drop-shadow-2xl relative">
      {/* Back Arrow */}
      <Link href="/" className="absolute top-4 left-4 sm:top-6 sm:left-6 flex items-center gap-1 text-gray-500 hover:text-black transition-colors">
        <ArrowLeft size={18} className="sm:w-5 sm:h-5" />
        <span className="text-sm sm:text-base hidden xs:inline">Back</span>
      </Link>

      <div className="flex gap-3 mx-auto items-center justify-center mt-8 sm:mt-0">
        <div className="w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 rounded-full items-center justify-center mx-auto flex">
          <img
            src={"/logo.png"}
            alt="Logo"
            className="w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 mb-0 mt-0 mx-auto"
          />
        </div>
      </div>

      <CardHeader className="px-0 pt-6 sm:pt-8 text-center sm:text-left">
        <CardTitle className="text-xl sm:text-2xl">Login to Continue</CardTitle>
        <CardDescription className="text-sm sm:text-base">
          Use your email or another service to continue
        </CardDescription>
      </CardHeader>

      {!!error && (
        <div className="bg-destructive/15 p-3 rounded-md flex items-start sm:items-center gap-x-2 text-xs sm:text-sm text-destructive mb-3">
          <TriangleAlert className="size-4 flex-shrink-0 mt-0.5 sm:mt-0" />
          <p className="break-words">{error}</p>
        </div>
      )}

      <CardContent className="space-y-5 px-0 pb-0">
        <form onSubmit={onPasswordSignIn} className="space-y-2.5">
          <Input
            disabled={pending}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email"
            type="email"
            required
            className="text-sm sm:text-base"
          />

          <Input
            disabled={pending}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            type="password"
            required
            className="text-sm sm:text-base"
          />

          <Button
            type="submit"
            className="w-full bg-black/70 hover:bg-black cursor-pointer text-sm sm:text-base"
            size="lg"
            disabled={pending}
          >
            Continue
          </Button>
        </form>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <Separator className="w-full border-t border-gray-300" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-white px-2 text-gray-500">Or continue with</span>
          </div>
        </div>

        <div className="flex flex-col gap-y-2.5">
          <Button
            disabled={pending}
            onClick={() => handleProviderSignIn("google")}
            variant="outline"
            size="lg"
            className="w-full relative flex items-center justify-center gap-x-2.5 cursor-pointer text-sm sm:text-base"
          >
            <FcGoogle className="w-5 h-5" />
            Continue with Google
          </Button>

          <Button
            disabled={pending}
            onClick={() => handleProviderSignIn("github")}
            variant="outline"
            size="lg"
            className="w-full relative flex items-center justify-center gap-x-2.5 cursor-pointer text-sm sm:text-base"
          >
            <FaGithub className="w-5 h-5" />
            Continue with Github
          </Button>
        </div>

        <p className="text-center text-sm">
          Don't have an account?{" "}
          <span
            onClick={() => setState("signUp")}
            className="text-orange-600 hover:underline cursor-pointer font-medium"
          >
            Sign Up
          </span>
        </p>
      </CardContent>
    </Card>
  );
};