import type { Metadata } from "next"
import { AuthScreen } from "@/features/auth/components/auth-screen"

export const metadata: Metadata = {
  title: "Sign in",
  description: "Sign in or create your WebflowX account to join your team's workspace.",
  alternates: { canonical: "/auth" },
}

const AuthPage = async ({ searchParams }: { searchParams: Promise<{ mode?: string; next?: string }> }) => {
  const { mode, next } = await searchParams
  return(
    <div >
      <AuthScreen initialState={mode === "signup" ? "signUp" : "signIn"} invited={!!next?.startsWith("/join/")} />
    </div>
  )
}

export default AuthPage 