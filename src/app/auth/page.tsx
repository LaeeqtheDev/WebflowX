import type { Metadata } from "next"
import { AuthScreen } from "@/features/auth/components/auth-screen"

export const metadata: Metadata = {
  title: "Sign in",
  description: "Sign in or create your WebflowX account to join your team's workspace.",
  alternates: { canonical: "/auth" },
}

const AuthPage =()  => {
  return(
    <div >
      <AuthScreen/>
    </div>
  )
}

export default AuthPage 