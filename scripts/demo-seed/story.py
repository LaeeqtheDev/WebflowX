"""The story the seed tells, as plain data: projects, sprints and milestones. Everything here is fictional."""
from lib import d

CLIENTS = {
    "brightpath": "Brightpath Dental",
    "harborline": "Harborline Logistics",
    "tidewell": "Tidewell Coffee Co.",
}

# 8 two-week sprints, Monday to Friday of the second week
SPRINTS = [
    ("Sprint 1: Kickoffs", "2026-06-08", "2026-06-19", "completed"),
    ("Sprint 2: Foundations", "2026-06-22", "2026-07-03", "completed"),
    ("Sprint 3: First builds", "2026-07-06", "2026-07-17", "completed"),
    ("Sprint 4: Brightpath launch", "2026-07-20", "2026-07-31", "completed"),
    ("Sprint 5: Portal MVP", "2026-08-03", "2026-08-14", "completed"),
    ("Sprint 6: App beta prep", "2026-08-17", "2026-08-28", "completed"),
    ("Sprint 7: Tidewell beta", "2026-08-31", "2026-09-11", "completed"),
    ("Sprint 8: Hardening", "2026-09-14", "2026-09-25", "completed"),
    ("Sprint 9: Performance push", "2026-09-28", "2026-10-09", "active"),
    ("Sprint 10: Q4 planning", "2026-10-12", "2026-10-23", "planned"),
]

