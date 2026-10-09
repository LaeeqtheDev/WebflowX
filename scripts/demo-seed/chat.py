"""Builds people, channels and every message in the workspace."""
import datetime as dt
from ctx import *
from story import SPRINTS, TASKS, CLIENTS
import pools, scenes_clients, scenes_team


FEMALE = {"zainab", "maya", "sana", "priya", "noor", "areeba", "hira", "elena", "rania", "sofia", "rebecca", "nadia"}
HAIR_F = ["bob", "bun", "curly", "straight01", "straight02", "longButNotTooLong", "bigHair", "frida", "miaWallace"]
HAIR_M = ["shortFlat", "shortWaved", "shortCurly", "shortRound", "theCaesar", "sides"]
SKIN = {"pk": ["d08b5b", "ae5d29", "edb98a"], "us": ["edb98a", "ffdbb4", "d08b5b"], "eu": ["ffdbb4", "edb98a", "f8d25c"]}
HAIRC = ["2c1b18", "4a312c", "724133", "b58143"]


def avatar(key, name):
    """Cartoon avatar whose hair and beard follow the person's gender. Deterministic per person, no randomness used."""
    h = sum(ord(c) * (i + 3) for i, c in enumerate(key))
    female = key in FEMALE
    top = (HAIR_F if female else HAIR_M)[h % (len(HAIR_F) if female else len(HAIR_M))]
    skin = SKIN[PEOPLE[key][3]][h % 3]
    beard = "" if female or h % 3 == 0 else "&facialHair=" + ["beardLight", "beardMedium", "moustacheFancy"][h % 3] + "&facialHairProbability=100"
    nobeard = "&facialHairProbability=0" if (female or h % 3 == 0) else ""
    return ("https://api.dicebear.com/9.x/avataaars/svg?seed=" + name.replace(" ", "%20") + "&top=" + top + "&skinColor=" + skin
            + "&hairColor=" + HAIRC[h % 4] + beard + nobeard + "&backgroundColor=ffe1d6,fff1c9,dbeafe,e5dcff,d8f5e4")


def setup_people():
    for key, (name, title, role, reg, join, bio) in PEOPLE.items():
        j = d(join)
        t = at(j, 3.0)
        email = name.lower().replace(" ", ".").replace("'", "") + "@nf-demo.test"
        image = avatar(key, name)
        uid = store.add("users", {"name": name, "email": email, "emailVerificationTime": ms(t), "image": image, "title": title, "bio": bio,
                                  "theme": R.choice(["light", "light", "dark", "system"])}, t)
        mid = store.add("members", {"userId": uid, "workspaceId": WS, "role": role}, t + mins(2))
        users[key], members[key], names[key], region[key], joined[key] = uid, mid, name, reg, j
    for k in members:
        PEOPLE_MAP[k] = (members[k], names[k])


def setup_channels():
    new = [
        ("🦷brightpath-dental", "brightpath-dental", "Shared channel with the Brightpath Dental team", "2026-06-08", ["rebecca"]),
        ("🚚harborline-portal", "harborline-portal", "Shared channel with Harborline Logistics for the customer portal", "2026-06-26", ["aaron"]),
        ("☕tidewell-app", "tidewell-app", "Shared channel with Tidewell Coffee Co. for the ordering app", "2026-06-17", ["nadia"]),
        ("📣outreach", "outreach", "Outreach plans, weekly numbers and what is working", "2026-06-16", []),
        ("🏆wins", "wins", "Good news from clients and the team", "2026-06-22", []),
    ]
    for full, short, desc, date, guests in new:
        doc = {"name": full, "workspaceId": WS, "description": desc}
        if guests:
            doc["guestIds"] = [members[g] for g in guests]
        CH[short] = store.add("channels", doc, at(d(date), 6.0))


def workday_or_next(day):
    while day.weekday() >= 5:
        day += dt.timedelta(days=1)
    return day


def run_scene(ch, date, hour, lines):
    chid = CH[ch]
    day = d(date)
    t = at(day, hour)
    pool = EMOJI_HAPPY if ch in ("wins", "announcements") else EMOJI_WORK
    chance = 0.85 if ch in ("wins", "announcements") else 0.4
    for line in lines:
        who, text = line[0], line[1]
        replies = line[2] if len(line) > 2 else []
        t += mins(R.randint(1, 12))
        mid = post(chid, None, who, text, t, edited=R.random() < 0.05)
        react(mid, t, who, pool, chance, ch)
        rt = t
        for rw, rtext in replies:
            rt += mins(R.randint(3, 50))
            rid = post(chid, None, rw, rtext, rt, parent=mid)
            react(rid, rt, rw, EMOJI_WORK, 0.15, ch)


