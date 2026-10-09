"""Text pools for the procedural channels (banter, standups, bugs, bot posts)."""

BANTER = [
    "Good morning. Is anyone else already on their second chai?",
    "Does anyone have a good playlist for deep work? Mine is getting stale.",
    "The air conditioning in my room just gave up. Working from the cafe down the road today.",
    "Friendly reminder to drink water. This is your sign.",
    "Anyone watching the match tonight?",
    "Found a great biryani place near the office. Lunch recommendation for the week.",
    "My internet went down for ten minutes and I spent them organising my desk. Silver lining.",
    "Does anyone know a good standing desk that does not wobble?",
    "I finally cleaned up my downloads folder. 4,000 files. No regrets.",
    "Rain finally arrived and the whole street smells amazing.",
    "Ten-minute walk after lunch is the best productivity trick I have found so far.",
    "Who is up for a virtual coffee break at 3? Cameras optional.",
    "Today's mood: a very large iced coffee and a very small to-do list.",
    "Book recommendation request: something short that is not about work.",
    "Our team calendar has so many colours now it looks like a rainbow.",
    "Tried a new keyboard this week. I am typing faster and annoying everyone on calls.",
    "Fun fact: the longest pull request I reviewed this week had 11 files and zero comments. Respect.",
    "Anyone else find that their best ideas show up in the shower?",
    "Quick poll: tabs or spaces? (Please be gentle.)",
    "I think I just discovered the best pizza in town. Report to follow.",
    "Monday energy is real. Let's do this.",
    "Friday energy is also real. Let's finish strong.",
    "Weekend plan: a long walk, a long nap, and no laptop.",
    "Lost a whole afternoon to a missing semicolon. Do not ask.",
    "Sharing a tiny win: my morning commute is now 15 minutes shorter.",
    "Does anyone have tips for a quieter place to take calls at home?",
    "Just finished a great podcast about product design. Happy to share the link.",
    "The new office plant has survived two weeks. Morale is high.",
    "Thanks to whoever put the snacks in the kitchen. You are a hero.",
    "Coffee machine is making a strange noise again. Sending thoughts and prayers.",
]
BANTER_REPLIES = [
    "Ha, same here.", "That is a great tip, thanks.", "Please send the link!", "Haha, fair enough.",
    "Adding it to my list.", "Can confirm.", "This made my morning.", "I would be up for that.",
    "Exactly what I needed to hear today.", "Okay, now I am hungry.", "Respect.", "Tabs, always tabs.",
    "Enjoy it!", "Same, honestly.", "Great find. Which place?", "That sounds like a plan.",
]

GENERAL = [
    "New week, new sprint. If you are blocked on anything today, say so early and we will sort it out together.",
    "Please check the shared calendar before booking client calls. Two overlapped yesterday.",
    "If you have not yet submitted your timesheet for last week, please do it by end of day.",
    "A reminder that Friday afternoon demos are open to everyone. Come and see what the team shipped.",
    "Our shared inbox now routes to #customer-success. Please reply there instead of forwarding emails.",
    "Welcome to this month's new starters. Say hello in #introductions.",
    "The Wi-Fi password at the co-working space has changed. Check the pinned note.",
    "Friendly reminder to turn on two-step verification in your profile if you have not yet.",
    "Quick recap: standups happen in #engineering at 10:00 Pakistan time, replies are fine if you are offline.",
]

STANDUP_Y = ["Finished", "Worked on", "Reviewed and tested", "Made progress on", "Wrapped up", "Paired on"]
STANDUP_T = ["Continuing with", "Starting on", "Picking up", "Finishing", "Focusing on"]
STANDUP_B = ["none", "none", "none", "none", "waiting on a review for my PR", "need the staging key from the client", "waiting for final copy", "none", "blocked by a flaky test, looking at it", "need design sign-off on one screen"]

BUGS = [
    ("brightpath", "Booking form accepts an empty phone number", "low"),
    ("brightpath", "Hero image is too large on small phones", "medium"),
    ("brightpath", "Confirmation email lands in spam for one provider", "high"),
    ("brightpath", "Footer links are not keyboard focusable", "medium"),
    ("brightpath", "Old blog URLs redirect twice", "medium"),
    ("brightpath", "Opening hours show the wrong time zone", "high"),
    ("harborline", "Shipment list shows duplicate rows after a filter change", "high"),
    ("harborline", "Invoice PDF cuts off the last line item", "medium"),
    ("harborline", "SMS alert is sent twice for status changes", "high"),
    ("harborline", "Dispatcher cannot clear the carrier filter", "low"),
    ("harborline", "Estimated arrival shows yesterday's date after midnight", "high"),
    ("harborline", "Search is slow when there are more than 3,000 shipments", "high"),
    ("harborline", "Customer can see another customer's shipment count in the header", "urgent"),
    ("harborline", "CSV export has an extra empty column", "low"),
    ("tidewell", "App crashes when opening the cart with no items", "high"),
    ("tidewell", "Tip amount resets when switching payment method", "medium"),
    ("tidewell", "Order-ready notification arrives 2 minutes late", "medium"),
    ("tidewell", "Loyalty stamp animation stutters on older phones", "low"),
    ("tidewell", "Menu images load slowly on weak Wi-Fi", "high"),
    ("tidewell", "Apple Pay sheet shows the wrong store name", "medium"),
    ("tidewell", "'Your usual' shows an item that is out of stock", "medium"),
    ("webflowx", "Message list does not scroll to the newest message after sending on mobile", "medium"),
    ("webflowx", "Removed member sees an empty workspace", "high"),
    ("webflowx", "Calendar feed shows tasks without a due date", "low"),
    ("webflowx", "Database board view loses its grouping after a refresh", "medium"),
    ("webflowx", "Meeting summary shows the wrong participant count", "low"),
    ("webflowx", "Thread panel flickers when a new reply arrives", "low"),
    ("webflowx", "Search misses messages with an emoji in the first word", "medium"),
]
BUG_STEPS = [
    "Steps: open the page, repeat the action twice, watch the result. Expected: it works the first time. Actual: it fails on the second try.",
    "Steps: sign in on a phone, open the screen, rotate the device. Expected: layout adjusts. Actual: content overlaps.",
    "Steps: use the staging link, fill the form with a long name, submit. Expected: success message. Actual: the page reloads.",
    "Steps: use a slow 3G connection in dev tools and reload. Expected: a loading state. Actual: blank screen for several seconds.",
]
BUG_FIX = ["Reproduced. I know where this is coming from, fix in progress.", "On it. I will have a fix on staging this afternoon.", "Looking now, adding a test so it stays fixed.", "Thanks for the clear steps. Picking this up."]
BUG_DONE = ["Fix is on staging.", "Fixed and merged. Deploying with the next release.", "Done. The root cause was a missing check, now covered by a test."]
BUG_VERIFY = ["Verified on staging. Closing.", "Retested on two devices, all good. Closing.", "Confirmed fixed. Thank you."]

PR_VERBS = ["Add", "Fix", "Improve", "Refactor", "Speed up", "Handle"]
SHAS = "0123456789abcdef"
