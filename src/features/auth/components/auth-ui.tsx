"use client"

import React, { useState } from "react"
import { Eye, EyeOff } from "lucide-react"
import { Input } from "@/components/ui/input"

export const AuthField = ({
    label,
    type = "text",
    ...props
}: React.ComponentProps<"input"> & { label: string }) => {
    const [show, setShow] = useState(false)
    const isPassword = type === "password"
    return (
        <label className="block">
            <span className="mb-1.5 block text-[13px] font-medium text-[#1b1017]">{label}</span>
            <span className="relative block">
                <Input
                    {...props}
                    type={isPassword && show ? "text" : type}
                    className="h-12 rounded-xl border-[#381d2a]/15 bg-white px-4 text-[15px] shadow-none focus-visible:border-[#ff5018] focus-visible:ring-[3px] focus-visible:ring-[#ff5018]/20"
                />
                {isPassword && (
                    <button
                        type="button"
                        tabIndex={-1}
                        aria-label={show ? "Hide password" : "Show password"}
                        onClick={() => setShow((v) => !v)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-[#1b1017]/45 hover:text-[#1b1017]"
                    >
                        {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                    </button>
                )}
            </span>
        </label>
    )
}

export const AuthDivider = () => (
    <div className="relative my-6">
        <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t border-[#381d2a]/12" />
        </div>
        <div className="relative flex justify-center">
            <span className="bg-[#fbf9f7] px-3 text-xs text-[#1b1017]/50">or continue with</span>
        </div>
    </div>
)
