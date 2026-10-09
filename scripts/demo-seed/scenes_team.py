"""Hand-written conversations for the team channels."""
S = []
def scene(ch, date, hour, *lines):
    S.append((ch, date, hour, list(lines)))

# ---------------- engineering ----------------
scene("engineering", "2026-06-10", 6.0,
    ("daniyal", "Proposal for how we structure client projects: one repo per client, a shared `ui` package for components we reuse, and the same CI template everywhere. Thoughts?",
     [("hamza", "Agree. The shared package will save us a lot of copy and paste."), ("usman", "I can template the CI once and apply it to every repo."), ("bilal", "Please keep the package small. Big shared packages become hard to change.")]),
    ("daniyal", "Fair point, Bilal. We start with buttons, form fields and the layout shell only."),
)
scene("engineering", "2026-06-24", 7.2,
    ("bilal", "Decision needed: for Harborline shipment events, do we store every event or only status changes? Storing everything gives a full history but grows fast.",
     [("priya", "Store everything, but archive events older than 18 months to cheaper storage."), ("daniyal", "I agree with Priya. Full history matters for dispute handling."), ("bilal", "OK, going with that.")]),
)
scene("engineering", "2026-07-15", 6.4,
    ("daniyal", "Code review reminder: please keep pull requests under 400 lines where possible, and add a screenshot for any visual change. Reviews are much faster that way.",
     [("sana", "Adding screenshots helps QA too."), ("hira", "Yes please. It saves me a trip to staging.")]),
)
scene("engineering", "2026-08-06", 6.8,
    ("usman", "Heads up: I moved our build cache to a shared layer. Average build time dropped from 4m10s to 1m50s across all repos.",
     [("daniyal", "That is a huge win for everyone."), ("ethan", "My last three builds all finished in under two minutes.")]),
)
scene("engineering", "2026-09-02", 7.0,
    ("daniyal", "We need a rule for secrets. Nothing goes in a repo, not even in a private one. Everything lives in the host's environment settings, and each client project gets its own keys.",
     [("omar", "Done for Tidewell and Harborline. Rotating the old Stripe test key today."), ("usman", "I will add a scan to CI that fails on anything that looks like a key.")]),
)
scene("engineering", "2026-10-06", 6.5,
    ("hamza", "First numbers from the performance work: we cut the first load of the dashboard by about a third by loading the editor and thread chunks when the browser is idle. Page switches also feel quicker with a short client cache.",
     [("daniyal", "Nice. What is next?"), ("hamza", "The biggest remaining cost is distance to the database region. I will share options in the roadmap channel."), ("usman", "I can add real-user speed tracking per route so we stop guessing.")]),
)

# ---------------- frontend ----------------
scene("frontend", "2026-06-18", 6.6,
    ("sana", "Starting the shared UI package. First components: Button, Input, Select, Modal. All keyboard friendly and with visible focus rings.",
     [("ethan", "Please add a loading state to Button. We use it everywhere."), ("hamza", "And a disabled tooltip, clients keep asking why a button is greyed out.")]),
)
scene("frontend", "2026-07-09", 14.9,
    ("ethan", "Quick question: for the Harborline tracking page, do we want a map library or a simple static route graphic? The library adds about 180 KB.",
     [("hamza", "Static graphic with the last known stop. We do not need live tiles."), ("ethan", "Agreed, saves the weight.")]),
)
scene("frontend", "2026-08-11", 6.9,
    ("sana", "Accessibility audit for Brightpath found six issues, mostly low contrast on the light green. All fixed now. I added a check to the component docs so it does not come back.",
     [("areeba", "Thank you. I adjusted the palette in Figma too.")]),
)
scene("frontend", "2026-09-17", 7.1,
    ("hamza", "Tip: for long lists, we render only what is on screen. The shipment table for 5,000 rows now scrolls smoothly on a mid-range phone.",
     [("sana", "Could we reuse that for the WebflowX message list?"), ("hamza", "Yes, it is on the list.")]),
)
scene("frontend", "2026-10-08", 7.3,
    ("sana", "Chat now has a 'Latest' button when you scroll up, and removed members are sent to sign-in instead of seeing an empty page. Both are in the preview.",
     [("hira", "Testing now."), ("hira", "Works on my phone with the keyboard open too. Nice.")]),
)

