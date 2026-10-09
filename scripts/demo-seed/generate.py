"""Builds the North Foundry (Demo) seed as JSONL files in ./out. Run: python3 generate.py"""
import sys, os, json, shutil
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import chat, work
from ctx import *


def prune():
    """Drop anything stamped after 'now' and whatever depends on it."""
    cut = ms(NOW)
    gone = {x["_id"] for x in store.tables["messages"] if x["_creationTime"] > cut}
    changed = True
    while changed:
        changed = False
        for x in store.tables["messages"]:
            if x["_id"] not in gone and x.get("parentMessagesId") in gone:
                gone.add(x["_id"]); changed = True
    store.tables["messages"] = [x for x in store.tables["messages"] if x["_id"] not in gone]
    for t in ("reactions", "pins", "savedMessages", "notifications"):
        store.tables[t] = [x for x in store.tables[t] if x.get("messageId") not in gone and x["_creationTime"] <= cut]
    print("pruned messages:", len(gone))


def main():
    out = os.path.join(os.path.dirname(os.path.abspath(__file__)), "out")
    shutil.rmtree(out, ignore_errors=True)
    chat.setup_people(); chat.setup_channels()
    chat.handwritten(); chat.introductions(); chat.banter(); chat.standups()
    chat.deployments(); chat.bugs(); chat.analytics(); chat.outreach_weekly(); chat.sprint_posts()
    dms = work.make_dms()
    sp, tasks = work.make_sprints_tasks()
    comments = work.make_comments(tasks)
    work.make_meetings()
    notes = work.make_notes()
    work.make_databases()
    work.make_audit(None)
    work.make_notifications(dms, tasks, comments, notes)
    work.make_saved_pins()
    prune()
    counts = store.write(out)
    print(json.dumps(counts, indent=1))


if __name__ == "__main__":
    main()
