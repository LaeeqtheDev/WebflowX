import React from "react";
import {
  Download,
  Gauge,
  KeyRound,
  Link2,
  Lock,
  Megaphone,
  ScrollText,
  ShieldCheck,
  UserCog,
} from "lucide-react";
import { Heading, Label, Reveal } from "./ui";
import { wrap } from "./tokens";

const roles = ["Owner", "Admin", "Moderator", "Member", "Custom roles"];

const permissions = [
  "Create channels",
  "Manage channels",
  "View locked channels",
  "Delete messages",
  "Manage members",
  "Invite people",
  "Edit workspace",
  "Moderate meetings",
  "Manage content",
  "Post in read-only channels",
  "Mention everyone",
  "Upload files",
  "Start meetings",
  "Create docs",
];

const cards = [
  {
    icon: Lock,
    t: "Private and read-only channels",
    b: "Lock a channel to the members you choose, or make it read-only for announcements.",
  },
  {
    icon: ShieldCheck,
    t: "Enforced on the server",
    b: "Permissions are checked on the server, not just hidden in the interface.",
  },
  {
    icon: ScrollText,
    t: "Audit log",
    b: "Role, channel, invite, member and ownership changes are recorded for owners and admins.",
  },
  {
    icon: Link2,
    t: "Invite links you control",
    b: "Invite links can expire, and you can switch them off at any time. Owners can transfer ownership.",
  },
  {
    icon: Gauge,
    t: "Guardrails against abuse",
    b: "Rate limits and size limits protect against spam. Uploads are checked against an allowed-type list and size caps, and each workspace has a storage cap. The site sends strict security headers.",
  },
  {
    icon: KeyRound,
    t: "Verified accounts",
    b: "New accounts confirm their email with an 8-digit code that expires in 15 minutes. Passwords can be reset by emailed code, and you can sign in with Google or GitHub.",
  },
  {
    icon: Download,
    t: "Your data, exportable",
    b: "Anyone can download their own data. Owners and admins can export the workspace; direct messages and personal notes are left out. Our Terms and Privacy Policy are public.",
  },
];

export default function SecuritySection() {
  return (
    <section id="security" className="w-full bg-[#efe8e3] py-24 md:py-32">
      <div className={wrap}>
        <Reveal>
          <Label>Security and control</Label>
          <Heading className="mt-5 max-w-3xl">You decide who can see and do what.</Heading>
          <p className="mt-5 max-w-xl text-[17px] leading-relaxed text-[#1b1017]/70">
            Roles, private channels and an audit trail, with permissions enforced by the server and sensible
            limits to keep spam and abuse out.
          </p>
        </Reveal>

        <div className="mt-14 grid gap-4 lg:grid-cols-3">
          <Reveal className="lg:col-span-3">
            <div className="rounded-3xl bg-[#381d2a] p-7 text-white sm:p-9">
              <div className="grid gap-8 lg:grid-cols-5">
                <div className="lg:col-span-2">
                  <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#2a1420] text-[#ff5018]">
                    <UserCog className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <h3 className="lp-h mt-6 text-2xl sm:text-3xl">Roles and 14 granular permissions</h3>
                  <p className="mt-3 max-w-sm text-[15px] leading-relaxed text-white/70">
                    Start with the built-in roles, or build custom roles from the permissions you need. Give a
                    role exactly the access it should have, and nothing more.
                  </p>
                  <ul className="mt-5 flex flex-wrap gap-2" aria-label="Roles">
                    {roles.map((r) => (
                      <li key={r} className="rounded-full bg-[#ff5018] px-3 py-1 text-xs font-semibold text-white">
                        {r}
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="lg:col-span-3">
                  <p className="lp-label text-white/60">Permissions</p>
                  <ul className="mt-4 flex flex-wrap gap-2">
                    {permissions.map((p) => (
                      <li
                        key={p}
                        className="rounded-md border border-white/15 bg-white/5 px-3 py-1.5 text-[13px] text-white/85"
                      >
                        {p}
                      </li>
                    ))}
                  </ul>
                  <p className="mt-5 flex items-start gap-2 text-sm text-white/65">
                    <Megaphone className="mt-0.5 h-4 w-4 shrink-0 text-[#ff5018]" aria-hidden="true" />
                    <span>@everyone and @channel only work for people who hold the permission.</span>
                  </p>
                </div>
              </div>
            </div>
          </Reveal>

          {cards.map(({ icon: Icon, t, b }, i) => (
            <Reveal key={t} delay={(i % 3) * 80} className={i === cards.length - 1 ? "lg:col-span-3" : ""}>
              <div className="h-full rounded-3xl border border-[#381d2a]/10 bg-white p-7">
                <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#381d2a] text-[#ff5018]">
                  <Icon className="h-5 w-5" aria-hidden="true" />
                </span>
                <h3 className="mt-6 text-lg font-semibold tracking-tight text-[#1b1017]">{t}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-[#1b1017]/70">{b}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