# ---------------- backend ----------------
scene("backend", "2026-07-02", 7.0,
    ("bilal", "Indexing reminder: every query that filters by workspace or client must use an index. I found two that scanned the whole table in staging. Fixed both.",
     [("priya", "Which ones? I want to check mine."), ("bilal", "Shipment search and invoice list. Both were missing an index on the customer id.")]),
)
scene("backend", "2026-08-19", 6.3,
    ("omar", "Stripe webhooks are now idempotent: we store the event id and ignore repeats. Before, a retried event could mark an order paid twice.",
     [("daniyal", "Great catch. Please add a test for it."), ("omar", "Added and passing.")]),
)
scene("backend", "2026-09-22", 7.4,
    ("priya", "Search fix is live on Harborline: it dropped from about 2.4s to 90ms on 4,000 shipments by using an index and limiting the columns we read.",
     [("bilal", "Excellent."), ("usman", "p95 on the dashboard went down as well.")]),
)

# ---------------- ai-research ----------------
scene("ai-research", "2026-07-07", 7.8,
    ("noor", "Pilot idea for a dental client: a chat intake bot that collects name, reason for visit and preferred times, then hands off to the front desk. The key is that it never gives medical advice.",
     [("lucas", "Agree. I would use a fixed set of questions with free text only for the reason for the visit."), ("noor", "Yes. And a clear 'talk to a person' option at every step.")]),
)
scene("ai-research", "2026-08-12", 8.2,
    ("lucas", "Evaluation set for the intake bot: 60 conversations written by the team, including angry users, off-topic questions and people who give half answers. First run: 87% of conversations ended with a complete intake.",
     [("noor", "The failures are mostly people who type dates in odd formats. I will add date parsing."), ("lucas", "Also add a check so it never repeats a question the user already answered.")]),
)
scene("ai-research", "2026-09-09", 8.0,
    ("noor", "Meeting summaries in WebflowX now use a fixed format: key points, decisions, action items and a short overview. It is easier to scan, and action items can be turned into tasks next sprint.",
     [("lucas", "Cost per summary is a few cents. Plan caps keep it predictable."), ("daniyal", "Good. Please add the link from action item to task, it is the most useful part.")]),
)

# ---------------- design ----------------
scene("design", "2026-06-12", 6.2,
    ("areeba", "Setting up the shared Figma library: colors, type scale, spacing, and the base components. Please do not detach components, ask me if something is missing.",
     [("tomas", "Will do. I will add the illustration style guide next week.")]),
)
scene("design", "2026-07-21", 8.0,
    ("tomas", "Case study layout for the Brightpath launch is done. It starts with the result, then the problem, then what we built. Short and honest.",
     [("areeba", "Love it. Can we add a line about the booking increase once we have the numbers?"), ("tomas", "Yes, after the first month report.")]),
)
scene("design", "2026-09-15", 6.7,
    ("areeba", "Design critique for Tidewell rewards screen: the progress bar needs to be clearer. Two options in Figma, A shows stamps, B shows a bar with the next reward.",
     [("tomas", "A matches the paper card idea. I vote A."), ("sana", "A is easier to build and also reads well for screen readers if we label it."), ("areeba", "A it is.")]),
)

