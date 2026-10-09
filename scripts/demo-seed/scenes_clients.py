"""Hand-written conversations: announcements and the three client channels. Fictional clients and people."""

# scene = (channel, date, hour UTC, [line...]); line = (who, text) or (who, text, [thread replies])
S = []
def scene(ch, date, hour, *lines):
    S.append((ch, date, hour, list(lines)))

# ---------------- announcements ----------------
scene("announcements", "2026-06-09", 5.5,
    ("shah", "Welcome to the North Foundry workspace. This is where chat, tasks, docs and meetings live for every project, so please keep client work here and not in private messages. [@zainab] will share the working-hours guide this week.",
     [("daniyal", "Glad to have everything in one place. Moving the engineering notes over today."), ("areeba", "Design files are linked in #design already.")]),
)
scene("announcements", "2026-06-15", 5.2,
    ("zainab", "**Working hours and holidays.** Core hours are 10:00 to 18:00 Pakistan time, with a four-hour overlap for the US team in the evening. Pakistan public holidays are office-closed days. Please put time off on the calendar at least a week ahead.",
     [("maya", "Thanks, this helps with scheduling client calls on my side."), ("ethan", "Overlap window works well for me.")]),
)
scene("announcements", "2026-07-01", 5.4,
    ("shah", "**Q3 goals.** 1) Launch the Brightpath Dental website by 24 July. 2) Ship the Harborline customer portal MVP in August. 3) Get the Tidewell app onto TestFlight in early September. 4) Keep every client site above 95 on mobile Lighthouse.",
     [("elena", "Plans for all three are in the Tasks board, sprint by sprint."), ("hamza", "Number 4 is what I am most excited about."), ("rania", "I will line up two new discovery calls a week alongside this.")]),
)
scene("announcements", "2026-07-24", 11.0,
    ("shah", "**Brightpath Dental is live.** New site, online booking requests and 38 migrated articles, all in under six weeks. Thank you [@sana], [@hamza], [@tomas], [@areeba], [@kamran], [@usman] and [@elena].",
     [("maya", "Rebecca just called to say the team loves it."), ("tomas", "So proud of how the photography came together."), ("usman", "DNS cutover took four minutes, no downtime.")]),
)
scene("announcements", "2026-08-12", 6.0,
    ("zainab", "Reminder: the office is closed on Friday 14 August for Independence Day. On-call cover for client sites is [@usman] for the weekend.",
     [("usman", "Got it. Alerts are going to #deployments."), ("sana", "Happy Independence Day in advance, everyone.")]),
)
scene("announcements", "2026-09-04", 12.5,
    ("shah", "**Tidewell is on TestFlight.** The first 40 testers got their invites this afternoon. Thank you to everyone who stayed to finish the build.",
     [("nadia", "Our baristas already have it on their phones. The loyalty stamps are a hit."), ("hamza", "Next up is the offline menu cache.")]),
)
scene("announcements", "2026-09-30", 6.0,
    ("shah", "**Q3 review.** Two launches, one beta, and zero missed client deadlines. Our biggest lesson was to write the scope down before the build starts. Q4 planning starts Monday 12 October.",
     [("zainab", "I will share the hiring plan in the roadmap channel this week."), ("rania", "The outreach numbers for the quarter are in #outreach.")]),
)
scene("announcements", "2026-10-05", 5.3,
    ("zainab", "Reminder for everyone: please turn on two-step verification in your profile before Friday. Client data lives in this workspace and we want it protected.",
     [("hira", "Done."), ("marcus", "Done on my side too."), ("lucas", "Enabled, thanks for the reminder.")]),
    ("shah", "Sprint 9 is our performance push: faster first load, quicker page switches, and the jump-to-latest button for chat. Details in #product-roadmap."),
)

