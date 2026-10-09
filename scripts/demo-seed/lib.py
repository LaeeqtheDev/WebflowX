"""Shared helpers for the demo seed generator: ids, times, message bodies and the document store."""
import json, random, re, datetime as dt

# Table numbers read from the deployment with `demoSeedInfo:info`.
TABLES = {
    "aiSummaryLog": 10001, "attachments": 10034, "auditLog": 10024, "calendarFeeds": 10035, "channels": 10011,
    "conversations": 10013, "dbConfigs": 10037, "dbCounts": 10038, "dbRows": 10039, "docFavorites": 10040,
    "docTemplates": 10041, "docs": 10020, "files": 10025, "integrations": 10036, "meetingTranscripts": 10022,
    "meetings": 10019, "members": 10010, "messages": 10012, "notes": 10015, "notifications": 10021, "pins": 10027,
    "reactions": 10014, "savedMessages": 10030, "sprints": 10017, "taskComments": 10018, "tasks": 10016,
    "users": 10008, "workspaces": 10009,
}

WS = "k574pdzmjvhv96f777rhrp124s87vf8y"
OWNER_USER = "k17272mf8b2x23ang9qrqv13qx87twz3"
OWNER_MEMBER = "k979pd5p78jmweswkave38qbd587v1b2"
OWNER_NAME = "Syed Laeeq Ahmed"

# "Now" for the story: Fri 9 Oct 2026, 14:00 Pakistan time. History runs 4 months back from here.
NOW = dt.datetime(2026, 10, 9, 9, 0, tzinfo=dt.timezone.utc)
START = dt.datetime(2026, 6, 9, 0, 0, tzinfo=dt.timezone.utc)

RNG = random.Random(20261009)
ALPHA = "0123456789abcdefghjkmnpqrstvwxyz"


def mint(table: str) -> str:
    n = TABLES[table]
    b = []
    while n >= 0x80:
        b.append((n & 0x7F) | 0x80)
        n >>= 7
    b.append(n)
    b += [RNG.randrange(256) for _ in range(16)]
    s1 = s2 = 0
    for x in b:
        s1 = (s1 + x) % 256
        s2 = (s2 + s1) % 256
    b += [s1, s2]
    v = int.from_bytes(bytes(b), "big")
    bits = len(b) * 8
    assert bits % 5 == 0
    return "".join(ALPHA[(v >> (5 * (bits // 5 - 1 - i))) & 31] for i in range(bits // 5))


def ms(d: dt.datetime) -> int:
    return int(d.timestamp() * 1000)


def at(day: dt.date, hour: float) -> dt.datetime:
    """UTC datetime on `day` at fractional hour (e.g. 6.5 = 06:30 UTC)."""
    base = dt.datetime(day.year, day.month, day.day, tzinfo=dt.timezone.utc)
    return base + dt.timedelta(minutes=int(hour * 60))


def d(s: str) -> dt.date:
    return dt.date.fromisoformat(s)


def iso(day: dt.date) -> str:
    return day.isoformat()


# ---- message bodies (Quill delta stored as JSON text) ----
_TOKEN = re.compile(r"(\[@[a-z_]+\]|\*\*[^*]+\*\*|`[^`]+`)")


def body(text: str, people=None) -> str:
    """Plain text with [@key] mentions, **bold** and `code`. people: key -> (member id, display name)."""
    ops = []
    for part in _TOKEN.split(text):
        if not part:
            continue
        if part.startswith("[@"):
            key = part[2:-1]
            mid, name = people[key]
            ops.append({"insert": "@" + name, "attributes": {"mention": mid}})
        elif part.startswith("**"):
            ops.append({"insert": part[2:-2], "attributes": {"bold": True}})
        elif part.startswith("`"):
            ops.append({"insert": part[1:-1], "attributes": {"code": True}})
        else:
            ops.append({"insert": part})
    ops.append({"insert": "\n"})
    return json.dumps({"ops": ops}, ensure_ascii=False, separators=(",", ":"))


def plain(text: str) -> str:
    return re.sub(r"\[@([a-z_]+)\]", lambda m: "@" + m.group(1), re.sub(r"\*\*|`", "", text))


class Store:
    def __init__(self):
        self.tables = {t: [] for t in TABLES}

    def add(self, table: str, fields: dict, created: dt.datetime | int, _id: str | None = None) -> str:
        _id = _id or mint(table)
        c = created if isinstance(created, int) else ms(created)
        doc = {"_id": _id, "_creationTime": c}
        doc.update({k: v for k, v in fields.items() if v is not None})
        self.tables[table].append(doc)
        return _id

    def write(self, outdir: str):
        import os
        os.makedirs(outdir, exist_ok=True)
        counts = {}
        for t, docs in self.tables.items():
            if not docs:
                continue
            docs.sort(key=lambda x: (x["_creationTime"], x["_id"]))
            last = 0
            for x in docs:  # strictly increasing creation times inside a table
                if x["_creationTime"] <= last:
                    x["_creationTime"] = last + 1
                last = x["_creationTime"]
            with open(os.path.join(outdir, f"{t}.jsonl"), "w", encoding="utf-8") as f:
                for x in docs:
                    f.write(json.dumps(x, ensure_ascii=False, separators=(",", ":")) + "\n")
            counts[t] = len(docs)
        return counts


def workdays(a: dt.date, b: dt.date):
    x = a
    while x <= b:
        if x.weekday() < 5:
            yield x
        x += dt.timedelta(days=1)
