import { Email } from "@convex-dev/auth/providers/Email"

// 8-digit one-time code, sent through Resend's HTTP API (no extra package needed).
const makeCode = () => {
    const bytes = new Uint8Array(8)
    crypto.getRandomValues(bytes)
    return Array.from(bytes, (b) => String(b % 10)).join("")
}

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] as string)

type Copy = {
    subject: string
    preheader: string
    heading: string
    intro: string
    codeLabel: string
    ignore: string
    plain: string
}

const COPY: Record<"verify" | "reset", Copy> = {
    verify: {
        subject: "Verify your email for WebflowX",
        preheader: "Your WebflowX verification code is inside. It expires in 15 minutes.",
        heading: "Confirm your email",
        intro: "Welcome to WebflowX. Enter this code on the sign-up screen to confirm your email address and finish creating your account.",
        codeLabel: "Your verification code",
        ignore: "If you didn't create a WebflowX account, you can safely ignore this email. No account will be activated.",
        plain: "Welcome to WebflowX. Enter this code to confirm your email address.",
    },
    reset: {
        subject: "Reset your WebflowX password",
        preheader: "Use this code to choose a new WebflowX password. It expires in 15 minutes.",
        heading: "Reset your password",
        intro: "We received a request to reset the password for your WebflowX account. Enter this code on the reset screen, then choose a new password.",
        codeLabel: "Your reset code",
        ignore: "If you didn't ask to reset your password, you can ignore this email. Your password won't change unless this code is used. If you're worried, contact us right away.",
        plain: "We received a request to reset your WebflowX password. Enter this code to choose a new one.",
    },
}

// Table layout + inline styles: the only thing that renders the same in Gmail, Outlook and Apple Mail.
const render = (c: Copy, token: string, siteUrl: string) => {
    const logo = `${siteUrl}/logo.png`
    const digits = token.split("").map((d) => `<td style="width:34px;height:48px;text-align:center;font:700 26px/48px 'SF Mono',Menlo,Consolas,monospace;color:#1b1017;background:#ffffff;border:1px solid #e6dcd5;border-radius:10px;">${esc(d)}</td><td style="width:6px"></td>`).join("")
    return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light only"><title>${esc(c.subject)}</title></head>
<body style="margin:0;padding:0;background:#f7f2ee;">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:#f7f2ee;">${esc(c.preheader)}&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f7f2ee;padding:32px 12px;">
<tr><td align="center">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;">
    <tr><td style="padding:0 4px 18px;">
      <table role="presentation" cellpadding="0" cellspacing="0"><tr>
        <td style="vertical-align:middle;"><img src="${esc(logo)}" width="32" height="32" alt="" style="display:block;border-radius:8px;border:0;"></td>
        <td style="padding-left:10px;font:700 18px/1 -apple-system,'Segoe UI',Helvetica,Arial,sans-serif;color:#381d2a;letter-spacing:-0.01em;">WebflowX</td>
      </tr></table>
    </td></tr>
    <tr><td style="background:#ffffff;border-radius:20px;border:1px solid #ecdfd6;overflow:hidden;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
        <tr><td style="height:5px;background:#ff5018;font-size:0;line-height:0;">&nbsp;</td></tr>
        <tr><td style="padding:36px 32px 8px;font-family:-apple-system,'Segoe UI',Helvetica,Arial,sans-serif;">
          <h1 style="margin:0 0 12px;font-size:26px;line-height:1.2;font-weight:700;color:#1b1017;letter-spacing:-0.02em;">${esc(c.heading)}</h1>
          <p style="margin:0;font-size:15px;line-height:1.6;color:#4a3a43;">${esc(c.intro)}</p>
        </td></tr>
        <tr><td style="padding:24px 32px 8px;font-family:-apple-system,'Segoe UI',Helvetica,Arial,sans-serif;">
          <div style="background:#fbf9f7;border:1px solid #efe5de;border-radius:16px;padding:20px 12px;text-align:center;">
            <p style="margin:0 0 12px;font-size:12px;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;color:#8a7782;">${esc(c.codeLabel)}</p>
            <table role="presentation" align="center" cellpadding="0" cellspacing="0"><tr>${digits}</tr></table>
            <p style="margin:14px 0 0;font-size:13px;color:#8a7782;">Expires in 15 minutes &middot; can only be used once</p>
          </div>
        </td></tr>
        <tr><td style="padding:20px 32px 34px;font-family:-apple-system,'Segoe UI',Helvetica,Arial,sans-serif;">
          <p style="margin:0 0 14px;font-size:13px;line-height:1.6;color:#6b5a63;">${esc(c.ignore)}</p>
          <p style="margin:0;font-size:13px;line-height:1.6;color:#6b5a63;"><strong style="color:#381d2a;">Never share this code.</strong> WebflowX will never ask you for it by phone, chat or email.</p>
        </td></tr>
      </table>
    </td></tr>
    <tr><td style="padding:20px 8px 0;text-align:center;font:12px/1.6 -apple-system,'Segoe UI',Helvetica,Arial,sans-serif;color:#8a7782;">
      Need help? Write to <a href="mailto:support@northfoundry.co" style="color:#ff5018;text-decoration:none;">support@northfoundry.co</a><br>
      WebflowX &middot; a North Foundry product<br>
      <a href="${esc(siteUrl)}/privacy" style="color:#8a7782;">Privacy</a> &middot; <a href="${esc(siteUrl)}/terms" style="color:#8a7782;">Terms</a>
    </td></tr>
  </table>
</td></tr></table>
</body></html>`
}

const sender = (id: string, kind: "verify" | "reset") =>
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
            const copy = COPY[kind]
            const from = process.env.AUTH_EMAIL_FROM ?? "WebflowX <onboarding@resend.dev>"
            const siteUrl = (process.env.SITE_URL ?? "https://webflow-x.vercel.app").replace(/\/$/, "")
            const res = await fetch("https://api.resend.com/emails", {
                method: "POST",
                headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
                body: JSON.stringify({
                    from,
                    to: [email],
                    reply_to: "support@northfoundry.co",
                    subject: copy.subject,
                    html: render(copy, token, siteUrl),
                    text: `${copy.plain}\n\nYour code: ${token}\n\nIt expires in 15 minutes and works once.\n${copy.ignore}\n\nNever share this code. Help: support@northfoundry.co`,
                    tags: [{ name: "type", value: kind === "reset" ? "password_reset" : "email_verification" }],
                }),
            })
            if (!res.ok) {
                // shows up in the Convex logs so a bad key / unverified domain is easy to spot
                console.error("Resend rejected the email:", res.status, await res.text().catch(() => ""))
                throw new Error("Could not send the email. Please try again.")
            }
        },
    })

export const ResendVerify = sender("resend-verify", "verify")
export const ResendReset = sender("resend-reset", "reset")
