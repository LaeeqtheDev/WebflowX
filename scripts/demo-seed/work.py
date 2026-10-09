"""Work data: DMs, sprints, tasks, comments, meetings, notes, databases, audit log, notifications, pins, saves."""
import datetime as dt
from ctx import *
from story import SPRINTS, TASKS, COMMENTS, CLIENTS
from meetings_data import M

DMS = [
    ("zainab", [
        ("2026-06-05", 5.2, [("zainab", "Welcome Shah. I put the first month of invoices and contracts in the shared drive."), ("shah", "Thanks Zainab. Can you also own the hiring tracker?"), ("zainab", "Yes. I will start it today.")]),
        ("2026-07-27", 6.0, [("zainab", "Brightpath paid the launch invoice this morning."), ("shah", "Great news. Let's thank Rebecca in the wins channel."), ("zainab", "Done.")]),
        ("2026-09-18", 6.4, [("zainab", "Quick one: do you want to revisit pricing before Q4?"), ("shah", "Yes, let's put it on Tuesday's agenda."), ("zainab", "I will prepare three options.")]),
        ("2026-10-08", 5.5, [("zainab", "Hiring plan draft is ready for two engineers. Can you review tonight?"), ("shah", "Will do. Send it over.")]),
    ]),
    ("daniyal", [
        ("2026-06-12", 6.0, [("daniyal", "I would like to use trunk-based development with short-lived branches."), ("shah", "Agreed. Keep reviews small."), ("daniyal", "Will set the repo rules today.")]),
        ("2026-08-04", 7.2, [("daniyal", "Harborline search is slow with 5,000 shipments. I think we need an index."), ("shah", "Ask Priya, she did search before."), ("daniyal", "Pinged her.")]),
        ("2026-09-25", 6.5, [("daniyal", "Sprint 8 closed. Performance work moves to sprint 9."), ("shah", "Good. Preload and caching first."), ("daniyal", "Hamza has it.")]),
    ]),
    ("maya", [
        ("2026-06-20", 15.0, [("maya", "Rebecca asked if we can add a map to the contact page."), ("shah", "Yes, let's add it."), ("maya", "I will let her know it is included.")]),
        ("2026-08-28", 15.4, [("maya", "Nadia loved the stamps screen. She wants the beta in the first week of September."), ("shah", "Let's check with Hamza first."), ("maya", "On it.")]),
        ("2026-10-02", 16.0, [("maya", "Aaron asked for a phase 2 call. He sounds happy."), ("shah", "Great. Please loop in Sofia."), ("maya", "Already did.")]),
    ]),
    ("elena", [
        ("2026-06-16", 8.5, [("elena", "I put all three project plans in the docs. Want me to walk you through them?"), ("shah", "Yes, 20 minutes tomorrow."), ("elena", "Booked.")]),
        ("2026-09-11", 8.0, [("elena", "Sprint 7 closes today with 31 of 34 points. Two tasks moved to sprint 8."), ("shah", "Fine. Nothing urgent?"), ("elena", "No.")]),
    ]),
    ("rania", [
        ("2026-07-08", 6.8, [("rania", "Reply rates are up since we changed the first line."), ("shah", "Nice. Keep testing one change at a time."), ("rania", "That is the plan.")]),
        ("2026-09-29", 7.0, [("rania", "We have 24 open leads and 5 proposals out. Want the sheet?"), ("shah", "Yes, send it before Tuesday's meeting."), ("rania", "Sending.")]),
    ]),
    ("areeba", [
        ("2026-06-24", 7.0, [("areeba", "I made two directions for the Tidewell app. Which one feels more like a neighbourhood cafe?"), ("shah", "Second one. Warmer."), ("areeba", "Agreed. I will refine it.")]),
        ("2026-08-12", 7.5, [("areeba", "Can I get 15 minutes on the WebflowX landing page tomorrow?"), ("shah", "Sure, 3pm."), ("areeba", "Thank you.")]),
    ]),
    ("hamza", [
        ("2026-09-17", 7.4, [("hamza", "First load is 1.9s on my machine, down from 3.4s. Shipping preload next."), ("shah", "That is a big jump. Check slow networks too."), ("hamza", "Will test with throttling.")]),
        ("2026-10-07", 8.2, [("hamza", "Preload is on staging. Page switches feel instant."), ("shah", "Great, I will test on my phone.")]),
    ]),
    ("sofia", [
        ("2026-08-10", 15.5, [("sofia", "New proposal template is ready, three pages with a price table."), ("shah", "Send me a copy."), ("sofia", "In your inbox.")]),
        ("2026-10-05", 16.0, [("sofia", "Harborline phase 2 estimate is drafted. Do you want to see it first?"), ("shah", "Yes, please."), ("sofia", "Sharing now.")]),
    ]),
]


