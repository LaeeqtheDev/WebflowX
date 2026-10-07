import { Email } from "@convex-dev/auth/providers/Email"

// 8-digit one-time code, sent through Resend's HTTP API (no extra package needed).
const makeCode = () => {
    const bytes = new Uint8Array(8)
    crypto.getRandomValues(bytes)
    return Array.from(bytes, (b) => String(b % 10)).join("")
}

const sender = (id: string, subject: string, intro: string) =>
    Email({
        id,
        apiKey: process.env.AUTH_RESEND_KEY,
        maxAge: 60 * 15, // codes live 15 minutes
        async generateVerificationToken() {
            return makeCode()
        },
        async sendVerificationRequest({ identifier: email, token }) {
            const key = process.env.AUTH_RESEND_KEY
            if (!key) throw new Error("Email sending is not configured")
            const from = process.env.AUTH_EMAIL_FROM ?? "WebflowX <onboarding@resend.dev>"
            const res = await fetch("https://api.resend.com/emails", {
                method: "POST",
                headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
                body: JSON.stringify({
                    from,
                    to: [email],
                    subject,
                    html: `<div style="font-family:system-ui,sans-serif;max-width:420px;margin:auto;padding:24px;color:#1b1017">
<h2 style="margin:0 0 12px">${subject}</h2>
<p style="margin:0 0 16px;color:#555">${intro}</p>
<p style="font-size:32px;letter-spacing:8px;font-weight:700;margin:0 0 16px;color:#ff5018">${token}</p>
<p style="margin:0;color:#888;font-size:13px">This code expires in 15 minutes. If you didn't request it, you can ignore this email.</p>
</div>`,
                    text: `${intro}\n\nYour code: ${token}\n\nIt expires in 15 minutes.`,
                }),
            })
            if (!res.ok) throw new Error("Could not send the email. Please try again.")
        },
    })

export const ResendVerify = sender("resend-verify", "Verify your WebflowX email", "Enter this code to verify your email address.")
export const ResendReset = sender("resend-reset", "Reset your WebflowX password", "Enter this code to choose a new password.")
