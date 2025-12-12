"use client"

import { useState } from "react"
import { SignInFlow } from "../types/types"

export const AuthScreen = () => {
    const [state, setState] = useState<SignInFlow>("signIn")
    return (
        <div className="h-full flex items-center justify-center">
            Auth Screen
        </div>
    )
}