# ---------------- #brightpath-dental ----------------
B = "brightpath-dental"
scene(B, "2026-06-11", 13.0,
    ("elena", "Welcome to the shared channel, [@rebecca]. This is where we will post updates and collect feedback for the new Brightpath website. Next step is the discovery workshop tomorrow at 15:00 your time."),
    ("rebecca", "Thank you, Elena. Looking forward to it. I will bring our two dentists and the front desk lead."),
)
scene(B, "2026-06-12", 15.5,
    ("maya", "Thanks everyone for the workshop. Summary: the site must make it easy to request an appointment, show real team photos, and explain each treatment in plain language. We will send the sitemap on Monday."),
    ("rebecca", "That matches what we need. One addition: we want a page for new patients with what to bring to a first visit."),
    ("elena", "Added to the sitemap as 'First visit'. Thank you."),
)
scene(B, "2026-06-17", 14.5,
    ("areeba", "Homepage wireframes are ready for review: https://example.com/brightpath-wireframes (demo link). The booking request is a short form above the fold, so patients can send details in under a minute."),
    ("rebecca", "I like the simple form. Could the phone number be more visible for people who prefer to call?"),
    ("areeba", "Yes, I will add it to the header and keep a tap-to-call button on mobile."),
)
scene(B, "2026-06-26", 15.0,
    ("tomas", "Visual design for the homepage and service pages is ready. We went with a calm green and warm white, large photos and plenty of space.",
     [("rebecca", "This feels much friendlier than our old site. The doctors approve."), ("tomas", "Wonderful. We will need the final team photos by 3 July.")]),
)
scene(B, "2026-07-08", 14.8,
    ("sana", "Staging link is up with the homepage and booking form: https://example.com/brightpath-staging (demo link). Please test the form from your phone and tell us how it feels."),
    ("rebecca", "I sent a test request from my phone and the confirmation email arrived in a few seconds. Nice."),
    ("sana", "Great. The request also goes to your front desk inbox, so nothing gets lost."),
)
scene(B, "2026-07-17", 15.2,
    ("elena", "Everything for launch is on staging. Open items on your side: final team photos and the 'First visit' copy. Launch is planned for Friday 24 July."),
    ("rebecca", "Photos are in the shared folder. I am sending the copy tonight."),
    ("kamran", "Once the copy lands I will finish the page titles and local business markup, so the site shows up properly when people search for dentists nearby."),
)
scene(B, "2026-07-24", 11.5,
    ("usman", "The new site is live. DNS has switched and the old pages redirect to the new ones."),
    ("rebecca", "It looks beautiful. Three patients already sent booking requests this morning."),
    ("maya", "Congratulations, Rebecca. We will check the numbers with you next week.", [("rebecca", "Thank you all. This team is a pleasure to work with.")]),
)
scene(B, "2026-08-21", 14.6,
    ("kamran", "One month report: booking requests are up 38% against the month before launch, mobile page speed is 96, and the site ranks on page one for four local treatment searches.",
     [("rebecca", "That is better than we hoped for. Could we add a page for emergency visits?"), ("maya", "Yes, Elena will scope it and send you an estimate.")]),
)

