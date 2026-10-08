export type DocTemplateId = "blank" | "meeting" | "brief" | "weekly" | "checklist" | "prd" | "retro" | "oneonone" | "onboarding" | "wiki"

export const DOC_TEMPLATES: { id: DocTemplateId; name: string; description: string; icon: string; html: string }[] = [
    { id: "blank", name: "Blank", description: "Start from scratch", icon: "i:file-text", html: "" },
    {
        id: "meeting", name: "Meeting notes", description: "Agenda, notes, action items", icon: "i:notebook",
        html: `<h1>Meeting notes</h1><p><strong>Date:</strong> &nbsp;&nbsp; <strong>Attendees:</strong> </p><h2>Agenda</h2><ul><li><p></p></li></ul><h2>Discussion</h2><p></p><h2>Decisions</h2><ul><li><p></p></li></ul><h2>Action items</h2><ul data-type="taskList"><li data-type="taskItem" data-checked="false"><label><input type="checkbox"><span></span></label><div><p></p></div></li></ul>`,
    },
    {
        id: "brief", name: "Project brief", description: "Goal, scope, timeline, risks", icon: "i:target",
        html: `<h1>Project brief</h1><h2>Goal</h2><p>What are we trying to achieve, and why now?</p><h2>Scope</h2><ul><li><p>In scope</p></li><li><p>Out of scope</p></li></ul><h2>Timeline</h2><p></p><h2>Owners</h2><p></p><h2>Risks &amp; open questions</h2><ul><li><p></p></li></ul>`,
    },
    {
        id: "weekly", name: "Weekly update", description: "Wins, progress, blockers", icon: "i:calendar-days",
        html: `<h1>Weekly update</h1><h2>Wins</h2><ul><li><p></p></li></ul><h2>In progress</h2><ul><li><p></p></li></ul><h2>Blockers</h2><ul><li><p></p></li></ul><h2>Next week</h2><ul><li><p></p></li></ul>`,
    },
    {
        id: "checklist", name: "Checklist", description: "A simple to-do list", icon: "i:square-check",
        html: `<h1>Checklist</h1><ul data-type="taskList"><li data-type="taskItem" data-checked="false"><label><input type="checkbox"><span></span></label><div><p></p></div></li></ul>`,
    },
    {
        id: "prd", name: "Product spec", description: "Problem, goals, requirements, launch plan", icon: "i:ruler",
        html: `<h1>Product spec</h1><h2>Problem</h2><p>What is going wrong today, and for whom?</p><h2>Goals and non-goals</h2><ul><li><p>Goal</p></li><li><p>Non-goal</p></li></ul><h2>Requirements</h2><ul data-type="taskList"><li data-type="taskItem" data-checked="false"><label><input type="checkbox"><span></span></label><div><p></p></div></li></ul><h2>Open questions</h2><ul><li><p></p></li></ul><h2>Launch plan</h2><p></p>`,
    },
    {
        id: "retro", name: "Retrospective", description: "What went well, what didn't, what we'll change", icon: "i:repeat",
        html: `<h1>Retrospective</h1><h2>What went well</h2><ul><li><p></p></li></ul><h2>What didn't</h2><ul><li><p></p></li></ul><h2>What we'll change</h2><ul data-type="taskList"><li data-type="taskItem" data-checked="false"><label><input type="checkbox"><span></span></label><div><p></p></div></li></ul>`,
    },
    {
        id: "oneonone", name: "1:1 notes", description: "Topics, feedback, follow-ups", icon: "i:users",
        html: `<h1>1:1</h1><h2>Topics</h2><ul><li><p></p></li></ul><h2>Feedback</h2><p></p><h2>Follow-ups</h2><ul data-type="taskList"><li data-type="taskItem" data-checked="false"><label><input type="checkbox"><span></span></label><div><p></p></div></li></ul>`,
    },
    {
        id: "onboarding", name: "Onboarding plan", description: "A checklist for someone's first weeks", icon: "i:hand",
        html: `<h1>Onboarding plan</h1><h2>Before day one</h2><ul data-type="taskList"><li data-type="taskItem" data-checked="false"><label><input type="checkbox"><span></span></label><div><p>Accounts and equipment</p></div></li></ul><h2>First week</h2><ul data-type="taskList"><li data-type="taskItem" data-checked="false"><label><input type="checkbox"><span></span></label><div><p>Meet the team</p></div></li></ul><h2>First month</h2><ul data-type="taskList"><li data-type="taskItem" data-checked="false"><label><input type="checkbox"><span></span></label><div><p>Ship a first small change</p></div></li></ul>`,
    },
    {
        id: "wiki", name: "Wiki home", description: "A landing page for a team's knowledge", icon: "i:house",
        html: `<h1>Team wiki</h1><p>Start here. Add sub-pages for each topic from the page tree.</p><h2>How we work</h2><ul><li><p></p></li></ul><h2>Tools and links</h2><ul><li><p></p></li></ul><h2>Who to ask</h2><p></p>`,
    },
]

export const templateHtml = (id: string | null | undefined) =>
    DOC_TEMPLATES.find((t) => t.id === id)?.html ?? ""
