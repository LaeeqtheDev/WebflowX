import React from "react";
import { Heading, Label, Reveal } from "./ui";
import { wrap } from "./tokens";

// Plain typographic list on purpose: no cards, just hairlines between rows.
const rows: { t: string; b: string }[] = [
  { t: "Pages inside pages", b: "Nest pages up to eight levels deep, drag them to rearrange, give each an icon and star the ones you open every day. Deleted pages wait in the trash for 30 days, and Undo is one click away." },
  { t: "Templates", b: "Start from meeting notes, a product spec, a retro, a 1:1, an onboarding plan or a wiki home. Save any page as a template for your workspace. Databases start from ready-made tasks, CRM, content, bug, reading and project setups." },
  { t: "Five ways to see the same data", b: "Show a database as a table, a board, a list, a gallery or a calendar. Each view keeps its own filters, sorting, grouping and visible properties, so one database can be a task board for you and a timeline for a client." },
  { t: "Seventeen property types", b: "Text, number, select, multi-select, status, date, person, checkbox, URL, email, phone, relation, rollup, formula, created time, last edited and created by. Change a type later and existing values are converted where they can be." },
  { t: "Relations and rollups", b: "Link rows across databases, then roll the linked rows up into a total, an average, a count, a percentage or the earliest date. Rollups follow relations up to three databases deep." },
  { t: "Formulas", b: "Calculate with text, math, date and list functions, if and ifs, and any other property. Formulas are checked as you write them, and a mistake shows a plain message instead of breaking the table." },
  { t: "A table that works like a spreadsheet", b: "Edit cells in place, resize and reorder columns, drag rows into a new order and see sums, averages, counts and percentages in the footer of any column." },
  { t: "Every row is a page", b: "Open a row to fill in its properties and write notes underneath, together with your team in real time." },
  { t: "CSV in, CSV out", b: "Import a spreadsheet and WebflowX matches the columns to your properties, or creates new ones with the right type. Export the current view whenever you need it elsewhere." },
];

export default function PagesDatabases() {
  return (
    <section id="databases" className="w-full bg-white py-24 md:py-32">
      <div className={wrap}>
        <div className="grid gap-12 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-20">
          <Reveal className="lg:sticky lg:top-28 lg:self-start">
            <Label>Pages and databases</Label>
            <Heading className="mt-5">Write it down, then organise it.</Heading>
            <p className="mt-5 max-w-md text-[17px] leading-relaxed text-[#1b1017]/70">
              Notes, plans and structured data live side by side in one page tree. Start with a document and add a database when the list gets long.
            </p>
          </Reveal>
          <dl className="border-t border-[#381d2a]/15">
            {rows.map((r, i) => (
              <Reveal key={r.t} delay={Math.min(i, 3) * 40}>
                <div className="grid gap-2 border-b border-[#381d2a]/15 py-6 sm:grid-cols-[13rem_minmax(0,1fr)] sm:gap-8">
                  <dt className="text-[17px] font-semibold tracking-tight text-[#1b1017]">{r.t}</dt>
                  <dd className="text-[15px] leading-relaxed text-[#1b1017]/70">{r.b}</dd>
                </div>
              </Reveal>
            ))}
          </dl>
        </div>
      </div>
    </section>
  );
}
