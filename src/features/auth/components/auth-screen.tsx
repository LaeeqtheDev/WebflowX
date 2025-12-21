"use client"

import { useState } from "react"
import { SignInFlow } from "../types/types"
import { SignInCard } from "./SignInCard"
import { SignUpCard } from "./SignUpCard"

export const AuthScreen = () => {
    const [state, setState] = useState<SignInFlow>("signIn")
    return (
        <div className="relative h-screen flex items-center justify-center bg-white overflow-hidden">
            
            {/* Decorative gradient shapes */}
            <div className="absolute -top-32 -left-32 w-125 h-125 bg-linear-to-br from-orange-500 to-[#b5b399] rounded-full opacity-30 blur-3xl"></div>
            <div className="absolute -bottom-40 -right-40 w-150 h-150 bg-linear-to-br from-orange-500 to-[#d8da72] rounded-full opacity-20 blur-3xl"></div>

            <div className="relative md:h-auto md:w-105">
                {state === "signIn" ? <SignInCard setState={setState} /> : <SignUpCard setState={setState} />}
            </div>
        </div>
    )
}
