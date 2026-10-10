/**
 * Copy for the public marketing pages. Every claim here must match what the product does today
 * (see FAQ and pricing). Do not add compliance certifications, uptime guarantees or integrations
 * that do not exist.
 */

export type Faq = { q: string; a: string }
export type Section = { title: string; body: string; points?: string[] }
export type Page = {
  slug: string
  /** short name used in links and breadcrumbs */
  name: string
  title: string
  description: string
  h1: string
  lead: string
  sections: Section[]
  faqs: Faq[]
  related: string[]
}

export const PLANS = [
  { name: "Free", price: "0", blurb: "Up to 10 members and 5 channels, last 90 days of messages." },
  { name: "Startup", price: "29", blurb: "Per workspace per month. API keys, incoming webhooks and 5 guests." },
  { name: "Growth", price: "79", blurb: "Per workspace per month. Outgoing webhooks, GitHub connection, required two-step verification." },
  { name: "Enterprise", price: "249", blurb: "Per workspace per month. No limit on members, workspaces, channels, pages or database rows." },
] as const

export const FEATURES: Page[] = [
  {
    slug: "team-chat",
    name: "Team chat",
    title: "Team chat with channels, threads and direct messages",
    description: "Channels, threads, direct messages, reactions and file sharing in one workspace, with roles and locked channels. Flat workspace pricing, not per seat.",
    h1: "Team chat that sits next to your work",
    lead: "Public and locked channels, threads, direct messages, reactions and file sharing, in the same workspace as your tasks, pages and meetings.",
    sections: [
      { title: "Conversations", body: "Talk in channels, reply in threads and message people directly. Mentions, thread replies and direct messages can notify you by email or push if you have not already read them.", points: ["Channels, threads and direct messages", "Attach files and images to messages", "Per-member notification settings"] },
      { title: "Control who sees what", body: "Lock a channel to the people you add, or make it read-only for announcements. Direct messages are visible only to the people in them.", points: ["Locked and read-only channels", "Guests only see the channels you add them to", "Invite links that expire or can be switched off"] },
      { title: "History", body: "The Free plan shows the last 90 days of messages. Paid plans keep full history." },
    ],
    faqs: [
      { q: "Can I share files in chat?", a: "Yes. Attach files and images to messages. Uploads are checked for type and size, and each workspace has a storage cap that depends on its plan." },
      { q: "Can clients join without seeing everything?", a: "Yes. Guests only see the channels you add them to and cannot open tasks, notes, documents, meetings or direct messages." },
    ],
    related: ["tasks", "meetings", "permissions"],
  },
  {
    slug: "tasks",
    name: "Tasks",
    title: "Task management inside your team workspace",
    description: "Assign tasks, comment, set due dates and track work in the same place as your chat and docs. Email reminders for almost-due tasks.",
    h1: "Tasks, without leaving the conversation",
    lead: "Create and assign tasks, discuss them in comments and get reminded before they are due, in the same workspace where the conversation happens.",
    sections: [
      { title: "Plan and assign", body: "Create tasks, assign them to teammates and keep comments on the task itself so the context stays attached.", points: ["Assignees and due dates", "Task comments", "Notifications for assignments and almost-due tasks"] },
      { title: "Connect to other tools", body: "From the Startup plan, API keys and incoming webhooks let scripts and tools create tasks and read channels and tasks. Zapier and Make connect through the API and webhooks." },
    ],
    faqs: [
      { q: "Can tools create tasks automatically?", a: "Yes. From the Startup plan you can create API keys and incoming webhooks that create tasks and post messages." },
      { q: "Will I be reminded about due tasks?", a: "WebflowX emails you about task assignments, task comments and tasks that are almost due, but only if you have not already read them. Each member can switch this off." },
    ],
    related: ["team-chat", "calendar", "docs-and-databases"],
  },
  {
    slug: "docs-and-databases",
    name: "Docs, spreadsheets and databases",
    title: "Real-time docs, spreadsheets and databases for teams",
    description: "Write pages, spreadsheets and databases together in real time inside your team workspace. Plan limits per workspace, no per-seat fees.",
    h1: "Pages, spreadsheets and databases your team edits together",
    lead: "Write and edit pages, spreadsheets and databases with your team in real time, next to the chat and tasks that refer to them.",
    sections: [
      { title: "Edit together", body: "Collaborative pages and spreadsheets update live for everyone who has them open, so there is one current version.", points: ["Real-time collaborative pages", "Spreadsheets and databases", "Personal notes that stay private"] },
      { title: "Limits are per workspace", body: "Plans set limits on notes, pages and database rows per workspace. Enterprise has no limit on pages or database rows." },
    ],
    faqs: [
      { q: "Are personal notes visible to admins?", a: "Workspace exports leave out other people's personal notes, direct messages and channels the exporter cannot open." },
    ],
    related: ["tasks", "team-chat", "meetings"],
  },
  {
    slug: "meetings",
    name: "Video meetings",
    title: "Video meetings with live transcripts and AI summaries",
    description: "Host video meetings in your workspace, follow a live transcript and get an AI summary with action items and decisions afterwards.",
    h1: "Meetings that end with a written summary",
    lead: "Host video meetings inside your workspace, follow a live transcript and get an AI summary with key points, decisions and action items.",
    sections: [
      { title: "Scheduled, instant and one-to-one", body: "Moderators schedule or start workspace meetings. Members can start one-to-one calls from a direct message, which are capped at 15 minutes.", points: ["Scheduled and instant meetings", "One-to-one calls from direct messages", "Invitations arrive as notifications"] },
      { title: "Transcripts and summaries", body: "A live transcript runs during the meeting and an AI summary is available afterwards. The number of meetings and summaries per month depends on your plan." },
    ],
    faqs: [
      { q: "Who can start a meeting?", a: "Workspace meetings are started and scheduled by moderators and above, or by members who have been given that permission. Members can start one-to-one calls from a direct message." },
      { q: "Are meetings metered?", a: "Yes. Meetings and AI summaries are limited per workspace per month on each plan, because they have real per-use cost." },
    ],
    related: ["calendar", "tasks", "team-chat"],
  },
  {
    slug: "calendar",
    name: "Calendar",
    title: "Team calendar for meetings and due dates",
    description: "See scheduled meetings and task due dates in one calendar inside your team workspace.",
    h1: "One calendar for meetings and deadlines",
    lead: "Scheduled meetings and task due dates appear in one place, so the team can see what is coming up.",
    sections: [
      { title: "What you see", body: "Meetings you are invited to and tasks with due dates show on the workspace calendar.", points: ["Scheduled meetings", "Task due dates"] },
    ],
    faqs: [
      { q: "Can I schedule a meeting from the calendar view?", a: "Meetings are scheduled from the Meetings page by anyone allowed to start them; they then appear on the calendar." },
    ],
    related: ["meetings", "tasks"],
  },
  {
    slug: "permissions",
    name: "Roles and permissions",
    title: "Roles, permissions and audit log for team workspaces",
    description: "Four built-in roles, custom roles from 14 permissions, locked channels, guests and an audit log of admin actions. Enforced on the server.",
    h1: "Roles and permissions enforced on the server",
    lead: "Owner, admin, moderator and member roles, custom roles built from 14 permissions, and an audit log of admin actions.",
    sections: [
      { title: "Roles", body: "Four built-in roles plus custom roles. Permissions are checked on the server, not only hidden in the interface.", points: ["Owner, admin, moderator, member", "Custom roles from 14 permissions", "Ownership transfer"] },
      { title: "Accounts", body: "Anyone can add an authenticator app for two-step verification. On Growth and Enterprise, owners and admins can require it for everyone in the workspace." },
      { title: "Accountability", body: "Review an audit log of admin actions, and export your data. Owners and admins can export the workspace." },
    ],
    faqs: [
      { q: "Can I require two-step verification?", a: "Yes, on Growth and Enterprise, owners and admins can require it for everyone in the workspace." },
      { q: "Is there an audit log?", a: "Yes. Admin actions are recorded in an audit log that owners and admins can review." },
    ],
    related: ["team-chat", "meetings"],
  },
]