def make_dms():
    out = {}
    for other, convs in DMS:
        t0 = at(d(convs[0][0]), convs[0][1])
        cid = store.add("conversations", {"workspaceId": WS, "memberOneId": members["shah"], "memberTwoId": members[other]}, t0 - mins(1))
        out[other] = cid
        for date, hour, lines in convs:
            t = at(d(date), hour)
            for who, text in lines:
                t += mins(R.randint(1, 15))
                post(None, cid, who, text, t)
    return out


def short(x):
    return x.split(": ", 1)[1] if ": " in x else x


EXTRA_TASKS = [
    ("Review the Q4 roadmap draft", "internal", "shah", "client", 2, "todo", 9),
    ("Sign off the Brightpath launch", "brightpath", "shah", "client", 1, "done", 3),
    ("Approve the Tidewell store submission", "tidewell", "shah", "client", 1, "todo", 9),
    ("Review the hiring plan for two engineers", "internal", "shah", "client", 2, "in_progress", 8),
]
DESC = {
    "brightpath": "Brightpath Dental website redesign. Scope agreed in the statement of work.",
    "harborline": "Harborline Logistics customer portal. Dispatchers and customers have separate views.",
    "tidewell": "Tidewell Coffee Co. mobile ordering app with loyalty stamps.",
    "webflowx": "Our own product, WebflowX. Roadmap item for this quarter.",
    "internal": "North Foundry internal work.",
}


def make_sprints_tasks():
    sp_ids = []
    for name, a, b, status in SPRINTS:
        sp_ids.append(store.add("sprints", {"name": name, "workspaceId": WS, "startDate": ms(at(d(a), 4)), "endDate": ms(at(d(b), 12)), "status": status}, at(d(a), 4) - dt.timedelta(days=3)))
    task_ids = []
    now = NOW
    for (title, proj, owner, label, pts, status, si) in TASKS + EXTRA_TASKS:
        a, b = d(SPRINTS[si][1]), d(SPRINTS[si][2])
        created = at(a, 5.5) - dt.timedelta(days=R.choice([0, 1, 2, 3]) if si else 1)
        if si == 9:
            created = at(d("2026-10-0%d" % R.randint(5, 8)), 7)
        creator = "elena" if owner != "shah" else R.choice(["zainab", "elena"])
        if owner == "shah":
            creator = "zainab"
        due = at(b, 12)
        if status == "done":
            updated = min(due, at(a + dt.timedelta(days=R.randint(2, 11)), R.uniform(8, 13)))
            if si == 8:
                updated = at(d("2026-10-0%d" % R.randint(1, 8)), R.uniform(8, 13))
        elif status == "in_review":
            updated = NOW - dt.timedelta(hours=R.randint(5, 40))
        elif status == "in_progress":
            updated = NOW - dt.timedelta(hours=R.randint(2, 60))
        else:
            updated = created + dt.timedelta(hours=2)
        prio = "medium"
        if pts >= 8:
            prio = "high"
        elif pts <= 2:
            prio = "low"
        if "slow shipment search" in title or "Latest" in title:
            prio = "urgent"
        doc = {"title": title,
               "description": DESC[proj], "status": status, "priority": prio, "workspaceId": WS,
               "assigneeId": members[owner], "createdBy": members[creator], "dueDate": ms(due),
               "labels": [label, proj], "storyPoints": pts, "updatedAt": ms(updated), "sprintId": sp_ids[si]}
        if status == "backlog":
            del doc["sprintId"]; doc["dueDate"] = None
        tid = store.add("tasks", doc, created)
        task_ids.append((tid, title, proj, owner, label, status, created, updated, si, creator))
    return sp_ids, task_ids