def handwritten():
    for ch, date, hour, lines in scenes_clients.S + scenes_team.S:
        run_scene(ch, date, hour, lines)


def introductions():
    ch = CH["introductions"]
    first = lambda k: names[k].split()[0]
    for key in STAFF:
        name, title, role, reg, join, bio = PEOPLE[key]
        j = d(join)
        t = at(j, {"pk": 6.2, "eu": 8.0, "us": 15.0}[reg]) + mins(R.randint(0, 90))
        text = f"Hi everyone, I'm {first(key)}. I joined as {title}. {bio} Excited to work with you all."
        mid = post(ch, None, key, text, t)
        react(mid, t, key, EMOJI_HAPPY, 0.9, "introductions")
        welcomers = [k for k in STAFF if joined[k] < j and k != key] + ["shah"]
        for w in R.sample(welcomers, k=min(len(welcomers), R.randint(1, 3))):
            t2 = t + mins(R.randint(10, 400))
            post(ch, None, w, R.choice(["Welcome aboard, " + first(key) + "!", "Great to have you, " + first(key) + ".", "Welcome! Ping me if you need anything.", "Happy to have you on the team, " + first(key) + "."]), t2, parent=mid)


def banter():
    for day in workdays(d("2026-06-09"), d("2026-10-09")):
        if day == d("2026-08-14"):
            continue
        if R.random() < 0.6:
            who = R.choice(STAFF)
            if joined[who] > day:
                continue
            t = person_time(day, who)
            ch = CH["watercooler"] if R.random() < 0.8 else CH["general"]
            text = R.choice(pools.BANTER) if ch == CH["watercooler"] else R.choice(pools.GENERAL)
            if R.random() < 0.15:
                who = "zainab" if joined["zainab"] <= day else who
            mid = post(ch, None, who, text, t)
            react(mid, t, who, EMOJI_FUN, 0.5, "watercooler")
            for _ in range(R.choice([0, 1, 1, 2, 3])):
                rw = R.choice([k for k in STAFF if joined[k] <= day and k != who])
                t = t + mins(R.randint(4, 90))
                post(ch, None, rw, R.choice(pools.BANTER_REPLIES), t, parent=mid)
    # Independence Day
    t = at(d("2026-08-14"), 4.5)
    mid = post(CH["general"], None, "usman", "Happy Independence Day, everyone. Enjoy the long weekend.", t)
    react(mid, t, "usman", EMOJI_HAPPY, 1.0, "general")


def sprint_index(day):
    idx = 0
    for i, (_, a, b, _) in enumerate(SPRINTS):
        if d(a) <= day:
            idx = i
    return idx


def short_task(title):
    s = title.split(": ", 1)[1] if ": " in title else title
    return s[0].lower() + s[1:]


def standups():
    ch = CH["engineering"]
    engs = ["hamza", "sana", "ethan", "bilal", "omar", "priya", "noor", "lucas", "usman"]
    for day in workdays(d("2026-06-15"), d("2026-10-09")):
        if day == d("2026-08-14"):
            continue
        t = at(day, 5.1)
        mid = post(ch, None, "daniyal", f"**Standup for {day.strftime('%a %d %b')}.** Reply with yesterday, today and blockers. Async is fine.", t)
        si = sprint_index(day)
        who = [k for k in R.sample(engs, k=R.randint(3, 5)) if joined[k] <= day]
        times = sorted(person_time(day, k) for k in who)
        for k, tt in zip(who, times):
            mine = [x for x in TASKS if x[2] == k and x[6] in (si, si - 1)]
            a = short_task(R.choice(mine)[0]) if mine else R.choice(["reviewing teammates' pull requests", "small fixes from the bug list", "cleaning up test coverage"])
            b = short_task(R.choice(mine)[0]) if mine else R.choice(["the next item on my list", "pairing on a tricky bug", "documentation for the last release"])
            txt = f"Yesterday: {R.choice(pools.STANDUP_Y).lower()} {a}. Today: {R.choice(pools.STANDUP_T).lower()} {b}. Blockers: {R.choice(pools.STANDUP_B)}."
            post(ch, None, k, txt, max(tt, t + mins(20)), parent=mid)


