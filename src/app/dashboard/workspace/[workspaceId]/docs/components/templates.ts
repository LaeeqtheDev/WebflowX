export type DocTemplateId = "blank" | "meeting" | "brief" | "weekly" | "checklist" | "prd" | "retro" | "oneonone" | "onboarding" | "wiki"

// Small builders so every template is real structure (callouts, tables, task lists), not just headings.
const p = (t = "") => `<p>${t}</p>`
const h1 = (t: string) => `<h1>${t}</h1>`
const h2 = (t: string) => `<h2>${t}</h2>`
const h3 = (t: string) => `<h3>${t}</h3>`
const ul = (items: string[]) => `<ul>${items.map((i) => `<li><p>${i}</p></li>`).join("")}</ul>`
const ol = (items: string[]) => `<ol>${items.map((i) => `<li><p>${i}</p></li>`).join("")}</ol>`
const todo = (items: string[]) =>
    `<ul data-type="taskList">${items.map((i) => `<li data-type="taskItem" data-checked="false"><label><input type="checkbox"><span></span></label><div><p>${i}</p></div></li>`).join("")}</ul>`
const callout = (tone: "note" | "tip" | "warn", inner: string) => `<div data-type="callout" data-tone="${tone}">${inner}</div>`
const table = (head: string[], rows: string[][]) =>
    `<table><tbody><tr>${head.map((c) => `<th><p>${c}</p></th>`).join("")}</tr>${rows.map((r) => `<tr>${r.map((c) => `<td><p>${c}</p></td>`).join("")}</tr>`).join("")}</tbody></table>`
const hr = "<hr>"