# ---------------- #harborline-portal ----------------
H = "harborline-portal"
scene(H, "2026-06-30", 14.4,
    ("elena", "Welcome, [@aaron]. This channel is for the Harborline customer portal. Today I want to confirm the three roles: customer, dispatcher and admin. Customers should only see their own shipments."),
    ("aaron", "Confirmed. We also need customers to download invoices and get delivery alerts."),
    ("elena", "Both are in the first release. Thank you."),
)
scene(H, "2026-07-14", 15.0,
    ("bilal", "The shipment data model and API are done on staging. Each shipment has a status, carrier, estimated arrival and a history of events. Sample data from your system is loaded for testing."),
    ("aaron", "I looked through it. Could we also store the pallet count? Customers ask for that often."),
    ("bilal", "Yes, a small change. It will be in tomorrow's build."),
)
scene(H, "2026-08-04", 15.4,
    ("ethan", "Shipment list and tracking page are ready to try on staging. You can filter by status and search by reference number.",
     [("aaron", "Fast and clear. The map is a nice touch."), ("ethan", "Thanks. It shows the last known stop, not live GPS, so the numbers stay accurate.")]),
)
scene(H, "2026-08-13", 14.8,
    ("elena", "MVP demo today at 15:00 UTC with Aaron's operations team. The agenda is the customer view, the dispatcher view, then email and SMS alerts."),
    ("aaron", "The team is excited. Two dispatchers will join."),
    ("daniyal", "We will keep the demo on staging with sample data, so nothing touches your live system yet."),
)
scene(H, "2026-08-13", 17.2,
    ("elena", "Thank you for the feedback today. Notes: 1) show estimated arrival more prominently, 2) let dispatchers add internal comments, 3) export shipment lists to CSV. We will plan these for the next sprint."),
    ("aaron", "Perfect summary. We would also like proof-of-delivery photos at some point."),
    ("elena", "Added as a follow-up. We will estimate it and share it here."),
)
scene(H, "2026-09-10", 15.1,
    ("aaron", "We have started a pilot with five customers. Feedback so far: very clear, but searching a shipment takes a few seconds when the list is long."),
    ("priya", "Thanks for flagging this. I have a fix ready on staging that moves search to an index. I will deploy it after we test with your dataset size.", [("aaron", "Great, ours is about 4,000 shipments right now.")]),
)
scene(H, "2026-09-24", 14.9,
    ("usman", "Load test complete with 5,000 shipments and 200 users browsing at once. Pages stayed under 400ms. The only slow query was search, which Priya's change addresses."),
    ("aaron", "Good news. We want to onboard all customers next month."),
)
scene(H, "2026-10-06", 15.3,
    ("aaron", "Could you give us an estimate for phase 2? Things we want: proof-of-delivery photos, a carrier portal and a monthly statement."),
    ("sofia", "Yes. I will send a proposal by Friday with options and timing.", [("aaron", "Thank you, Sofia.")]),
)

# ---------------- #tidewell-app ----------------
T = "tidewell-app"
scene(T, "2026-06-19", 14.6,
    ("elena", "Hi [@nadia], welcome to the Tidewell channel. Today's goal is to agree the main flows for the ordering app: browse menu, customise a drink, pay, and pick up."),
    ("nadia", "Yes! The main thing is that a regular can reorder their usual drink in two taps."),
    ("areeba", "Noted. I will design a 'Your usual' shortcut on the home screen."),
)
scene(T, "2026-06-30", 14.9,
    ("tomas", "UI kit and the loyalty card are ready. Warm cream background, deep green buttons, and a stamp animation when you earn a reward.",
     [("nadia", "I love the stamp animation. It feels like our paper cards."), ("tomas", "That was the idea.")]),
)
scene(T, "2026-07-22", 14.7,
    ("omar", "Payments are working in test mode: card, Apple Pay and tips. Refunds are handled from the dashboard."),
    ("nadia", "Can we add a 'round up for charity' option at checkout?"),
    ("omar", "Easy to add. I will include it in the next build.", [("elena", "Added as a small task for this sprint.")]),
)
scene(T, "2026-08-20", 15.0,
    ("hamza", "First full build is ready for your team to try on Android. The order screen, cart and 'Your usual' shortcut all work."),
    ("nadia", "Ordered a flat white from my couch. The coffee machine will not know what hit it."),
    ("hira", "Please send us anything odd you notice and we will log it right away."),
)
scene(T, "2026-09-04", 12.9,
    ("usman", "TestFlight build is live. Invites are going out to your first 40 testers now."),
    ("nadia", "Got mine! Sharing with the baristas.", [("maya", "Brilliant. We will collect their feedback in a short form.")]),
)
scene(T, "2026-09-14", 14.8,
    ("hira", "Beta feedback summary: 31 comments. Top three: the menu is slow to load on weak Wi-Fi, the order-ready notification arrives late sometimes, and the rewards screen needs a clearer progress bar."),
    ("nadia", "That matches what the team told me. The Wi-Fi in the shop is not great."),
    ("hamza", "We are building an offline menu cache for exactly that, plus a lighter image size."),
)
scene(T, "2026-10-02", 15.1,
    ("tomas", "App Store screenshots and listing text are ready for your review.", [("nadia", "Looks fantastic. Can the first screenshot show 'Your usual'?"), ("tomas", "Yes, good idea.")]),
    ("usman", "Target for store submission is Friday 16 October, assuming the offline cache passes testing."),
)
