import { Email } from "@convex-dev/auth/providers/Email"
import type { GenericActionCtx, GenericDataModel } from "convex/server"
import { internal } from "./_generated/api"
import { COPY, renderCodeEmail, sendResend } from "./emailLayout"

// 8-digit one-time code, sent through Resend's HTTP API (no extra package needed).
const makeCode = () => {
    const bytes = new Uint8Array(8)
    crypto.getRandomValues(bytes)
    return Array.from(bytes, (b) => String(b % 10)).join("")
}

const sender = (id: string, kind: "verify" | "reset") =>
    Email({
        id,
        apiKey: process.env.AUTH_RESEND_KEY,
        maxAge: 60 * 15, // codes live 15 minutes
        async generateVerificationToken() {
            return makeCode()
        },
        async sendVerificationRequest({ identifier: email, token }, ctx?: GenericActionCtx<GenericDataModel>) {
            // Stops someone from using the sign-in form to flood a mailbox with codes, or to burn our sending quota.
            if (ctx) {
                const mailbox = email.trim().toLowerCase()
                const okMailbox = await ctx.runMutation(internal.rateLimit.consumeInternal, { key: `authcode:${mailbox}`, max: 5, windowMs: 60 * 60_000 })
                const okGlobal = await ctx.runMutation(internal.rateLimit.consumeInternal, { key: "authcode:global", max: 600, windowMs: 10 * 60_000 })
                if (!okMailbox || !okGlobal) throw new Error("Too many code requests. Please wait a while and try again.")
            }
            // Fails closed: with no sender configured nothing is sent and the caller gets an error
            // (the sandbox sender can only reach the account owner, so it must never be a silent fallback).
            if (!process.env.AUTH_RESEND_KEY) throw new Error("Email sending is not configured")
            if (!process.env.AUTH_EMAIL_FROM) {
                console.error("AUTH_EMAIL_FROM is not set. Run: npx convex env set AUTH_EMAIL_FROM \"WebflowX <no-reply@your-verified-domain>\"")
                throw new Error("Email sending is not configured")
            }
            const copy = COPY[kind]
            const ok = await sendResend({
                to: email,
                subject: copy.subject,
                html: renderCodeEmail(copy, token),
                text: `${copy.plain}\n\nYour code: ${token}\n\nIt expires in 15 minutes and works once.\n${copy.ignore}\n\nNever share this code. Help: support@northfoundry.co`,
                tag: kind === "reset" ? "password_reset" : "email_verification",
            })
            if (!ok) throw new Error("Could not send the email. Please try again.")
        },
    })

export const ResendVerify = sender("resend-verify", "verify")
export const ResendReset = sender("resend-reset", "reset")