export const USE_CASES: Page[] = [
  {
    slug: "agencies",
    name: "Agencies",
    title: "Team workspace for agencies and client work",
    description: "Run client projects with shared channels, guests, tasks and meeting summaries in one workspace. Flat pricing instead of per-seat fees.",
    h1: "A workspace for agencies and their clients",
    lead: "WebflowX is built by North Foundry, an agency. Give each client a channel, invite them as guests and keep tasks, files and meeting notes in the same place.",
    sections: [
      { title: "Clients without the clutter", body: "Guests only see the channels you add them to. They cannot open tasks, notes, documents, meetings or direct messages. Startup includes 5 guests, Growth 25, Enterprise no limit." },
      { title: "Fewer tools to pay for", body: "Plans are priced per workspace, so adding a designer or contractor does not change the bill until you reach the member limit of your plan." },
    ],
    faqs: [{ q: "Can clients see internal channels?", a: "No. Guests only see channels you add them to." }],
    related: ["startups", "remote-teams"],
  },
  {
    slug: "startups",
    name: "Startups",
    title: "Team chat, tasks and docs for startups",
    description: "Replace several subscriptions with one workspace for chat, tasks, docs and meetings. Start free, upgrade per workspace.",
    h1: "One workspace for a small, fast team",
    lead: "Start on the Free plan with up to 10 members and 5 channels. Move to Startup at $29 per month for the workspace when you need more room.",
    sections: [
      { title: "Start free", body: "Chat, tasks, pages and meetings are available from the start, with limits that grow as you upgrade." },
      { title: "Grow without per-seat math", body: "Pricing is per workspace: Free $0, Startup $29, Growth $79, Enterprise $249 per month." },
    ],
    faqs: [{ q: "What does the Free plan include?", a: "Up to 10 members and 5 channels, with the last 90 days of messages visible." }],
    related: ["agencies", "remote-teams"],
  },
  {
    slug: "remote-teams",
    name: "Remote teams",
    title: "Workspace for remote and distributed teams",
    description: "Async-friendly chat, tasks and docs with video meetings, live transcripts and AI summaries for teams across time zones.",
    h1: "Stay in sync across time zones",
    lead: "Threads and notifications keep conversations moving without everyone online at once, and meeting summaries give people who missed the call the decisions and action items.",
    sections: [
      { title: "Catch up quickly", body: "Meeting transcripts and AI summaries list key points, decisions and action items." },
      { title: "Notify on your terms", body: "Email and push notifications are sent only for items you have not already read, and each member can switch them off." },
    ],
    faqs: [{ q: "Does it work on mobile?", a: "Yes. There is a mobile layout and you can install it to your home screen. Native mobile apps are not available yet." }],
    related: ["startups", "agencies"],
  },
]

