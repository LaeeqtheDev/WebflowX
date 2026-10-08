import type { Prop, View, OptionColor, StatusGroup } from "../../../convex/dbTypes"

export type DbTemplate = {
  id: string
  name: string
  description: string
  icon: string
  properties: Prop[]
  views: View[]
  rows: { title: string; values: Record<string, unknown> }[]
}

const day = (n: number) => {
  const d = new Date()
  d.setDate(d.getDate() + n)
  const p = (x: number) => String(x).padStart(2, "0")
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}

const opt = (id: string, name: string, color: OptionColor, group?: StatusGroup) => (group ? { id, name, color, group } : { id, name, color })
const none = { match: "and" as const, conditions: [] }
const view = (id: string, name: string, type: View["type"], extra: Partial<View> = {}): View => ({
  id, name, type, filter: none, sorts: [], hidden: [], order: [], widths: {}, ...extra,
})

const STATUS = [opt("todo", "Not started", "gray", "todo"), opt("doing", "In progress", "blue", "progress"), opt("done", "Done", "green", "done")]

export const DB_TEMPLATES = (): DbTemplate[] => [
  {
    id: "tasks", name: "Task tracker", icon: "i:square-check", description: "Status, priority, owner and due date",
    properties: [
      { id: "status", name: "Status", type: "status", options: STATUS },
      { id: "priority", name: "Priority", type: "select", options: [opt("low", "Low", "green"), opt("med", "Medium", "yellow"), opt("high", "High", "red")] },
      { id: "assignee", name: "Assignee", type: "person" },
      { id: "due", name: "Due", type: "date" },
      { id: "tags", name: "Tags", type: "multiSelect", options: [opt("design", "Design", "pink"), opt("eng", "Engineering", "blue"), opt("ops", "Ops", "orange")] },
    ],
    views: [
      view("all", "All tasks", "table", { sorts: [{ propId: "due", dir: "asc" }] }),
      view("board", "Board", "board", { groupBy: "status" }),
      view("cal", "Calendar", "calendar", { dateProp: "due" }),
    ],
    rows: [
      { title: "Draft the launch announcement", values: { status: "doing", priority: "high", due: { start: day(2) }, tags: ["design"] } },
      { title: "Fix the signup email template", values: { status: "todo", priority: "med", due: { start: day(5) }, tags: ["eng"] } },
      { title: "Book the team offsite", values: { status: "todo", priority: "low", due: { start: day(12) }, tags: ["ops"] } },
      { title: "Set up the weekly report", values: { status: "done", priority: "med", due: { start: day(-3) }, tags: ["ops"] } },
    ],
  },
  {
    id: "crm", name: "Contacts and deals", icon: "i:handshake", description: "A light CRM with stages and deal value",
    properties: [
      { id: "stage", name: "Stage", type: "select", options: [opt("lead", "Lead", "gray"), opt("contacted", "Contacted", "blue"), opt("proposal", "Proposal", "purple"), opt("won", "Won", "green"), opt("lost", "Lost", "red")] },
      { id: "company", name: "Company", type: "text" },
      { id: "email", name: "Email", type: "email" },
      { id: "phone", name: "Phone", type: "phone" },
      { id: "value", name: "Deal value", type: "number", numberFormat: "usd" },
      { id: "next", name: "Next step", type: "date" },
      { id: "owner", name: "Owner", type: "person" },
    ],
    views: [
      view("all", "All contacts", "table"),
      view("pipeline", "Pipeline", "board", { groupBy: "stage" }),
      view("follow", "Follow-ups", "calendar", { dateProp: "next" }),
    ],
    rows: [
      { title: "Amina Rahman", values: { stage: "proposal", company: "Northwind", email: "amina@northwind.example", value: 12000, next: { start: day(3) } } },
      { title: "Jonas Weber", values: { stage: "contacted", company: "Fabrikam", email: "jonas@fabrikam.example", value: 4500, next: { start: day(7) } } },
      { title: "Priya Nair", values: { stage: "lead", company: "Contoso", email: "priya@contoso.example", value: 800 } },
    ],
  },
  {
    id: "content", name: "Content calendar", icon: "i:calendar-days", description: "Plan posts by channel and publish date",
    properties: [
      { id: "status", name: "Status", type: "status", options: [opt("idea", "Idea", "gray", "todo"), opt("draft", "Drafting", "blue", "progress"), opt("review", "In review", "yellow", "progress"), opt("live", "Published", "green", "done")] },
      { id: "channel", name: "Channel", type: "select", options: [opt("blog", "Blog", "orange"), opt("news", "Newsletter", "purple"), opt("li", "LinkedIn", "blue"), opt("x", "X", "gray"), opt("yt", "YouTube", "red")] },
      { id: "publish", name: "Publish date", type: "date" },
      { id: "author", name: "Author", type: "person" },
      { id: "link", name: "Link", type: "url" },
    ],
    views: [
      view("cal", "Calendar", "calendar", { dateProp: "publish" }),
      view("board", "Pipeline", "board", { groupBy: "status" }),
      view("all", "All posts", "table", { sorts: [{ propId: "publish", dir: "asc" }] }),
    ],
    rows: [
      { title: "How we plan a sprint", values: { status: "draft", channel: "blog", publish: { start: day(4) } } },
      { title: "October product update", values: { status: "review", channel: "news", publish: { start: day(8) } } },
      { title: "Behind the scenes thread", values: { status: "idea", channel: "x", publish: { start: day(11) } } },
    ],
  },
  {
    id: "bugs", name: "Bug tracker", icon: "i:bug", description: "Severity, status and where it was found",
    properties: [
      { id: "status", name: "Status", type: "status", options: [opt("open", "Open", "red", "todo"), opt("inv", "Investigating", "yellow", "progress"), opt("fixed", "Fixed", "green", "done")] },
      { id: "severity", name: "Severity", type: "select", options: [opt("minor", "Minor", "gray"), opt("major", "Major", "orange"), opt("crit", "Critical", "red")] },
      { id: "area", name: "Area", type: "multiSelect", options: [opt("web", "Web", "blue"), opt("api", "API", "purple"), opt("mobile", "Mobile", "pink")] },
      { id: "reporter", name: "Reporter", type: "person" },
      { id: "found", name: "Found on", type: "date" },
      { id: "link", name: "Link", type: "url" },
    ],
    views: [
      view("all", "All bugs", "table", { sorts: [{ propId: "severity", dir: "desc" }] }),
      view("board", "By status", "board", { groupBy: "status" }),
    ],
    rows: [
      { title: "Login redirects to a blank page", values: { status: "inv", severity: "crit", area: ["web"], found: { start: day(-1) } } },
      { title: "Export button misses the last row", values: { status: "open", severity: "major", area: ["web", "api"], found: { start: day(-2) } } },
      { title: "Typo in the invite email", values: { status: "fixed", severity: "minor", found: { start: day(-6) } } },
    ],
  },
  {
    id: "reading", name: "Reading list", icon: "i:book-open", description: "Books and articles with a rating",
    properties: [
      { id: "status", name: "Status", type: "status", options: [opt("want", "To read", "gray", "todo"), opt("reading", "Reading", "blue", "progress"), opt("read", "Finished", "green", "done")] },
      { id: "author", name: "Author", type: "text" },
      { id: "kind", name: "Type", type: "multiSelect", options: [opt("book", "Book", "brown"), opt("article", "Article", "orange"), opt("paper", "Paper", "purple")] },
      { id: "rating", name: "Rating", type: "select", options: [opt("1", "★", "gray"), opt("2", "★★", "yellow"), opt("3", "★★★", "orange"), opt("4", "★★★★", "green"), opt("5", "★★★★★", "green")] },
      { id: "finished", name: "Finished", type: "date" },
    ],
    views: [view("gallery", "Gallery", "gallery"), view("all", "Table", "table"), view("board", "Shelf", "board", { groupBy: "status" })],
    rows: [
      { title: "The Pragmatic Programmer", values: { status: "reading", author: "Hunt and Thomas", kind: ["book"] } },
      { title: "High Output Management", values: { status: "read", author: "Andrew Grove", kind: ["book"], rating: "5", finished: { start: day(-20) } } },
      { title: "Notes on building a habit", values: { status: "want", kind: ["article"] } },
    ],
  },
  {
    id: "projects", name: "Projects", icon: "i:rocket", description: "Owners, timeline and progress at a glance",
    properties: [
      { id: "status", name: "Status", type: "status", options: [opt("plan", "Planning", "gray", "todo"), opt("active", "Active", "blue", "progress"), opt("hold", "On hold", "yellow", "progress"), opt("done", "Complete", "green", "done")] },
      { id: "owner", name: "Owner", type: "person" },
      { id: "timeline", name: "Timeline", type: "date" },
      { id: "progress", name: "Progress", type: "number", numberFormat: "percent" },
      { id: "health", name: "Health", type: "select", options: [opt("good", "On track", "green"), opt("risk", "At risk", "orange"), opt("off", "Off track", "red")] },
    ],
    views: [view("all", "Table", "table"), view("board", "Board", "board", { groupBy: "status" }), view("gallery", "Gallery", "gallery")],
    rows: [
      { title: "Website relaunch", values: { status: "active", timeline: { start: day(-10), end: day(30) }, progress: 0.45, health: "good" } },
      { title: "Mobile app beta", values: { status: "plan", timeline: { start: day(14), end: day(75) }, progress: 0.05, health: "risk" } },
    ],
  },
]