export const DOC_TEMPLATES: { id: DocTemplateId; name: string; description: string; icon: string; html: string }[] = [
    { id: "blank", name: "Blank", description: "Start from scratch", icon: "i:file-text", html: "" },
    {
        id: "meeting", name: "Meeting notes", description: "Agenda, notes, action items", icon: "i:notebook",
        html:
            h1("Meeting notes") +
            table(["Date", "Attendees", "Facilitator"], [["Add the date", "Who was there", "Who ran it"]]) +
            callout("note", h3("Purpose") + p("One sentence on why this meeting is happening and what a good outcome looks like.")) +
            h2("Agenda") + ol(["Quick updates", "Main topic", "Open questions"]) +
            h2("Discussion") + p("Capture the key points, not a transcript.") + ul(["Point raised and by whom", "Context or data that mattered"]) +
            h2("Decisions") + ul(["What we decided, and why"]) +
            h2("Action items") + todo(["Owner: task, due date", "Owner: task, due date"]),
    },
    {
        id: "brief", name: "Project brief", description: "Goal, scope, timeline, risks", icon: "i:target",
        html:
            h1("Project brief") +
            callout("note", h3("In one line") + p("What we are building, for whom, and the result we want.")) +
            h2("Goal") + p("What are we trying to achieve, and why now?") +
            h2("Scope") + h3("In scope") + ul(["The core deliverable", "What the first release includes"]) + h3("Out of scope") + ul(["What we are deliberately not doing"]) +
            h2("Timeline") + table(["Milestone", "Owner", "Target date", "Status"], [["Kickoff", "", "", "Not started"], ["First draft", "", "", "Not started"], ["Launch", "", "", "Not started"]]) +
            h2("Risks and open questions") + callout("warn", h3("Biggest risk") + p("Name the one thing most likely to derail this and how you will handle it.")) + ul(["Open question"]),
    },
    {
        id: "weekly", name: "Weekly update", description: "Wins, progress, blockers", icon: "i:calendar-days",
        html:
            h1("Weekly update") +
            p("<em>Week of: add the date</em>") +
            callout("tip", h3("Headline") + p("The single most important thing from this week.")) +
            h2("Wins") + ul(["Something that shipped or went well"]) +
            h2("In progress") + table(["Work", "Owner", "Status"], [["Task or project", "", "On track"], ["Task or project", "", "At risk"]]) +
            h2("Blockers") + callout("warn", p("Anything that needs help from someone else, and who you need it from.")) +
            h2("Next week") + todo(["Top priority", "Second priority"]),
    },
    {
        id: "checklist", name: "Checklist", description: "A simple to-do list", icon: "i:square-check",
        html:
            h1("Checklist") +
            p("Tick things off as you go. Press Tab to nest a step under another.") +
            h2("To do") + todo(["First thing", "Second thing", "Third thing"]) +
            h2("Later") + todo(["Something that can wait"]),
    },
    {
        id: "prd", name: "Product spec", description: "Problem, goals, requirements, launch plan", icon: "i:ruler",
        html:
            h1("Product spec") +
            table(["Owner", "Status", "Target release"], [["Add a name", "Draft", "Add a date"]]) +
            h2("Problem") + callout("note", p("What is going wrong today, for whom, and how do we know? Include a quote or number if you have one.")) +
            h2("Goals and non-goals") + h3("Goals") + ul(["What success looks like"]) + h3("Non-goals") + ul(["What this will not try to solve"]) +
            h2("User stories") + ul(["As a [type of user], I want [action], so that [outcome]."]) +
            h2("Requirements") + table(["Requirement", "Priority", "Notes"], [["Must have", "P0", ""], ["Should have", "P1", ""], ["Nice to have", "P2", ""]]) +
            h2("Launch plan") + todo(["Design signed off", "Build complete", "QA and review", "Announce to customers"]) +
            h2("Open questions") + callout("warn", ul(["Question that could change the plan"])),
    },
    {
        id: "retro", name: "Retrospective", description: "What went well, what didn't, what we'll change", icon: "i:repeat",
        html:
            h1("Retrospective") +
            p("<em>Sprint or project: add a name. Be honest and kind; this is about the work, not the people.</em>") +
            h2("What went well") + callout("tip", ul(["Something to keep doing"])) +
            h2("What didn't") + callout("warn", ul(["Something that slowed us down"])) +
            h2("What we'll change") + todo(["Concrete change, with an owner"]) +
            h2("Shout-outs") + ul(["Thank someone for something specific"]),
    },
    {
        id: "oneonone", name: "1:1 notes", description: "Topics, feedback, follow-ups", icon: "i:users",
        html:
            h1("1:1") +
            table(["With", "Date", "Mood"], [["Their name", "Add the date", "How are they doing?"]]) +
            h2("Topics") + ul(["What they want to talk about first", "What I want to cover"]) +
            h2("Feedback") + h3("What is going well") + p("") + h3("What to improve") + p("") +
            h2("Career and growth") + callout("note", p("Skills they want to build, projects they are excited about.")) +
            h2("Follow-ups") + todo(["Me: action", "Them: action"]),
    },
    {
        id: "onboarding", name: "Onboarding plan", description: "A checklist for someone's first weeks", icon: "i:hand",
        html:
            h1("Onboarding plan") +
            table(["New teammate", "Start date", "Buddy", "Manager"], [["Name", "Date", "Name", "Name"]]) +
            callout("tip", p("By the end of week four they should know the product, the team, and have shipped something real.")) +
            h2("Before day one") + todo(["Accounts and equipment ready", "Welcome message sent", "First-week calendar booked"]) +
            h2("Week 1: get oriented") + todo(["Meet the team", "Read the wiki and product overview", "Set up the dev or work environment", "Small first task"]) +
            h2("Weeks 2 to 3: contribute") + todo(["Own a small project", "Shadow a customer call", "First feedback chat"]) +
            h2("Week 4: look back") + todo(["30-day review with manager", "Agree goals for the next quarter"]),
    },
    {
        id: "wiki", name: "Wiki home", description: "A landing page for a team's knowledge", icon: "i:house",
        html:
            h1("Team wiki") +
            callout("note", p("Start here. Add sub-pages for each topic from the page tree, then link them below so nothing gets lost.")) +
            h2("How we work") + ul(["Rituals and meeting rhythm", "How decisions get made", "How to ask for help"]) +
            h2("Tools and links") + table(["Tool", "What it's for", "Link"], [["Add a tool", "What we use it for", "Paste the URL"]]) +
            h2("Who to ask") + table(["Topic", "Person"], [["Product", "Name"], ["Engineering", "Name"], ["Design", "Name"]]) +
            hr + p("<em>Keep this page short. If a section grows, move it to its own sub-page.</em>"),
    },
]

export const templateHtml = (id: string | null | undefined) =>
    DOC_TEMPLATES.find((t) => t.id === id)?.html ?? ""