export type Compare = Page & { vendor: string; rows: [string, string, string][] }

const note = "Competitor products change. Check each vendor's own site for its current plans and features."

export const COMPARISONS: Compare[] = [
  {
    slug: "slack-alternative",
    name: "WebflowX vs Slack",
    vendor: "Slack",
    title: "Slack alternative with built-in tasks, docs and meetings",
    description: "How WebflowX compares with Slack for teams that want chat, tasks, docs and meetings in one workspace with flat workspace pricing.",
    h1: "WebflowX vs Slack",
    lead: "Slack is a team messaging product. WebflowX adds tasks, pages, databases and meetings with AI summaries to the same workspace and prices per workspace.",
    rows: [
      ["Core idea", "Team messaging", "Chat, tasks, docs and meetings in one workspace"],
      ["Pricing model", "Priced per user", "Priced per workspace: $0, $29, $79, $249 per month"],
      ["Tasks and pages", "Typically via other apps", "Built in"],
      ["Video meetings", "Calls and huddles", "Meetings with live transcript and AI summary, metered per plan"],
      ["Ecosystem", "Large app directory", "API keys, webhooks, GitHub connection; Zapier and Make via API"],
    ],
    sections: [
      { title: "Where WebflowX fits", body: "Choose WebflowX if you want fewer tools and a flat price per workspace. Choose Slack if you depend on its large app directory or are already deeply invested in it. WebflowX does not yet have importers from Slack." },
      { title: "A note on accuracy", body: note },
    ],
    faqs: [{ q: "Can I import my Slack history?", a: "Not yet. Importers are on our roadmap but not available today." }],
    related: ["notion-alternative", "clickup-alternative"],
  },
  {
    slug: "notion-alternative",
    name: "WebflowX vs Notion",
    vendor: "Notion",
    title: "Notion alternative with team chat and meetings",
    description: "How WebflowX compares with Notion for teams that want docs and databases next to chat, tasks and video meetings.",
    h1: "WebflowX vs Notion",
    lead: "Notion is a documents and databases tool. WebflowX includes pages, spreadsheets and databases, and puts team chat, tasks and meetings in the same workspace.",
    rows: [
      ["Core idea", "Docs and databases", "Chat, tasks, docs and meetings in one workspace"],
      ["Pricing model", "Priced per user", "Priced per workspace: $0, $29, $79, $249 per month"],
      ["Team chat", "Comments and mentions on pages", "Channels, threads and direct messages"],
      ["Video meetings", "Not the main focus", "Built in with live transcript and AI summary"],
      ["Maturity of docs", "Very mature", "Real-time pages, spreadsheets and databases; younger product"],
    ],
    sections: [
      { title: "Where WebflowX fits", body: "Choose WebflowX if conversation and meetings are as important to your team as documents. Choose Notion if long-form documentation and wikis are your main need. WebflowX does not yet have importers from Notion." },
      { title: "A note on accuracy", body: note },
    ],
    faqs: [{ q: "Can I import from Notion?", a: "Not yet. Importers are not available today." }],
    related: ["slack-alternative", "clickup-alternative"],
  },
  {
    slug: "clickup-alternative",
    name: "WebflowX vs ClickUp",
    vendor: "ClickUp",
    title: "ClickUp alternative with chat and video meetings",
    description: "How WebflowX compares with ClickUp for teams that want tasks together with team chat, docs and meetings under flat workspace pricing.",
    h1: "WebflowX vs ClickUp",
    lead: "ClickUp is a project management product with many views and features. WebflowX is simpler on tasks and stronger on conversation, with chat and meetings built in.",
    rows: [
      ["Core idea", "Project management", "Chat, tasks, docs and meetings in one workspace"],
      ["Pricing model", "Priced per user", "Priced per workspace: $0, $29, $79, $249 per month"],
      ["Task depth", "Extensive project features", "Assignees, due dates, comments, reminders"],
      ["Team chat", "Available", "Channels, threads and direct messages at the center"],
      ["Video meetings", "Available", "Live transcript and AI summary with action items"],
    ],
    sections: [
      { title: "Where WebflowX fits", body: "Choose WebflowX for a lighter task tool tied closely to conversation. Choose ClickUp if you need advanced project management views and reporting." },
      { title: "A note on accuracy", body: note },
    ],
    faqs: [{ q: "Does WebflowX have Gantt charts?", a: "No. Tasks have assignees, due dates and comments; advanced project views are not available." }],
    related: ["slack-alternative", "notion-alternative"],
  },
]

