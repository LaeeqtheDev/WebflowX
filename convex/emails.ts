import { v } from "convex/values"
import { internalAction, internalMutation } from "./_generated/server"
import { internal } from "./_generated/api"
import { canAccessChannel } from "./permissions"
import { consume } from "./rateLimit"
import { esc, FONT, para, shell, sendResend, siteUrl } from "./emailLayout"

// Quill delta JSON -> plain text (mentions are plain "@Name" text in the delta).
const deltaText = (body: string): string => {
    try {
        const parsed = JSON.parse(body)
        const ops: { insert?: unknown }[] = Array.isArray(parsed) ? parsed : (parsed?.ops ?? [])
        return ops.map((o) => (typeof o.insert === "string" ? o.insert : "")).join("").replace(/\s+/g, " ").trim()
    } catch {
        return body
    }
}

const clip = (s: string, n: number) => (s.length > n ? s.slice(0, n - 1).trimEnd() + "…" : s)

// Decides whether an email should go out for this notification and gathers everything it needs.
// Returns null when nothing should be sent (already read, switched off, no access, over the hourly cap).
export const prepare = internalMutation({
    args: { notificationId: v.id("notifications") },
    handler: async (ctx, args) => {
        const n = await ctx.db.get(args.notificationId)
        if (!n || n.read) return null

        const recipient = await ctx.db.get(n.recipientId)
        if (!recipient) return null
        const user = await ctx.db.get(recipient.userId)
        if (!user?.email || user.emailNotifications === false) return null

        const workspace = await ctx.db.get(n.workspaceId)
        if (!workspace) return null

        const sender = await ctx.db.get(n.senderId)
        const senderUser = sender ? await ctx.db.get(sender.userId) : null
        const senderName = senderUser?.name ?? "Someone"

        const channel = n.channelId ? await ctx.db.get(n.channelId) : null
        if (channel && !canAccessChannel(workspace, recipient, channel)) return null

        // at most 6 emails an hour per person, however busy the workspace is
        if (!(await consume(ctx, `email:${user._id}`, 6, 60 * 60_000))) return null

        const base = `${siteUrl()}/dashboard/workspace/${n.workspaceId}`
        const isMessage = n.type === "mention" || n.type === "dm_received" || n.type === "thread_reply"
        const snippet = clip(isMessage ? deltaText(n.body ?? "") : (n.body ?? ""), 280)
        const where = channel ? `#${channel.name}` : ""

        let subject: string, heading: string, line: string, link: string, cta: string
        switch (n.type) {
            case "mention":
                subject = `${senderName} mentioned you${where ? ` in ${where}` : ""}`
                heading = "You were mentioned"
                line = `${senderName} mentioned you${where ? ` in ${where}` : ""} in ${workspace.name}.`
                link = channel ? `${base}/channel/${channel._id}` : base
                cta = "View message"
                break
            case "dm_received":
                subject = `${senderName} sent you a message`
                heading = "New direct message"
                line = `${senderName} sent you a message in ${workspace.name}.`
                link = `${base}/member/${n.senderId}`
                cta = "Reply"
                break
            case "thread_reply":
                subject = `${senderName} replied to your message`
                heading = "New reply"
                line = `${senderName} replied in a thread you're part of${where ? ` in ${where}` : ""}, in ${workspace.name}.`
                link = channel ? `${base}/channel/${channel._id}` : `${base}/member/${n.senderId}`
                cta = "View thread"
                break
            case "task_assigned":
                subject = `${senderName} assigned you a task`
                heading = "A task was assigned to you"
                line = `${senderName} assigned you a task in ${workspace.name}.`
                link = `${base}/tasks`
                cta = "Open tasks"
                break
            case "task_comment":
                subject = `${senderName} commented on your task`
                heading = "New comment on your task"
                line = `${senderName} commented on a task assigned to you in ${workspace.name}.`
                link = `${base}/tasks`
                cta = "Open tasks"
                break
            default:
                return null
        }

        return { to: user.email, name: user.name ?? "", subject, heading, line, snippet, link, cta, workspaceName: workspace.name }
    },
})

// Runs a few minutes after a notification is created; sends the email only if it is still unread.
export const sendNotification = internalAction({
    args: { notificationId: v.id("notifications") },
    handler: async (ctx, args): Promise<void> => {
        if (!process.env.AUTH_RESEND_KEY || !process.env.AUTH_EMAIL_FROM) return // email not set up on this deployment
        const p = await ctx.runMutation(internal.emails.prepare, { notificationId: args.notificationId })
        if (!p) return

        const quote = p.snippet
            ? `<tr><td style="padding:2px 32px 14px;font-family:${FONT};">
                <div style="border-left:3px solid #ff5018;background:#fbf9f7;border-radius:0 12px 12px 0;padding:12px 16px;font-size:15px;line-height:1.6;color:#1b1017;">${esc(p.snippet)}</div>
              </td></tr>`
            : ""
        const html = shell({
            title: p.subject,
            preheader: p.snippet || p.line,
            heading: p.heading,
            body: para(esc(p.line)) + quote,
            cta: { label: p.cta, url: p.link },
            note: `You can read this in WebflowX any time. To stop these emails, open your profile menu, choose <strong style="color:#381d2a;">Edit profile</strong> and turn off <strong style="color:#381d2a;">Email notifications</strong>.`,
        })
        await sendResend({
            to: p.to,
            subject: p.subject,
            html,
            text: `${p.line}\n\n${p.snippet ? `"${p.snippet}"\n\n` : ""}${p.cta}: ${p.link}\n\nTo stop these emails, turn off "Email notifications" in Edit profile.\nHelp: support@northfoundry.co`,
            tag: "notification",
        })
    },
})
