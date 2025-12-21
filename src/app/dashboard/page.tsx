"use client"

import { Button } from "@/components/ui/button"
import { useAuthActions } from "@convex-dev/auth/react"

export default function Home(){
  const {signOut} = useAuthActions()

  return(
    <div className="flex flex-col">
      Logged In!
      <Button onClick={() => signOut()} className="w-1/2 cursor-pointer">Sign Out</Button>
    </div>
  )
}