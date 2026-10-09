# North Foundry (Demo) seed

Fictional company data for the live demo workspace: 24 people (21 staff, 3 client guests), four months of history
(9 Jun to 9 Oct 2026), channels, threads, DMs, tasks and sprints, meetings with transcripts and AI summaries, notes,
two databases, audit log, notifications. Every person, client, figure and email (`@nf-demo.test`) is made up.

    python3 generate.py     # writes out/*.jsonl
    python3 validate.py     # reference, id and timestamp checks
    powershell -ExecutionPolicy Bypass -File scripts\demo-seed\import.ps1 [-Prod]

Imports with `--append`, so existing data (your account, the workspace, its old channels and docs) stays.
Page documents (Liveblocks) are not seeded and open empty; databases are seeded.