export const SITE_FAQS: Faq[] = [
  { q: "How much does WebflowX cost?", a: "There are four plans per workspace per month: Free ($0), Startup ($29), Growth ($79) and Enterprise ($249)." },
  { q: "Is pricing per seat?", a: "No. Plans are priced per workspace, with member limits that rise with the plan." },
  { q: "Does WebflowX support video calls?", a: "Yes. Host meetings in your workspace, follow a live transcript and get an AI summary with action items afterwards." },
  { q: "Can I export my data?", a: "Yes. Anyone can download their own data, and owners and admins can export the workspace." },
]

export type ChangelogEntry = { date: string; title: string; points: string[] }

/** Newest first. Only list things that shipped. */
export const CHANGELOG: ChangelogEntry[] = [
  {
    date: "2026-10-10",
    title: "A guided tour, templates and six languages for setup",
    points: [
      "New workspaces get an optional practice tour: send a message, use / for AI, turn a message into a task, write a page and run a meeting. At the end you choose what to keep.",
      "Start from a template (agency, software team, support, startup, remote team) to get its channels, starter tasks and a note.",
      "Setup and the tour are available in English, Spanish, French, German, Portuguese and Hindi. The rest of the app is English for now.",
      "New Trust, DPA and Subprocessors pages, and an explanation on the pricing page of why meetings and AI summaries have monthly caps.",
    ],
  },
  {
    date: "2026-10-10",
    title: "Messages stay when someone leaves",
    points: [
      "When a person leaves or is removed, their channel messages and reactions now stay, shown as a former member.",
      "Free plan: kept for 90 days, then erased. Paid plans keep full history, so they stay.",
      "Direct messages are still removed when a person leaves.",
    ],
  },
  {
    date: "2026-10-09",
    title: "Importers, audit log search and a faster public site",
    points: [
      "Import Slack export channels and Notion export pages into a workspace (Settings, Import).",
      "Audit log: search by person, action or detail, export to CSV, and see the last 500 entries.",
      "Public pages (features, use cases, comparisons, security) are served as static pages.",
      "Stricter Content-Security-Policy on the signed-in app.",
      "Sign-in code emails are rate limited per mailbox.",
    ],
  },
  {
    date: "2026-10-08",
    title: "Meetings: who can start them, and one-to-one calls",
    points: [
      "Workspace meetings are started and scheduled by moderators and above, or by members given that permission.",
      "Members can start a one-to-one call from a direct message. These end after 15 minutes.",
      "Schedule meetings ahead, invite people, and delete or cancel a meeting.",
      "Meeting invitations arrive as notifications.",
    ],
  },
  {
    date: "2026-10-07",
    title: "Speed",
    points: [
      "Visited pages are kept in the browser for a short time so moving between sections feels instant.",
      "The editor, renderer and thread views load in the background when the browser is idle.",
      "A jump-to-latest button in channels.",
    ],
  },
]

export type CaseStudy = {
  slug: string
  name: string
  title: string
  description: string
  client: string
  summary: string
  challenge: string
  approach: string
  /** Real, checkable outcomes only. Do not add a number you cannot show evidence for. */
  results: string[]
  published: string
}

/**
 * Add a case study here only after the client has approved the text and every figure is real.
 * Until there is at least one entry, /case-studies is marked noindex and left out of the sitemap.
 */
export const CASE_STUDIES: CaseStudy[] = []