def make_comments(task_ids):
    out = []
    reviewers = {"design": "areeba", "frontend": "daniyal", "backend": "daniyal", "qa": "elena", "seo": "elena", "devops": "daniyal", "client": "elena"}
    for (tid, title, proj, owner, label, status, created, updated, si, creator) in task_ids:
        if status in ("todo", "backlog") or owner == "shah":
            continue
        n = R.choice([1, 2, 2, 3])
        pool = COMMENTS.get(label, COMMENTS["client"])
        t = created
        span = max(60, int((updated - created).total_seconds() / 60))
        for i in range(n):
            who = owner if i % 2 == 0 else reviewers.get(label, "elena")
            if who == owner and R.random() < 0.3:
                who = "shah"
            if joined[who] > t.date():
                who = owner
            t = t + dt.timedelta(minutes=R.randint(60, max(61, span // n)))
            t = min(t, updated)
            cid = store.add("taskComments", {"taskId": tid, "memberId": members[who], "workspaceId": WS, "body": R.choice(pool)}, t + dt.timedelta(minutes=i))
            out.append((cid, tid, who, t))
    return out


def tx(lines, start):
    out, t = [], start
    for who, text in lines:
        t += dt.timedelta(seconds=R.randint(18, 70))
        out.append((t, who, text))
    return out


def make_meetings():
    ids = []
    for (date, hour, mins_, title, host, speakers, lines, key, dec, actions, overall) in M:
        start = at(d(date), hour)
        end = start + dt.timedelta(minutes=mins_)
        parts = [names[k] for k in speakers]
        tl = tx(lines, start + dt.timedelta(seconds=40))
        text = "\n".join(f"[{int((t - start).total_seconds()) // 60:02d}:{int((t - start).total_seconds()) % 60:02d}] {names[w]}: {x}" for t, w, x in tl)
        summary = ("📋 Meeting Summary\n\n🎯 Key Points\n" + "\n".join("• " + k for k in key) +
                   "\n\n✅ Decisions Made\n" + "\n".join("• " + x for x in dec) +
                   "\n\n📌 Action Items\n" + "\n".join(f"• {who}: {what}" for who, what in actions) +
                   "\n\n💡 Overall Summary\n" + overall)
        room = "nf-" + date + "-" + "".join(c for c in title.lower() if c.isalnum() or c == " ").replace(" ", "-")[:30]
        mid = store.add("meetings", {"workspaceId": WS, "roomName": room, "title": title, "createdBy": members[host], "startedAt": ms(start),
                                     "endedAt": ms(end), "transcript": text, "summary": summary, "participants": parts, "activeMembers": []}, start)
        # one transcript row per speaker, as the app does
        by = {}
        for t, w, x in tl:
            by.setdefault(w, []).append(f"{ms(t)}\t{names[w]}\t{x}")
        for w, rows in by.items():
            store.add("meetingTranscripts", {"meetingId": mid, "workspaceId": WS, "memberId": members[w], "body": "\n".join(rows)}, end + dt.timedelta(seconds=R.randint(1, 30)))
        store.add("aiSummaryLog", {"workspaceId": WS, "meetingId": mid, "memberId": members[host], "consumed": True}, end + dt.timedelta(minutes=1))
        ids.append((mid, title, start, host, speakers, actions))
    return ids


NOTES = [
    ("workspace", "zainab", "2026-06-04", "Working agreements", ["Core hours overlap: 14:00 to 18:00 Pakistan time.", "Replies in channels are fine for standups.", "Client questions get a first answer within one business day.", "Every task has an owner and a due date."], True),
    ("workspace", "elena", "2026-06-16", "Client update template", ["Done this week.", "Planned next week.", "Risks or decisions needed.", "Keep it under 150 words."], True),
    ("workspace", "daniyal", "2026-06-12", "Release checklist", ["Tests green on main.", "Preview checked on mobile and desktop.", "Environment variables compared with production.", "Rollback command written in the PR.", "Announce in the deployments channel."], True),
    ("workspace", "usman", "2026-07-02", "Incident runbook", ["Check the status page and error logs first.", "Roll back before debugging if customers are affected.", "Post a short update in deployments every 30 minutes.", "Write a three-line summary afterwards."], False),
    ("workspace", "maya", "2026-07-10", "Client onboarding checklist", ["Create the shared channel and invite the client contact.", "Share the project plan and the first sprint goals.", "Agree on one decision maker.", "Schedule a weekly 15 minute check-in."], False),
    ("workspace", "rania", "2026-08-07", "Outreach learnings", ["Short first lines beat long introductions.", "Clinics reply the most, logistics need two follow-ups.", "Day 4 is the best day for the first follow-up.", "Always link one real result."], False),
    ("workspace", "kamran", "2026-08-21", "SEO basics we use on every site", ["One clear title and description per page.", "Schema markup for local business and FAQs.", "Redirect map before any migration.", "Submit the sitemap on launch day.", "Check Core Web Vitals monthly."], False),
    ("workspace", "elena", "2026-09-14", "Estimate checklist", ["Add 20 percent buffer for documents and emails.", "List what is not included.", "Confirm who approves each step.", "Re-estimate after discovery."], False),
    ("personal", "shah", "2026-07-30", "Ideas for WebflowX", ["Action items from meetings become tasks.", "Importers for Slack and Notion.", "Security page and single sign-on plan.", "Public templates for agencies."], False),
    ("personal", "shah", "2026-09-22", "Priorities for Q4", ["Speed first.", "Action items to tasks.", "Importers.", "Hire two engineers."], True),
    ("personal", "shah", "2026-10-06", "Questions for the Tuesday meeting", ["Pricing review for client work.", "How to protect time for the product.", "What the fourth client project could be."], False),
]


def delta(lines):
    ops = [{"insert": "• " + x + "\n"} for x in lines]
    return json.dumps({"ops": ops}, ensure_ascii=False, separators=(",", ":"))


def make_notes():
    out = []
    for typ, who, date, title, lines, pinned in NOTES:
        t = at(d(date), R.uniform(5, 9))
        nid = store.add("notes", {"title": title, "body": delta(lines), "workspaceId": WS, "authorId": members[who], "type": typ,
                                  "isPinned": True if pinned else None, "updatedAt": ms(t + dt.timedelta(days=R.randint(0, 6)))}, t)
        out.append((nid, who, typ, title, t))
    return out


def opt(i, n, c, g=None):
    o = {"id": i, "name": n, "color": c}
    if g:
        o["group"] = g
    return o


NONE = {"match": "and", "conditions": []}


def view(i, n, t, **extra):
    v = {"id": i, "name": n, "type": t, "filter": NONE, "sorts": [], "hidden": [], "order": [], "widths": {}}
    v.update(extra)
    return v


def make_databases():
    out = {}
    # ---- client pipeline
    created = at(d("2026-06-17"), 6.0)
    doc_id = store.add("docs", {"title": "Client pipeline", "workspaceId": WS, "createdBy": members["rania"], "type": "database",
                                "liveblocksRoomId": f"{WS}-db-{ms(created)}-pipe", "updatedAt": ms(NOW - dt.timedelta(days=1)), "updatedBy": members["jordan"],
                                "position": ms(created), "icon": "i:handshake"}, created)
    props = [
        {"id": "stage", "name": "Stage", "type": "select", "options": [opt("lead", "Lead", "gray"), opt("contacted", "Contacted", "blue"), opt("call", "Call booked", "yellow"), opt("proposal", "Proposal", "purple"), opt("won", "Won", "green"), opt("lost", "Lost", "red")]},
        {"id": "company", "name": "Company", "type": "text"},
        {"id": "industry", "name": "Industry", "type": "select", "options": [opt("health", "Healthcare", "pink"), opt("logistics", "Logistics", "orange"), opt("food", "Food and drink", "brown"), opt("retail", "Retail", "blue"), opt("services", "Services", "gray")]},
        {"id": "value", "name": "Deal value", "type": "number", "numberFormat": "usd"},
        {"id": "next", "name": "Next step", "type": "date"},
        {"id": "owner", "name": "Owner", "type": "person"},
    ]
    views = [view("all", "All contacts", "table", sorts=[{"propId": "next", "dir": "asc"}]), view("pipeline", "Pipeline", "board", groupBy="stage"), view("follow", "Follow-ups", "calendar", dateProp="next")]
    store.add("dbConfigs", {"docId": doc_id, "workspaceId": WS, "properties": props, "views": views}, created + dt.timedelta(seconds=1))
    leads = [
        ("Brightpath Dental", "won", "health", 14500, "2026-07-24", "sofia"), ("Harborline Logistics", "won", "logistics", 38000, "2026-07-14", "sofia"),
        ("Tidewell Coffee Co.", "won", "food", 26000, "2026-08-19", "sofia"),
        ("Lakeview Family Clinic", "proposal", "health", 12000, "2026-10-12", "sofia"), ("Orchard Street Pharmacy", "proposal", "health", 9000, "2026-10-14", "sofia"),
        ("Redwood Freight Co.", "proposal", "logistics", 31000, "2026-10-15", "sofia"), ("Maple & Co. Bakery", "call", "food", 8500, "2026-10-13", "rania"),
        ("Summit Physio", "call", "health", 7000, "2026-10-16", "rania"), ("Blue Harbor Movers", "call", "logistics", 15000, "2026-10-12", "rania"),
        ("Greenleaf Grocers", "contacted", "retail", 11000, "2026-10-14", "jordan"), ("Northgate Dental Group", "contacted", "health", 13000, "2026-10-13", "jordan"),
        ("Pinecrest Veterinary", "contacted", "health", 8000, "2026-10-15", "jordan"), ("Quickline Couriers", "contacted", "logistics", 22000, "2026-10-19", "jordan"),
        ("Cedar Roasters", "lead", "food", 6000, "2026-10-20", "jordan"), ("Willow Yoga Studio", "lead", "services", 5000, "2026-10-21", "jordan"),
        ("Bridgeway Accounting", "lead", "services", 7500, "2026-10-21", "jordan"), ("Harvest Table Cafe", "lead", "food", 6500, "2026-10-22", "jordan"),
        ("Stonebridge Dental", "lead", "health", 12500, "2026-10-22", "jordan"), ("Ironwood Hardware", "lead", "retail", 9500, "2026-10-23", "jordan"),
        ("Cityline Cargo", "lead", "logistics", 27000, "2026-10-23", "jordan"), ("Aster Optometry", "contacted", "health", 8800, "2026-10-16", "jordan"),
        ("Fernhill Bike Shop", "lost", "retail", 6000, "2026-09-18", "jordan"), ("Oakline Storage", "lost", "logistics", 18000, "2026-09-02", "rania"),
        ("Crescent Dental", "lost", "health", 10000, "2026-08-20", "sofia"),
    ]
    for i, (co, stage, ind, val, nxt, owner) in enumerate(leads):
        t = at(d("2026-06-17"), 6) + dt.timedelta(days=i * 4 + R.randint(0, 2))
        t = min(t, NOW - dt.timedelta(days=2))
        store.add("dbRows", {"databaseId": doc_id, "workspaceId": WS, "title": co, "values": {"stage": stage, "company": co, "industry": ind, "value": val, "next": {"start": nxt}, "owner": [members[owner]]},
                            "position": ms(created) + i, "createdBy": members[owner], "updatedAt": ms(t), "roomId": f"{WS}-row-{ms(t)}-p{i:02d}"}, t)
    store.add("dbCounts", {"key": f"db:{doc_id}", "workspaceId": WS, "count": len(leads)}, created + dt.timedelta(seconds=2))
    out["pipeline"] = (doc_id, len(leads))

    # ---- content calendar
    created2 = at(d("2026-07-06"), 6.0)
    doc2 = store.add("docs", {"title": "Content calendar", "workspaceId": WS, "createdBy": members["kamran"], "type": "database",
                              "liveblocksRoomId": f"{WS}-db-{ms(created2)}-cont", "updatedAt": ms(NOW - dt.timedelta(days=2)), "updatedBy": members["kamran"],
                              "position": ms(created2) + 1, "icon": "i:calendar-days"}, created2)
    props2 = [
        {"id": "status", "name": "Status", "type": "status", "options": [opt("idea", "Idea", "gray", "todo"), opt("draft", "Drafting", "blue", "progress"), opt("review", "In review", "yellow", "progress"), opt("live", "Published", "green", "done")]},
        {"id": "channel", "name": "Channel", "type": "select", "options": [opt("blog", "Blog", "orange"), opt("news", "Newsletter", "purple"), opt("li", "LinkedIn", "blue"), opt("x", "X", "gray"), opt("yt", "YouTube", "red")]},
        {"id": "publish", "name": "Publish date", "type": "date"},
        {"id": "author", "name": "Author", "type": "person"},
    ]
    views2 = [view("cal", "Calendar", "calendar", dateProp="publish"), view("board", "Pipeline", "board", groupBy="status"), view("all", "All posts", "table", sorts=[{"propId": "publish", "dir": "asc"}])]
    store.add("dbConfigs", {"docId": doc2, "workspaceId": WS, "properties": props2, "views": views2}, created2 + dt.timedelta(seconds=1))
    posts = [
        ("How we plan a two-week sprint", "live", "blog", "2026-07-14", "elena"), ("What we learned redesigning a dental website", "live", "blog", "2026-08-04", "kamran"),
        ("Case study: Brightpath bookings after launch", "live", "li", "2026-08-12", "rania"), ("Why mobile speed matters for local search", "live", "blog", "2026-08-20", "kamran"),
        ("Building a customer portal for a logistics team", "live", "blog", "2026-09-03", "bilal"), ("September newsletter", "live", "news", "2026-09-30", "maya"),
        ("Behind the scenes: a Tidewell beta week", "live", "li", "2026-09-24", "areeba"), ("Three questions to ask before hiring an agency", "live", "li", "2026-09-17", "zainab"),
        ("How preloading made WebflowX feel instant", "review", "blog", "2026-10-14", "hamza"), ("October newsletter", "review", "news", "2026-10-28", "maya"),
        ("Tidewell app launch story", "draft", "blog", "2026-10-21", "areeba"), ("A simple client update template", "draft", "li", "2026-10-13", "elena"),
        ("Walkthrough: meeting summaries in WebflowX", "draft", "yt", "2026-10-22", "noor"), ("Local SEO checklist for clinics", "draft", "blog", "2026-10-27", "kamran"),
        ("What a good project brief looks like", "idea", "li", "2026-11-03", "sofia"), ("How we estimate fixed-price projects", "idea", "blog", "2026-11-10", "elena"),
        ("Hiring: two engineers join the team", "idea", "li", "2026-11-05", "zainab"), ("November newsletter", "idea", "news", "2026-11-25", "maya"),
    ]
    for i, (title, status, ch, pub, author) in enumerate(posts):
        t = min(at(d(pub), 6) - dt.timedelta(days=R.randint(8, 18)), NOW - dt.timedelta(days=1))
        t = max(t, created2 + dt.timedelta(hours=1))
        store.add("dbRows", {"databaseId": doc2, "workspaceId": WS, "title": title, "values": {"status": status, "channel": ch, "publish": {"start": pub}, "author": [members[author]]},
                            "position": ms(created2) + i + 1, "createdBy": members[author], "updatedAt": ms(t), "roomId": f"{WS}-row-{ms(t)}-c{i:02d}"}, t)
    store.add("dbCounts", {"key": f"db:{doc2}", "workspaceId": WS, "count": len(posts)}, created2 + dt.timedelta(seconds=2))
    out["content"] = (doc2, len(posts))
    return out


def make_audit(chan_ids):
    A = []
    A.append(("2026-06-03", 3.2, "shah", "workspace.update", "name: northfoundry, description"))
    for p, date in [("zainab", "2026-06-03"), ("daniyal", "2026-06-03"), ("maya", "2026-06-04")]:
        A.append((date, 3.5, "shah", "member.role", f"{names[p]}: member → {PEOPLE[p][2]}"))
    for short_, full, date, who in [("brightpath-dental", "#brightpath-dental", "2026-06-08", "maya"), ("harborline-portal", "#harborline-portal", "2026-06-26", "maya"),
                                   ("tidewell-app", "#tidewell-app", "2026-06-17", "maya"), ("outreach", "#outreach", "2026-06-16", "rania"), ("wins", "#wins", "2026-06-22", "zainab")]:
        A.append((date, 6.1, who, "channel.create", full))
    A.append(("2026-06-11", 14.0, "maya", "channel.guests", "#brightpath-dental: 1 guest"))
    A.append(("2026-06-19", 14.0, "maya", "channel.guests", "#tidewell-app: 1 guest"))
    A.append(("2026-06-29", 14.0, "maya", "channel.guests", "#harborline-portal: 1 guest"))
    A.append(("2026-06-05", 5.0, "shah", "channel.readonly_on", "#announcements"))
    A.append(("2026-06-12", 5.0, "daniyal", "integration.create", "github: GitHub"))
    A.append(("2026-06-12", 5.2, "usman", "integration.create", "incoming webhook: Vercel"))
    A.append(("2026-07-01", 5.0, "shah", "security.require_2fa", None))
    A.append(("2026-07-20", 6.0, "shah", "invite.reset", "expires in 7 days"))
    A.append(("2026-08-17", 6.0, "zainab", "invite.reset", "expires in 7 days"))
    A.append(("2026-09-08", 6.0, "shah", "permissions.update", "member: view analytics, create docs"))
    A.append(("2026-09-08", 6.1, "shah", "role.create", "Client success"))
    A.append(("2026-09-08", 6.2, "shah", "member.customRole", f"{names['maya']}: member → Client success"))
    for title, who, date in [("Brightpath: launch checklist and DNS cutover", "usman", "2026-07-24"), ("Tidewell: Stripe payments and tips", "omar", "2026-07-30"),
                             ("Harborline: shipment list and tracking page", "ethan", "2026-08-13"), ("WebflowX: two-step verification", "omar", "2026-09-10")]:
        A.append((date, 10.0, who, "task.completed", title))
    for title, who, date in [("Harborline: fix slow shipment search", "elena", "2026-09-28"), ("Tidewell: store submission", "elena", "2026-10-05")]:
        A.append((date, 6.0, who, "task.created", title))
    for date, who, nm in [("2026-08-26", "zainab", "A temp contractor")]:
        pass
    ids = []
    for date, hour, who, action, detail in A:
        t = at(d(date), hour) + dt.timedelta(minutes=R.randint(0, 20))
        ids.append(store.add("auditLog", {"workspaceId": WS, "actorId": members[who], "action": action, "detail": detail}, t))
    return len(ids)


def first_name(k):
    return names[k].split()[0]


def make_notifications(dms, task_ids, comments, notes):
    shah = members["shah"]
    n = 0

    def add(typ, sender, when, read, **kw):
        nonlocal n
        n += 1
        doc = {"workspaceId": WS, "recipientId": shah, "senderId": members[sender], "type": typ, "read": read}
        doc.update(kw)
        store.add("notifications", doc, when)

    recent = NOW - dt.timedelta(days=4)
    cands = []
    for m in LOG:
        if m["bot"] or m["who"] == "shah":
            continue
        txt = m["text"]
        if "[@shah]" in txt and m["ch"]:
            cands.append(("mention", m))
    parent_owner = {m["id"]: m for m in LOG}
    for m in LOG:
        if m["parent"] and m["who"] != "shah" and parent_owner.get(m["parent"], {}).get("who") == "shah" and m["ch"]:
            cands.append(("thread_reply", m))
    for m in LOG:
        if m["conv"] and m["who"] != "shah":
            cands.append(("dm_received", m))
    cands.sort(key=lambda x: x[1]["when"])
    # keep the most recent 16 of those
    for typ, m in cands[-16:]:
        age = m["when"]
        add(typ, m["who"], m["when"] + mins(1), age < recent, messageId=m["id"], channelId=m["ch"], conversationId=m["conv"], body=plain(m["text"])[:120])
    for (tid, title, proj, owner, label, status, created, updated, si, creator) in task_ids:
        if owner == "shah":
            add("task_assigned", creator, created + mins(2), status == "done", taskId=tid, body=title)
            if status in ("todo", "in_progress"):
                add("task_due", creator, NOW - dt.timedelta(hours=R.randint(3, 20)), False, taskId=tid, body=title)
    for (cid, tid, who, t) in comments:
        tk = next(x for x in task_ids if x[0] == tid)
        if who == "shah":
            continue
        if t > NOW - dt.timedelta(days=6) and R.random() < 0.5 and tk[3] == "shah":
            add("task_comment", who, t, False, taskId=tid, body=title)
    return n


def make_saved_pins():
    pool = [m for m in LOG if not m["bot"] and not m["parent"] and m["ch"] and len(m["text"]) > 60]
    wins = [m for m in pool if m["ch"] == CH["wins"] or m["ch"] == CH["announcements"]]
    eng = [m for m in pool if m["ch"] in (CH["engineering"], CH["product-roadmap"], CH["sprint-planning"])]
    saved = R.sample(wins, k=min(3, len(wins))) + R.sample(eng, k=min(3, len(eng)))
    for m in saved:
        store.add("savedMessages", {"workspaceId": WS, "memberId": members["shah"], "messageId": m["id"]}, m["when"] + dt.timedelta(days=R.randint(0, 3)))
    pinned = 0
    for chname, k in [("announcements", 2), ("general", 1), ("engineering", 1), ("brightpath-dental", 1), ("harborline-portal", 1), ("wins", 1)]:
        c = [m for m in pool if m["ch"] == CH[chname]]
        for m in R.sample(c, k=min(k, len(c))):
            store.add("pins", {"workspaceId": WS, "channelId": CH[chname], "messageId": m["id"], "pinnedBy": members[R.choice(["shah", "zainab", "daniyal"])]}, m["when"] + dt.timedelta(days=R.randint(0, 2)))
            pinned += 1
    return len(saved), pinned