# ---------------- product-roadmap ----------------
scene("product-roadmap", "2026-08-25", 6.0,
    ("shah", "Roadmap thoughts for WebflowX after the launch: speed first, then importers from Slack and Notion, then linking meeting action items to tasks. I want one reason to switch that is easy to explain.",
     [("daniyal", "Importers are a big job. We should scope them by data type: channels and messages first."), ("noor", "Action items to tasks is small and very visible. I can do it in a sprint."), ("elena", "I will add all three to the Q4 board.")]),
)
scene("product-roadmap", "2026-10-07", 6.2,
    ("zainab", "Hiring plan for Q4: two engineers, one frontend and one backend, starting in November if the pipeline holds. Budget is approved. Job posts go live next week.",
     [("daniyal", "I will write the take-home tasks."), ("shah", "Thank you. Please keep the process short and respectful of candidates' time.")]),
)

# ---------------- qa-testing ----------------
scene("qa-testing", "2026-07-16", 7.5,
    ("hira", "Release checklist for client sites: forms send, emails arrive, 404 page works, redirects work, no console errors, mobile Lighthouse above 95, keyboard navigation works. Pinned for everyone.",
     [("marcus", "Adding the checks for cookie banner and analytics events."), ("hira", "Thanks, Marcus.")]),
)
scene("qa-testing", "2026-09-29", 15.2,
    ("marcus", "Regression suite for client portals now runs on every pull request. 48 checks, takes 3 minutes. It already caught a broken invoice link in review.",
     [("daniyal", "This is the safety net we needed."), ("hira", "Great work, Marcus.")]),
)

# ---------------- customer-success ----------------
scene("customer-success", "2026-07-28", 15.0,
    ("maya", "Client pulse after two launches: Brightpath is thrilled, Harborline is waiting on search speed, Tidewell wants offline mode for the shop's weak Wi-Fi. I will keep a short list pinned here.",
     [("elena", "I will link each item to a task so nothing is lost."), ("zainab", "Please include renewal dates on the pinned list.")]),
)
scene("customer-success", "2026-09-18", 15.4,
    ("maya", "Lesson from this month: clients forgive delays when we tell them early and tell them exactly what happens next. A two-line update beats a perfect update that arrives a day late.",
     [("sofia", "Same on the sales side. People trust specifics.")]),
)

# ---------------- wins ----------------
scene("wins", "2026-07-24", 12.0,
    ("shah", "Brightpath Dental is live and booking requests are already coming in. Great job, everyone."),
    ("kamran", "Rankings will take a few weeks, but the foundation is solid."),
)
scene("wins", "2026-08-13", 17.5,
    ("elena", "Harborline MVP demo went really well. Aaron's dispatchers asked when they can start using it."),
    ("rania", "That is the reaction we want."),
)
scene("wins", "2026-09-04", 13.0,
    ("hamza", "Tidewell is on TestFlight. First order placed from a phone in the shop. Coffee has never been this exciting."),
)
scene("wins", "2026-09-22", 7.8,
    ("priya", "Search on the Harborline portal is down from 2.4 seconds to 90 milliseconds. Small change, big difference."),
    ("daniyal", "Beautiful work."),
)
scene("wins", "2026-10-02", 9.0,
    ("sofia", "Signed a new discovery call with a physiotherapy clinic group, 6 locations. Proposal goes out next week."),
    ("rania", "Excellent. Great follow-up on that email, Sofia."),
)

# ---------------- outreach ----------------
scene("outreach", "2026-06-17", 6.0,
    ("rania", "Outreach plan for Q3: three target groups, local clinics, logistics companies, and independent cafes and restaurants. One short email, one follow-up, and one useful resource each. No long pitch decks.",
     [("jordan", "I will set up the lists and the reply tracking."), ("sofia", "I will take the calls that come in.")]),
)
scene("outreach", "2026-08-07", 14.8,
    ("jordan", "What worked this month: emails that start with one specific observation about the prospect's website, and one question. Reply rate on those is more than double the generic version.",
     [("rania", "Let's make that the standard. Please write the observation by hand, not from a template."), ("kamran", "I can send you three quick website observations per day.")]),
)