def deployments():
    ch = CH["deployments"]
    projects = [
        ("brightpath-site", "2026-06-15", "2026-07-24", 0.55, ["sana", "hamza", "usman"]),
        ("brightpath-site", "2026-07-25", "2026-10-09", 0.06, ["sana", "kamran"]),
        ("harborline-portal", "2026-07-06", "2026-10-09", 0.45, ["ethan", "bilal", "priya", "omar"]),
        ("tidewell-api", "2026-07-01", "2026-10-09", 0.4, ["bilal", "omar", "usman"]),
        ("tidewell-app", "2026-08-17", "2026-10-09", 0.3, ["hamza", "usman"]),
        ("webflowx", "2026-06-15", "2026-10-09", 0.45, ["daniyal", "hamza", "sana", "bilal"]),
    ]
    prs = {}
    for name, a, b, p, devs in projects:
        for day in workdays(d(a), d(b)):
            if day == d("2026-08-14") or R.random() > p:
                continue
            who = R.choice(devs)
            if joined[who] > day:
                continue
            t = person_time(day, who)
            n = prs.get(name, 40) + R.randint(1, 4)
            prs[name] = n
            titles = [x[0] for x in TASKS if x[1] in name.split("-")[0] or (name == "webflowx" and x[1] == "webflowx")]
            title = short_task(R.choice(titles)) if titles else "dependency updates"
            if R.random() < 0.55:
                post(ch, None, who, f"Merged pull request #{n} into `main`: {R.choice(pools.PR_VERBS)} {title}", t, bot="GitHub")
            sha = "".join(R.choice(pools.SHAS) for _ in range(7))
            post(ch, None, who, f"Production deployment ready: `{name}` · `{sha}` · by {names[who].split()[0]} · {R.randint(18, 64)}s", t + mins(R.randint(2, 6)), bot="Vercel")
    # two incidents
    for day, proj, culprit in [("2026-07-30", "harborline-portal", "omar"), ("2026-09-11", "tidewell-api", "bilal")]:
        t = at(d(day), 7.2)
        mid = post(ch, None, culprit, f"Production deployment failed: `{proj}` · build error in the notification service", t, bot="Vercel")
        post(ch, None, "usman", f"Rolled back `{proj}` to the previous release. No customer impact, the failed build never went live.", t + mins(6))
        post(ch, None, culprit, "Found it: a missing environment variable in the new service. Fixed and redeployed.", t + mins(41))
        post(ch, None, "daniyal", "Thanks both. Usman, can we add a pre-deploy check for missing variables?", t + mins(55))
        post(ch, None, "usman", "Yes, added to the pipeline today.", t + mins(70))


def bugs():
    ch = CH["bug-reports"]
    windows = {"brightpath": ("2026-06-29", "2026-07-22"), "harborline": ("2026-07-20", "2026-10-02"),
               "tidewell": ("2026-08-24", "2026-09-30"), "webflowx": ("2026-09-28", "2026-10-08")}
    devs = {"brightpath": ["sana", "hamza"], "harborline": ["ethan", "bilal", "priya"], "tidewell": ["hamza", "omar", "priya"], "webflowx": ["sana", "hamza", "daniyal"]}
    items = []
    for proj, title, sev in pools.BUGS:
        a, b = (d(x) for x in windows[proj])
        days = [x for x in workdays(a, b) if x != d("2026-08-14")]
        items.append((R.choice(days), proj, title, sev))
    items.sort(key=lambda x: x[0])
    for i, (day, proj, title, sev) in enumerate(items, start=101):
        rep = R.choice(["hira", "marcus", "hira", "maya"])
        t = person_time(day, rep)
        if joined[rep] > day:
            rep = "hira"; t = person_time(day, rep)
        text = f"**BUG-{i} · {title}**\nProject: {CLIENTS.get(proj, 'WebflowX')}. Severity: {sev}.\n{R.choice(pools.BUG_STEPS)}"
        mid = post(ch, None, rep, text, t)
        dev = R.choice(devs[proj])
        t1 = t + mins(R.randint(25, 300))
        post(ch, None, dev, R.choice(pools.BUG_FIX), t1, parent=mid)
        if (NOW - t).days >= 2 or R.random() < 0.4:
            t2 = t1 + mins(R.randint(120, 1500))
            post(ch, None, dev, R.choice(pools.BUG_DONE), t2, parent=mid)
            if (NOW - t2).days >= 1:
                t3 = t2 + mins(R.randint(60, 1200))
                post(ch, None, "hira" if rep != "marcus" else "marcus", R.choice(pools.BUG_VERIFY), t3, parent=mid)


