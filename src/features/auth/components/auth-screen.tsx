"use client"

import { useEffect, useRef, useState } from "react"
import Image from "next/image"
import { CheckSquare, Sparkles } from "lucide-react"
import { gsap } from "@/components/landing/gsap"
import { SignInFlow } from "../../types/types"
import { SignInCard } from "./SignInCard"
import { SignUpCard } from "./SignUpCard"
import { ResetPasswordCard, VerifyEmailCard } from "./code-cards"

const copy = {
    signIn: {
        title: "Pick up where your team left off.",
        body: "Your channels, tasks and documents are waiting.",
    },
    signUp: {
        title: "Create a workspace for your team.",
        body: "Messaging, tasks, documents, meetings and AI summaries in one place.",
    },
}

export const AuthScreen = () => {
    const [state, setState] = useState<SignInFlow>("signIn")
    const [email, setEmail] = useState("")
    const root = useRef<HTMLDivElement>(null)

    useEffect(() => {
        const el = root.current
        if (!el) return
        const ctx = gsap.context(() => {
            gsap.from(".a-in", { opacity: 0, y: 24, duration: 0.8, stagger: 0.1, ease: "power3.out" })
            gsap.from(".a-card", { opacity: 0, y: 40, scale: 0.96, duration: 0.9, stagger: 0.15, delay: 0.3, ease: "power3.out" })
            gsap.utils.toArray<HTMLElement>(".a-card").forEach((c, i) =>
                gsap.to(c, { y: i % 2 ? -8 : 8, duration: 3 + i * 0.6, ease: "sine.inOut", yoyo: true, repeat: -1, delay: 1.5 })
            )
        }, el)
        return () => ctx.revert()
    }, [])

    return (
        <div ref={root} className="grid min-h-screen lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)]">
            {/* Brand panel */}
            <aside
                className="relative hidden flex-col justify-between overflow-hidden p-12 text-white lg:flex"
                style={{
                    background:
                        "radial-gradient(ellipse 80% 55% at 20% 0%, rgba(255,80,24,0.22) 0%, rgba(255,80,24,0) 60%), radial-gradient(ellipse 70% 60% at 90% 100%, #4a2638 0%, rgba(34,16,26,0) 70%), #22101a",
                }}
            >
                <div className="a-in flex items-center gap-3">
                    <Image src="/logo.png" alt="" width={34} height={34} className="h-[34px] w-[34px]" />
                    <span className="text-lg font-semibold tracking-tight">WebflowX</span>
                </div>

                <div>
                    <h2 className="a-in max-w-lg text-[3.2rem] font-semibold leading-[1.03] tracking-[-0.035em]">
                        {copy[state === "signUp" ? "signUp" : "signIn"].title}
                    </h2>
                    <p className="a-in mt-5 max-w-md text-lg text-white/65">{copy[state === "signUp" ? "signUp" : "signIn"].body}</p>

                    <div className="relative mt-12 h-[290px] max-w-xl">
                        <div className="a-card absolute left-0 top-0 w-72 rounded-2xl bg-surface p-4 text-ink shadow-2xl">
                            <div className="flex gap-3">
                                <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-[#7b3f61] text-sm font-semibold text-white">M</span>
                                <div>
                                    <p className="text-[13px] font-semibold">Maya Chen <span className="font-normal text-neutral-400">9:12 AM</span></p>
                                    <p className="mt-0.5 text-[13px] leading-snug text-neutral-700">Reminder: all-hands moved to 3 PM today.</p>
                                </div>
                            </div>
                        </div>
                        <div className="a-card absolute left-40 top-24 w-64 rounded-2xl bg-surface p-4 text-ink shadow-2xl">
                            <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-neutral-400">
                                <CheckSquare className="size-3.5 text-[#ff5018]" /> In progress
                            </p>
                            <p className="mt-2 text-sm font-semibold">Deploy checkout fix</p>
                            <p className="mt-2 flex items-center gap-2 text-xs text-neutral-500">
                                <span className="flex size-5 items-center justify-center rounded bg-[#2f7d6b] text-[10px] font-semibold text-white">D</span>
                                Dev Patel
                            </p>
                        </div>
                        <div className="a-card absolute left-6 top-[196px] w-72 rounded-2xl bg-[#ff5018] p-4 text-white shadow-2xl">
                            <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-white/85">
                                <Sparkles className="size-3.5" /> AI summary
                            </p>
                            <p className="mt-2 text-sm leading-snug">Checkout fix ships today. Campaign brief due Friday.</p>
                        </div>
                    </div>
                </div>

                <figure className="a-in max-w-md border-t border-white/15 pt-6">
                    <blockquote className="text-[15px] leading-relaxed text-white/80">
                        &ldquo;We used WebflowX during beta with a distributed team. The real-time updates and clarity around ownership made a huge difference.&rdquo;
                    </blockquote>
                    <figcaption className="mt-3 text-sm text-white/55">Hassan Ali, Remote Team Lead</figcaption>
                </figure>
            </aside>

            {/* Form */}
            <main className="flex min-h-screen flex-col justify-center bg-cream-soft px-6 py-10 sm:px-12">
                <div className="mx-auto mb-10 flex items-center gap-2.5 lg:hidden">
                    <Image src="/logo.png" alt="" width={28} height={28} className="h-7 w-7" />
                    <span className="text-lg font-semibold tracking-tight text-ink">WebflowX</span>
                </div>
                <div className="a-in mx-auto w-full max-w-[420px]">
                    {state === "signIn" && <SignInCard setState={setState} onEmail={setEmail} />}
                    {state === "signUp" && <SignUpCard setState={setState} onEmail={setEmail} />}
                    {state === "verify" && <VerifyEmailCard email={email} setState={setState} />}
                    {state === "resetPassword" && <ResetPasswordCard initialEmail={email} setState={setState} />}
                </div>
            </main>
        </div>
    )
}
