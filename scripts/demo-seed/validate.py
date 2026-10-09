import json, glob, os, sys, collections, datetime as dt
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from lib import TABLES, NOW, ms, ALPHA
out = os.path.join(os.path.dirname(os.path.abspath(__file__)), "out")
T = {}
for f in glob.glob(out + "/*.jsonl"):
    T[os.path.basename(f)[:-6]] = [json.loads(l) for l in open(f, encoding="utf-8")]
ids = {}
bad = 0
def err(m):
    global bad; bad += 1; print("ERR", m)
def decode(s):
    v = 0
    for c in s: v = v * 32 + ALPHA.index(c)
    bits = len(s) * 5
    return v.to_bytes(bits // 8, "big")
for t, docs in T.items():
    for x in docs:
        i = x["_id"]
        if i in ids: err("dup id " + i)
        ids[i] = t
        b = decode(i)
        n = b[0] if b[0] < 128 else (b[0] & 127) | (b[1] << 7)
        if n != TABLES[t]: err(f"table number {t} {i}")
        s1 = s2 = 0
        for y in b[:-2]: s1 = (s1 + y) % 256; s2 = (s2 + s1) % 256
        if (s1, s2) != (b[-2], b[-1]): err("checksum " + i)
        if x["_creationTime"] > ms(NOW): err(f"future {t} {i}")
# references
REF = {"memberId": "members", "createdBy": "members", "authorId": "members", "assigneeId": "members", "actorId": "members", "recipientId": "members", "senderId": "members",
       "pinnedBy": "members", "memberOneId": "members", "memberTwoId": "members", "userId": "users", "workspaceId": None, "channelId": "channels", "conversationId": "conversations",
       "messageId": "messages", "parentMessagesId": "messages", "taskId": "tasks", "sprintId": "sprints", "meetingId": "meetings", "docId": "docs", "databaseId": "docs", "noteId": "notes", "updatedBy": "members"}
EXIST = {"k574pdzmjvhv96f777rhrp124s87vf8y", "k979pd5p78jmweswkave38qbd587v1b2", "k17272mf8b2x23ang9qrqv13qx87twz3"}
EXIST_CH = set()
import ctx
EXIST_CH = set(ctx.CH.values()) if hasattr(ctx, "CH") else set()
for t, docs in T.items():
    for x in docs:
        for k, tt in REF.items():
            if k in x and tt:
                vals = x[k] if isinstance(x[k], list) else [x[k]]
                for v in vals:
                    if v in EXIST or v in EXIST_CH: continue
                    if ids.get(v) != tt: err(f"{t}.{k} -> {v} is {ids.get(v)}")
# messages: join dates and json bodies
mem2user = {m["_id"]: m["userId"] for m in T["members"]}
user_join = {u["_id"]: u["_creationTime"] for u in T["users"]}
for m in T["messages"]:
    json.loads(m["body"])
    mm = m["memberId"]
    if mm in mem2user and not m.get("integrationName") and m["_creationTime"] < user_join[mem2user[mm]]: err("pre-join message " + m["_id"])
# threads: reply after parent
mt = {m["_id"]: m["_creationTime"] for m in T["messages"]}
for m in T["messages"]:
    p = m.get("parentMessagesId")
    if p and mt[p] >= m["_creationTime"]: err("reply before parent " + m["_id"])
# reactions after message
for r in T["reactions"]:
    if mt[r["messageId"]] >= r["_creationTime"]: err("reaction before message")
# tasks
for t in T["tasks"]:
    if t["status"] not in ("backlog","todo","in_progress","in_review","done"): err("status")
# guests channel
print("tables", {k: len(v) for k, v in T.items()})
print("range", dt.datetime.fromtimestamp(min(x["_creationTime"] for d in T.values() for x in d)/1000, dt.timezone.utc), dt.datetime.fromtimestamp(max(x["_creationTime"] for d in T.values() for x in d)/1000, dt.timezone.utc))
print("ERRORS", bad)
