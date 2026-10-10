// English is the source of truth. Every other language is checked against these keys in tests/i18n.test.ts.
export const en = {
  "lang.label": "Language",

  // onboarding wizard
  "wiz.signout": "Sign out",
  "wiz.step": "Step {n} of {total}",
  "wiz.pct": "{p}% done",
  "wiz.continue": "Continue",
  "wiz.back": "Back",
  "wiz.s1.title": "Let's set up your team's home.",
  "wiz.s1.body": "Five quick steps and your workspace is ready for people.",
  "wiz.s2.title": "Give your workspace a name.",
  "wiz.s2.body": "Most teams use their company or team name. You can change it later.",
  "wiz.s3.title": "Start with the right channels.",
  "wiz.s3.body": "Channels keep conversations organised. We'll add a few to get you going.",
  "wiz.s4.title": "Bring your team in.",
  "wiz.s4.body": "Share the invite link. People sign up and land straight in your workspace.",
  "wiz.s5.title": "You're all set.",
  "wiz.s5.body": "Your workspace is live. Take a quick tour or jump straight in.",
  "wiz.welcome": "Welcome!",
  "wiz.welcomeName": "Welcome, {name}!",
  "wiz.use.q": "What will your team use WebflowX for? Pick any that apply.",
  "wiz.use.chat": "Team chat",
  "wiz.use.chat.hint": "Channels, DMs and threads",
  "wiz.use.projects": "Projects & tasks",
  "wiz.use.projects.hint": "Boards, sprints, assignments",
  "wiz.use.docs": "Docs & notes",
  "wiz.use.docs.hint": "Shared documents and notes",
  "wiz.use.meetings": "Meetings",
  "wiz.use.meetings.hint": "Calls with AI summaries",
  "wiz.tpl.h": "Or start from a template",
  "wiz.tpl.none": "No template",
  "wiz.tpl.hint": "Adds its channels, three starter tasks and a note. Rename or delete them any time.",
  "tpl.agency": "Agency",
  "tpl.software": "Software team",
  "tpl.support": "Customer support",
  "tpl.startup": "Startup",
  "tpl.remote": "Remote team",
  "wiz.s2.h": "Name your workspace",
  "wiz.s2.t": "You'll be the owner. People you invite join as members.",
  "wiz.s2.label": "Workspace name",
  "wiz.s2.ph": "e.g. Acme Design, North Foundry",
  "wiz.create": "Create workspace",
  "wiz.creating": "Creating…",
  "wiz.s3.h": "Pick starter channels",
  "wiz.s3.t": "#general is already there. Add any of these now, or create your own later.",
  "wiz.s3.hint": "Pick up to 4. You can add more any time.",
  "wiz.s3.add": "Add {n} and continue",
  "wiz.s3.adding": "Adding…",
  "wiz.s4.h": "Invite your teammates",
  "wiz.s4.t": "Anyone who opens this link can create an account and join. You can do this later from the workspace menu.",
  "wiz.copy": "Copy",
  "wiz.copied": "Copied",
  "wiz.preparing": "Preparing your link…",
  "wiz.skipNow": "Skip for now",
  "wiz.s5.h": "Your workspace is ready",
  "wiz.s5.live": "{name} is live.",
  "wiz.s5.ready": "Everything is in place.",
  "wiz.s5.offer": "A short guide walks you through your own workspace: channels, AI, tasks, pages and meetings. Everything you try is real.",
  "wiz.s5.tour": "Show me around",
  "wiz.s5.skip": "Skip, open my workspace",
  "guide.step": "Step {n} of {total}",
  "guide.next": "Next",
  "guide.back": "Back",
  "guide.skip": "Skip tour",
  "guide.done": "Got it, let's go",
  "guide.s1.t": "This is your workspace",
  "guide.s1.b": "Channels on the left are where your team talks. Type a message below and press Enter. It's real, so your team will see it.",
  "guide.s2.t": "Type / for AI",
  "guide.s2.b": "In any message box, type / to open AI actions and formatting, like Improve Writing.",
  "guide.s3.t": "Track work as tasks",
  "guide.s3.b": "Tasks have a status, priority, assignee and due date. Add your first one here.",
  "guide.s4.t": "Write a page",
  "guide.s4.b": "Pages are shared documents with live editing. Spreadsheets and databases live here too.",
  "guide.s5.t": "Run a meeting",
  "guide.s5.b": "Start a call right from the workspace, with live transcription and an AI summary.",
  "guide.s6.t": "Find anything",
  "guide.s6.b": "Press Ctrl or ⌘ + K anywhere to search messages, tasks and pages. That's the tour. Invite your team whenever you're ready.",

  // interactive tour










} as const

export type Key = keyof typeof en
