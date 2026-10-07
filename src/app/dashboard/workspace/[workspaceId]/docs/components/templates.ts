export type DocTemplateId = "blank" | "meeting" | "brief" | "weekly" | "checklist"

export const DOC_TEMPLATES: { id: DocTemplateId; name: string; description: string; emoji: string; html: string }[] = [
    { id: "blank", name: "Blank", description: "Start from scratch", emoji: "📄", html: "" },
    {
        id: "meeting", name: "Meeting notes", description: "Agenda, notes, action items", emoji: "🗒️",
        html: `<h1>Meeting notes</h1><p><strong>Date:</strong> &nbsp;&nbsp; <strong>Attendees:</strong> </p><h2>Agenda</h2><ul><li><p></p></li></ul><h2>Discussion</h2><p></p><h2>Decisions</h2><ul><li><p></p></li></ul><h2>Action items</h2><ul data-type="taskList"><li data-type="taskItem" data-checked="false"><label><input type="checkbox"><span></span></label><div><p></p></div></li></ul>`,
    },
    {
        id: "brief", name: "Project brief", description: "Goal, scope, timeline, risks", emoji: "🎯",
        html: `<h1>Project brief</h1><h2>Goal</h2><p>What are we trying to achieve, and why now?</p><h2>Scope</h2><ul><li><p>In scope</p></li><li><p>Out of scope</p></li></ul><h2>Timeline</h2><p></p><h2>Owners</h2><p></p><h2>Risks &amp; open questions</h2><ul><li><p></p></li></ul>`,
    },
    {
        id: "weekly", name: "Weekly update", description: "Wins, progress, blockers", emoji: "📅",
        html: `<h1>Weekly update</h1><h2>Wins</h2><ul><li><p></p></li></ul><h2>In progress</h2><ul><li><p></p></li></ul><h2>Blockers</h2><ul><li><p></p></li></ul><h2>Next week</h2><ul><li><p></p></li></ul>`,
    },
    {
        id: "checklist", name: "Checklist", description: "A simple to-do list", emoji: "✅",
        html: `<h1>Checklist</h1><ul data-type="taskList"><li data-type="taskItem" data-checked="false"><label><input type="checkbox"><span></span></label><div><p></p></div></li></ul>`,
    },
]

export const templateHtml = (id: string | null | undefined) =>
    DOC_TEMPLATES.find((t) => t.id === id)?.html ?? ""
