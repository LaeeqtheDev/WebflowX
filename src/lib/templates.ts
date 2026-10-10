/**
 * Starter templates. Each one is applied for real during onboarding: the channels are created,
 * and the tasks and the note are added to the new workspace. Keep it small so it fits the Free plan.
 */

export type TemplateTask = { title: string; status: "backlog" | "todo" | "in_progress" | "in_review" | "done"; priority: "urgent" | "high" | "medium" | "low" }
export type Template = {
  key: string
  name: string
  audience: string
  description: string
  /** max 4 so it fits the Free plan (5 channels including #general) */
  channels: string[]
  tasks: TemplateTask[]
  note: { title: string; body: string }
  /** matching page under /use-cases, if there is one */
  useCase?: string
}

export const TEMPLATES: Template[] = [
  {
    key: "agency",
    name: "Agency",
    audience: "Studios and agencies working with clients",
    description: "A channel per rhythm of agency work, a client onboarding checklist and a project brief note.",
    channels: ["clients", "delivery", "design", "announcements"],
    tasks: [
      { title: "Send the kickoff questionnaire to the client", status: "todo", priority: "high" },
      { title: "Agree scope, deadlines and who approves what", status: "todo", priority: "high" },
      { title: "Share the first round of work for feedback", status: "backlog", priority: "medium" },
    ],
    note: { title: "Project brief template", body: "Client:\nGoal of the project:\nDeliverables:\nDeadline:\nWho approves:\nRisks and open questions:\n" },
    useCase: "agencies",
  },
  {
    key: "software",
    name: "Software team",
    audience: "Product and engineering teams",
    description: "Engineering and release channels, a starter backlog and a bug report note to copy.",
    channels: ["engineering", "releases", "bugs", "product-roadmap"],
    tasks: [
      { title: "Set up the repo and the deploy pipeline", status: "todo", priority: "high" },
      { title: "Write the definition of done for this team", status: "backlog", priority: "medium" },
      { title: "Triage the open bug list", status: "backlog", priority: "medium" },
    ],
    note: { title: "Bug report template", body: "What happened:\nWhat you expected:\nSteps to reproduce:\nEnvironment (browser, version):\nScreenshots or logs:\n" },
  },
  {
    key: "support",
    name: "Customer support",
    audience: "Support and success teams",
    description: "Channels for the queue and escalations, a first-week checklist and a macro note for replies.",
    channels: ["support-queue", "escalations", "feedback", "knowledge-base"],
    tasks: [
      { title: "Write the first five canned replies", status: "todo", priority: "high" },
      { title: "Decide what counts as an escalation", status: "todo", priority: "high" },
      { title: "Review last week's feedback and tag themes", status: "backlog", priority: "low" },
    ],
    note: { title: "Reply macros", body: "Greeting:\nWe found the problem:\nWe need more detail:\nKnown issue, fix in progress:\nClosing:\n" },
  },
  {
    key: "startup",
    name: "Startup",
    audience: "Small founding teams",
    description: "A lean set of channels, a launch checklist and a weekly update note.",
    channels: ["general-updates", "product", "growth", "ideas"],
    tasks: [
      { title: "Write down this quarter's three goals", status: "todo", priority: "urgent" },
      { title: "Pick the one metric the team reviews weekly", status: "todo", priority: "high" },
      { title: "Plan the launch checklist", status: "backlog", priority: "medium" },
    ],
    note: { title: "Weekly update", body: "What shipped:\nWhat is blocked:\nNumbers:\nNext week:\n" },
    useCase: "startups",
  },
  {
    key: "remote",
    name: "Remote team",
    audience: "Teams spread across time zones",
    description: "Channels for async updates and social chatter, a working-agreements task and a standup note.",
    channels: ["async-updates", "standup", "watercooler", "announcements"],
    tasks: [
      { title: "Agree overlap hours and response times", status: "todo", priority: "high" },
      { title: "Choose where decisions get written down", status: "todo", priority: "medium" },
      { title: "Schedule the first team call", status: "backlog", priority: "low" },
    ],
    note: { title: "Async standup", body: "Yesterday:\nToday:\nBlocked on:\n" },
    useCase: "remote-teams",
  },
]

export const getTemplate = (key: string | null | undefined) => TEMPLATES.find((t) => t.key === key)