# (title, project label, owner key, label, points, status, sprint index)
# status is what it looks like on 9 Oct; sprint index is where the work happened
TASKS = [
    # Brightpath website redesign
    ("Brightpath: discovery workshop notes and sitemap", "brightpath", "elena", "client", 3, "done", 0),
    ("Brightpath: homepage wireframes", "brightpath", "areeba", "design", 5, "done", 0),
    ("Brightpath: visual design, homepage and services", "brightpath", "tomas", "design", 8, "done", 1),
    ("Brightpath: build the booking request form", "brightpath", "sana", "frontend", 5, "done", 2),
    ("Brightpath: service pages (implants, whitening, braces)", "brightpath", "hamza", "frontend", 8, "done", 2),
    ("Brightpath: migrate 38 blog posts and fix redirects", "brightpath", "kamran", "seo", 5, "done", 2),
    ("Brightpath: schema markup and local SEO setup", "brightpath", "kamran", "seo", 3, "done", 3),
    ("Brightpath: accessibility pass (contrast, focus, alt text)", "brightpath", "sana", "frontend", 3, "done", 3),
    ("Brightpath: launch checklist and DNS cutover", "brightpath", "usman", "devops", 3, "done", 3),
    ("Brightpath: post-launch rankings report", "brightpath", "kamran", "seo", 2, "done", 5),
    # Harborline customer portal
    ("Harborline: requirements and role matrix", "harborline", "elena", "client", 3, "done", 1),
    ("Harborline: shipment data model and API", "harborline", "bilal", "backend", 8, "done", 2),
    ("Harborline: sign-in and customer accounts", "harborline", "omar", "backend", 5, "done", 3),
    ("Harborline: shipment list and tracking page", "harborline", "ethan", "frontend", 8, "done", 4),
    ("Harborline: delivery notifications by email and SMS", "harborline", "omar", "backend", 5, "done", 4),
    ("Harborline: invoice downloads (PDF)", "harborline", "priya", "backend", 5, "done", 5),
    ("Harborline: admin view for dispatchers", "harborline", "hamza", "frontend", 8, "done", 6),
    ("Harborline: load test with 5,000 shipments", "harborline", "usman", "devops", 3, "done", 7),
    ("Harborline: fix slow shipment search", "harborline", "priya", "backend", 5, "in_progress", 8),
    ("Harborline: proof-of-delivery photo upload", "harborline", "ethan", "frontend", 5, "in_review", 8),
    ("Harborline: customer onboarding emails", "harborline", "jordan", "client", 2, "todo", 9),
    ("Harborline: phase 2 estimate", "harborline", "sofia", "client", 2, "todo", 9),
    # Tidewell mobile ordering app
    ("Tidewell: user flows and menu structure", "tidewell", "areeba", "design", 5, "done", 0),
    ("Tidewell: app UI kit and loyalty card design", "tidewell", "tomas", "design", 8, "done", 1),
    ("Tidewell: ordering API and menu sync", "tidewell", "bilal", "backend", 8, "done", 2),
    ("Tidewell: Stripe payments and tips", "tidewell", "omar", "backend", 8, "done", 3),
    ("Tidewell: order screen and cart", "tidewell", "hamza", "frontend", 8, "done", 4),
    ("Tidewell: loyalty stamps and rewards", "tidewell", "sana", "frontend", 5, "done", 5),
    ("Tidewell: push notifications for order ready", "tidewell", "priya", "backend", 3, "done", 5),
    ("Tidewell: TestFlight build and tester invites", "tidewell", "usman", "devops", 3, "done", 6),
    ("Tidewell: beta feedback triage", "tidewell", "hira", "qa", 3, "done", 7),
    ("Tidewell: offline menu cache", "tidewell", "hamza", "frontend", 5, "in_progress", 8),
    ("Tidewell: App Store listing and screenshots", "tidewell", "tomas", "design", 3, "in_review", 8),
    ("Tidewell: store submission", "tidewell", "usman", "devops", 2, "todo", 9),
    # WebflowX product
    ("WebflowX: calendar feeds for Google, Apple, Outlook", "webflowx", "bilal", "backend", 5, "done", 2),
    ("WebflowX: pages and databases engine", "webflowx", "daniyal", "backend", 13, "done", 3),
    ("WebflowX: database views (board, calendar, gallery)", "webflowx", "ethan", "frontend", 8, "done", 4),
    ("WebflowX: roles, guests and audit log", "webflowx", "daniyal", "backend", 8, "done", 5),
    ("WebflowX: meeting summaries and transcripts", "webflowx", "noor", "backend", 8, "done", 6),
    ("WebflowX: two-step verification", "webflowx", "omar", "backend", 5, "done", 7),
    ("WebflowX: first load and page switch speed", "webflowx", "hamza", "frontend", 8, "in_progress", 8),
    ("WebflowX: jump to latest message button", "webflowx", "sana", "frontend", 2, "done", 8),
    ("WebflowX: removed members land on sign-in", "webflowx", "sana", "frontend", 2, "done", 8),
    ("WebflowX: importers for Slack and Notion", "webflowx", "priya", "backend", 13, "todo", 9),
    ("WebflowX: link meeting action items to tasks", "webflowx", "noor", "backend", 5, "todo", 9),
    ("WebflowX: security page and SSO plan", "webflowx", "daniyal", "backend", 5, "backlog", 9),
    # North Foundry internal
    ("North Foundry: refresh case study pages", "internal", "tomas", "design", 5, "done", 4),
    ("North Foundry: cold email sequence v2", "internal", "rania", "client", 3, "done", 5),
    ("North Foundry: set up reply tracking", "internal", "jordan", "client", 2, "done", 6),
    ("North Foundry: Q4 pricing review", "internal", "zainab", "client", 3, "in_progress", 8),
    ("North Foundry: hiring plan for two engineers", "internal", "zainab", "client", 2, "todo", 9),
    ("North Foundry: monthly SEO report template", "internal", "kamran", "seo", 3, "done", 6),
    ("North Foundry: update proposal template", "internal", "sofia", "client", 2, "done", 7),
    ("North Foundry: CI cache and faster builds", "internal", "usman", "devops", 5, "done", 7),
    ("North Foundry: uptime monitoring for all client sites", "internal", "usman", "devops", 3, "in_progress", 8),
    ("North Foundry: QA regression suite for client portals", "internal", "marcus", "qa", 5, "in_progress", 8),
    ("North Foundry: chatbot intake pilot for a dental client", "internal", "lucas", "backend", 8, "in_review", 8),
    ("North Foundry: evaluation set for the intake bot", "internal", "noor", "backend", 5, "todo", 9),
]

# Task comments by label, reused with the task owner or a reviewer.
COMMENTS = {
    "design": ["Updated the Figma frames, ready for review.", "Spacing is a bit tight on mobile, I will loosen it.", "Client approved this direction on the call.", "Can we use the lighter green here? It reads better next to the photos."],
    "frontend": ["PR is up, preview link in the thread.", "Fixed the layout shift on slower connections.", "Added the empty and error states.", "Lighthouse is at 96 on mobile now.", "Waiting on final copy for the footer."],
    "backend": ["Endpoint is live on staging.", "Added an index, the query dropped from 900ms to 60ms.", "Need the client's API key to finish this.", "Rate limits added, documented in the readme.", "Retries are in, failures now land in the dead letter queue."],
    "qa": ["Found two edge cases, details in the bug channel.", "Regression pass is green on Chrome, Safari and Firefox.", "Retested on a real iPhone, looks good."],
    "seo": ["Titles and descriptions are rewritten for all 38 pages.", "Search Console shows the sitemap as processed.", "Redirect map checked, no chains left."],
    "devops": ["Pipeline is green, deploy takes about 2 minutes now.", "Monitoring is on, alerts go to the deployments channel.", "Rollback plan is written down in the runbook."],
    "client": ["Sent the update to the client, they replied with two small changes.", "Scope is confirmed, moving to the next step.", "Added to the weekly summary."],
}
