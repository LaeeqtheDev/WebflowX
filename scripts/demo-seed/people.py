"""The fictional North Foundry (Demo) team: 21 staff and 3 client guests, plus the real owner."""
from lib import d

# key: (display name, job title, role, region, join date, short bio)
PEOPLE = {
    "zainab": ("Zainab Malik", "Operations Lead", "admin", "pk", "2026-06-03", "Keeps projects, hiring and invoices moving."),
    "daniyal": ("Daniyal Chaudhry", "Engineering Lead", "moderator", "pk", "2026-06-03", "Architecture, code review and releases."),
    "maya": ("Maya Hendricks", "Client Success Lead", "moderator", "us", "2026-06-04", "First call for every client question."),
    "hamza": ("Hamza Rauf", "Frontend Engineer", "member", "pk", "2026-06-05", "React, Next.js and performance."),
    "sana": ("Sana Iqbal", "Frontend Engineer", "member", "pk", "2026-06-05", "Design systems and accessibility."),
    "ethan": ("Ethan Brooks", "Frontend Engineer", "member", "us", "2026-06-08", "Dashboards and data visualisation."),
    "bilal": ("Bilal Qureshi", "Backend Engineer", "member", "pk", "2026-06-05", "APIs, queues and databases."),
    "omar": ("Omar Farooq", "Backend Engineer", "member", "pk", "2026-06-08", "Integrations and billing."),
    "priya": ("Priya Nair", "Backend Engineer", "member", "pk", "2026-06-10", "Search, caching and data models."),
    "noor": ("Noor Fatima", "AI Engineer", "member", "pk", "2026-06-10", "Chatbots, intake flows and evaluation."),
    "lucas": ("Lucas Meyer", "ML Engineer", "member", "eu", "2026-06-12", "Retrieval, evals and cost control."),
    "areeba": ("Areeba Khan", "Product Designer", "member", "pk", "2026-06-04", "Interfaces, prototypes and brand."),
    "tomas": ("Tomas Alvarez", "Designer", "member", "eu", "2026-06-12", "Motion, illustration and landing pages."),
    "hira": ("Hira Shahid", "QA Engineer", "member", "pk", "2026-06-08", "Test plans and release checks."),
    "marcus": ("Marcus Webb", "QA Engineer", "member", "us", "2026-06-17", "Automation and regression suites."),
    "usman": ("Usman Tariq", "DevOps Engineer", "member", "pk", "2026-06-09", "CI, hosting and monitoring."),
    "elena": ("Elena Petrova", "Project Manager", "member", "eu", "2026-06-08", "Plans, scope and client updates."),
    "rania": ("Rania Haider", "Growth Lead", "member", "pk", "2026-06-16", "Outreach strategy and pipeline."),
    "jordan": ("Jordan Pierce", "Outreach Specialist", "member", "us", "2026-06-16", "Cold email and follow-ups."),
    "sofia": ("Sofia Marin", "Account Executive", "member", "us", "2026-06-16", "Discovery calls and proposals."),
    "kamran": ("Kamran Ali", "SEO and Content Lead", "member", "pk", "2026-06-18", "Search, content and reporting."),
    # client guests: they can only open the channels they are added to
    "rebecca": ("Rebecca Stone", "Practice Manager, Brightpath Dental", "guest", "us", "2026-06-11", "Client contact for the Brightpath site."),
    "aaron": ("Aaron Whitfield", "Operations Director, Harborline Logistics", "guest", "us", "2026-06-29", "Client contact for the Harborline portal."),
    "nadia": ("Nadia El-Sayed", "Founder, Tidewell Coffee Co.", "guest", "us", "2026-06-19", "Client contact for the Tidewell app."),
}

STAFF = [k for k, v in PEOPLE.items() if v[2] != "guest"]
GUESTS = [k for k, v in PEOPLE.items() if v[2] == "guest"]
ENG = ["daniyal", "hamza", "sana", "ethan", "bilal", "omar", "priya", "noor", "lucas", "usman"]
QA = ["hira", "marcus"]
DESIGN = ["areeba", "tomas"]
GROWTH = ["rania", "jordan", "sofia", "kamran"]

# working hours (UTC) by region
HOURS = {"pk": (5.0, 13.5), "eu": (7.0, 15.5), "us": (14.0, 22.0)}