def analytics():
    ch = CH["analytics"]
    mondays = [x for x in workdays(d("2026-06-15"), d("2026-10-05")) if x.weekday() == 0]
    for i, day in enumerate(mondays):
        t = at(day, 6.2) + mins(R.randint(0, 40))
        bp = int(1850 + (0 if day < d("2026-07-24") else 380 * min(8, (day - d("2026-07-24")).days // 7 + 1)) + R.randint(-80, 80))
        hl = int(120 + max(0, (day - d("2026-08-13")).days) * 5 + R.randint(-10, 10)) if day >= d("2026-08-13") else None
        td = int(40 + (day - d("2026-09-04")).days * 3 + R.randint(-3, 8)) if day >= d("2026-09-07") else None
        lines = [f"**Weekly numbers, week of {day.strftime('%d %b')}.**", f"Brightpath site: {bp:,} visits" + (f", {int(bp * 0.031)} booking requests" if day >= d("2026-07-27") else ""),]
        if hl:
            lines.append(f"Harborline portal: {hl} active customer users")
        if td:
            lines.append(f"Tidewell beta: {td} active testers")
        lines.append("Mobile Lighthouse on all client sites: above 95.")
        who = "kamran" if joined["kamran"] <= day else "ethan"
        mid = post(ch, None, who, "\n".join(lines), t)
        if R.random() < 0.4:
            post(ch, None, R.choice(["maya", "zainab", "elena"]), R.choice(["Thanks, adding this to the client update.", "Great trend. Can we share this on the next call?", "Nice. Let's keep an eye on mobile speed."]), t + mins(R.randint(20, 300)), parent=mid)


def outreach_weekly():
    ch = CH["outreach"]
    fridays = [x for x in workdays(d("2026-06-19"), d("2026-10-09")) if x.weekday() == 4 and x != d("2026-08-14")]
    for i, day in enumerate(fridays):
        sent = R.randint(280, 460); rep = int(sent * R.uniform(0.05, 0.1)); calls = max(2, int(rep * R.uniform(0.25, 0.45))); props = R.randint(1, 4)
        t = at(day, 11.0) + mins(R.randint(0, 50))
        mid = post(ch, None, "jordan", f"**Week {i + 1}.** {sent} emails sent, {rep} replies, {calls} calls booked, {props} proposal{'s' if props > 1 else ''} sent.", t)
        if R.random() < 0.45:
            post(ch, None, "rania", R.choice(["Good week. Let's keep the follow-up on day 4.", "Replies look healthy. Can you share the two best ones in the thread?", "Nice. The clinic list is performing best, let's add 100 more.", "Thanks Jordan. Calls booked is the number I care about."]), t + mins(R.randint(30, 400)), parent=mid)


def sprint_posts():
    ch = CH["sprint-planning"]
    for i, (name, a, b, status) in enumerate(SPRINTS):
        tasks = [x for x in TASKS if x[6] == i]
        pts = sum(x[4] for x in tasks)
        goals = "\n".join("• " + short_task(x[0]).capitalize() for x in tasks[:4])
        t = at(d(a), 5.4) if status != "planned" else at(d("2026-10-08"), 8.0)
        mid = post(ch, None, "elena", f"**{name}** {'starts today' if status != 'planned' else 'starts on Monday'}. {len(tasks)} tasks, {pts} points committed.\nGoals:\n{goals}", t)
        react(mid, t, "elena", EMOJI_WORK, 0.7, "sprint-planning")
        for k in R.sample(["daniyal", "hamza", "bilal", "areeba", "hira"], k=2):
            post(ch, None, k, R.choice(["Looks realistic to me.", "Can we move one item out? I am out for two days.", "Happy with this scope.", "Good, clear goals."]), t + mins(R.randint(10, 180)), parent=mid)
        if status == "completed":
            done = sum(1 for x in tasks if x[5] == "done")
            t2 = at(d(b), 9.5)
            m2 = post(ch, None, "elena", f"**{name} review.** {done} of {len(tasks)} tasks done, {sum(x[4] for x in tasks if x[5] == 'done')} points delivered. Retro notes are in the docs.", t2)
            post(ch, None, "daniyal", R.choice(["Good sprint. Thanks everyone.", "Solid delivery. Let's move leftovers to the next sprint.", "Thanks all. Review notes in the retro doc."]), t2 + mins(R.randint(15, 120)), parent=m2)
