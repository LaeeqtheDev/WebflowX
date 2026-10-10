// Shared HTML shell for every WebflowX email (codes, notifications).
// Table layout + inline styles only: that is what renders the same in Gmail, Outlook and Apple Mail.
// No remote images on purpose: the logo is drawn with CSS, so it can never show up as a broken image
// when a client blocks images or the site URL is unreachable.

export const esc = (s: string) =>
    s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] as string)

export const FONT = "-apple-system,'Segoe UI',Helvetica,Arial,sans-serif"

export const siteUrl = () => (process.env.SITE_URL ?? "https://webflowx.northfoundry.co").replace(/\/$/, "")

export const emailFrom = () => process.env.AUTH_EMAIL_FROM

type Shell = {
    title: string
    preheader: string
    heading: string
    // already-escaped HTML for the card body, below the heading
    body: string
    // optional main button
    cta?: { label: string; url: string }
    // small print under the card body (already escaped)
    note?: string
    // extra line in the page footer (already escaped)
    footerExtra?: string
}

export const shell = (o: Shell): string => {
    const site = siteUrl()
    const cta = o.cta
        ? `<tr><td style="padding:4px 32px 8px;font-family:${FONT};">
            <a href="${esc(o.cta.url)}" style="display:inline-block;background:#ff5018;color:#ffffff;text-decoration:none;font-weight:600;font-size:15px;line-height:1;padding:14px 22px;border-radius:12px;">${esc(o.cta.label)}</a>
          </td></tr>`
        : ""
    const note = o.note
        ? `<tr><td style="padding:18px 32px 32px;font-family:${FONT};font-size:13px;line-height:1.6;color:#6b5a63;">${o.note}</td></tr>`
        : `<tr><td style="height:24px;font-size:0;line-height:0;">&nbsp;</td></tr>`
    return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light only"><title>${esc(o.title)}</title></head>
<body style="margin:0;padding:0;background:#f7f2ee;">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:#f7f2ee;">${esc(o.preheader)}&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f7f2ee;padding:32px 12px;">
<tr><td align="center">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;">
    <tr><td style="padding:0 4px 18px;">
      <table role="presentation" cellpadding="0" cellspacing="0"><tr>
        <td width="34" height="34" align="center" valign="middle" style="width:34px;height:34px;background:#ff5018;border-radius:10px;font-family:${FONT};font-size:20px;line-height:34px;font-weight:800;color:#ffffff;text-align:center;">X</td>
        <td style="padding-left:10px;font-family:${FONT};font-size:19px;line-height:34px;font-weight:700;color:#381d2a;letter-spacing:-0.01em;">WebflowX</td>
      </tr></table>
    </td></tr>
    <tr><td style="background:#ffffff;border-radius:20px;border:1px solid #ecdfd6;overflow:hidden;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
        <tr><td style="height:5px;background:#ff5018;font-size:0;line-height:0;">&nbsp;</td></tr>
        <tr><td style="padding:36px 32px 8px;font-family:${FONT};">
          <h1 style="margin:0 0 12px;font-size:26px;line-height:1.2;font-weight:700;color:#1b1017;letter-spacing:-0.02em;">${esc(o.heading)}</h1>
        </td></tr>
        ${o.body}
        ${cta}
        ${note}
      </table>
    </td></tr>
    <tr><td style="padding:20px 8px 0;text-align:center;font-family:${FONT};font-size:12px;line-height:1.7;color:#6b5a63;">
      ${o.footerExtra ? o.footerExtra + "<br>" : ""}Need help? Write to <a href="mailto:support@northfoundry.co" style="color:#c2370d;text-decoration:none;">support@northfoundry.co</a><br>
      WebflowX &middot; a North Foundry product<br>
      <a href="${esc(site)}/privacy" style="color:#6b5a63;">Privacy</a> &middot; <a href="${esc(site)}/terms" style="color:#6b5a63;">Terms</a>
    </td></tr>
  </table>
</td></tr></table>
</body></html>`
}

// A paragraph row for the card body.
export const para = (html: string) =>
    `<tr><td style="padding:0 32px 14px;font-family:${FONT};font-size:15px;line-height:1.6;color:#4a3a43;">${html}</td></tr>`

// Sends one email through Resend's HTTP API. Returns true when Resend accepted it.
export async function sendResend(opts: { to: string; subject: string; html: string; text: string; tag: string }): Promise<boolean> {
    const key = process.env.AUTH_RESEND_KEY
    const from = emailFrom()
    if (!key || !from) {
        console.error("Email not sent: set AUTH_RESEND_KEY and AUTH_EMAIL_FROM on the Convex deployment")
        return false
    }
    const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
        body: JSON.stringify({
            from,
            to: [opts.to],
            reply_to: "support@northfoundry.co",
            subject: opts.subject,
            html: opts.html,
            text: opts.text,
            tags: [{ name: "type", value: opts.tag }],
        }),
    })
    if (!res.ok) {
        console.error("Resend rejected the email:", res.status, await res.text().catch(() => ""))
        return false
    }
    return true
}

// ---- sign-in code emails (verify / reset) ----

export type Copy = {
    subject: string
    preheader: string
    heading: string
    intro: string
    codeLabel: string
    ignore: string
    plain: string
}

export const COPY: Record<"verify" | "reset", Copy> = {
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

export const renderCodeEmail = (c: Copy, token: string) => {
    const digits = token.split("").map((d) => `<td style="width:34px;height:48px;text-align:center;font:700 26px/48px 'SF Mono',Menlo,Consolas,monospace;color:#1b1017;background:#ffffff;border:1px solid #e6dcd5;border-radius:10px;">${esc(d)}</td><td style="width:6px"></td>`).join("")
    const body = [
        para(esc(c.intro)),
        `<tr><td style="padding:10px 32px 8px;font-family:${FONT};">
          <div style="background:#fbf9f7;border:1px solid #efe5de;border-radius:16px;padding:20px 12px;text-align:center;">
            <p style="margin:0 0 12px;font-size:12px;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;color:#6b5a63;">${esc(c.codeLabel)}</p>
            <table role="presentation" align="center" cellpadding="0" cellspacing="0"><tr>${digits}</tr></table>
            <p style="margin:14px 0 0;font-size:13px;color:#6b5a63;">Expires in 15 minutes &middot; can only be used once</p>
          </div>
        </td></tr>`,
    ].join("")
    return shell({
        title: c.subject,
        preheader: c.preheader,
        heading: c.heading,
        body,
        note: `<p style="margin:0 0 14px;">${esc(c.ignore)}</p><p style="margin:0;"><strong style="color:#381d2a;">Never share this code.</strong> WebflowX will never ask you for it by phone, chat or email.</p>`,
    })
}

