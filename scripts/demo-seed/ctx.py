"""Shared state for the generator: the store, people, channels and message helpers."""
import datetime as dt
from lib import *
from people import PEOPLE, STAFF, HOURS

R = RNG
store = Store()

members = {"shah": OWNER_MEMBER}
users = {"shah": OWNER_USER}
names = {"shah": OWNER_NAME}
region = {"shah": "pk"}
joined = {"shah": d("2026-06-01")}

# existing channels in the workspace (from demoSeedInfo:info)
CH = {
    "general": "kd76edgmdrzt4a3cs1800h80hn87td1f", "announcements": "kd7cb3by6kya8jvvqqp9zz9wvh87tzfm",
    "introductions": "kd73asdkbr4ad3msymde4e3e1d87vp06", "engineering": "kd76mgxgwzyg3djd319bjnx3w587vy87",
    "frontend": "kd77x5chwk0w9gsxkpn6ah1r9x87temp", "backend": "kd77cb5emfptgthwr118efkw5s87tn9c",
    "ai-research": "kd7fvr6q8482hcqfetha3tn99s87t7g7", "deployments": "kd7861nf69cgn0ne28fcdhcc3d87t583",
    "bug-reports": "kd7c2hh37csyfe2hrq0fpgf62587vxqr", "product-roadmap": "kd78rn64tvr69rssv0swq2hrx587t88j",
    "sprint-planning": "kd7dqnm02c1ncmhrjgwk0c079987tpwx", "qa-testing": "kd7arme8rpgkss46vexevewye987vn2g",
    "analytics": "kd7b8n069223rq1ay4372ejwg187vm4s", "design": "kd77cq1n5he7bsntp3a1nc9h8s87t877",
    "customer-success": "kd7eaqrnp4wz6yx98mbzs1sbpn87vksg", "watercooler": "kd76ajd63jek92y8hxgexd01dh87tj6e",
}
PEOPLE_MAP = {}
LOG = []          # every message created: dict(id, ch, who, when, kind)
CLIENT_CH = {"brightpath-dental": "rebecca", "harborline-portal": "aaron", "tidewell-app": "nadia"}


def person_time(day, key):
    lo, hi = HOURS[region.get(key, "pk")]
    return at(day, R.uniform(lo, hi))


def mins(n):
    return dt.timedelta(minutes=n)


def post(ch=None, conv=None, who="shah", text="", when=None, parent=None, bot=None, edited=False):
    doc = {"body": body(text, PEOPLE_MAP), "memberId": members["shah"] if bot else members[who], "workspaceId": WS}
    if ch:
        doc["channelId"] = ch
    if conv:
        doc["conversationId"] = conv
    if parent:
        doc["parentMessagesId"] = parent
    if bot:
        doc["integrationName"] = bot
    if edited:
        doc["updatedAt"] = ms(when) + 240000
    mid = store.add("messages", doc, when)
    LOG.append({"id": mid, "ch": ch, "conv": conv, "who": who, "when": when, "bot": bool(bot), "parent": parent, "text": text})
    return mid


EMOJI_WORK = ["👍", "👍", "✅", "👀", "🙏", "💯", "🔥"]
EMOJI_HAPPY = ["🎉", "🔥", "👏", "❤️", "🙌", "💯", "🚀"]
EMOJI_FUN = ["😂", "👍", "❤️", "😄", "☕"]


def react(mid, when, author, pool, chance, ch_name="", n_max=3):
    if R.random() > chance:
        return
    pool_people = [k for k in STAFF if k != author and joined.get(k, d("2026-06-01")) <= when.date()]
    pool_people.append("shah") if author != "shah" else None
    guest = CLIENT_CH.get(ch_name)
    if guest:
        pool_people += [guest]
    for e in R.sample(pool, k=min(len(pool), R.randint(1, n_max))):
        for who in R.sample(pool_people, k=min(len(pool_people), R.randint(1, 4))):
            store.add("reactions", {"workspaceId": WS, "messageId": mid, "memberId": members[who], "value": e}, when + mins(R.randint(2, 240)))
