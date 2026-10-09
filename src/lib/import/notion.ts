import { unzipSync, strFromU8 } from "fflate"

export type NotionPage = { title: string; body: string }

// Notion appends a 32-character id to every exported file name: "Roadmap 1a2b3c....md"
const stripId = (s: string) => s.replace(/\s+[0-9a-f]{32}$/i, "").trim()

/** Reads a Notion "Markdown & CSV" export (.zip) into plain pages. Databases (CSV) and images are not imported. */
export function parseNotionExport(zip: Uint8Array): NotionPage[] {
  let files = unzipSync(zip, { filter: (f) => f.name.toLowerCase().endsWith(".md") && f.originalSize < 5_000_000 })
  // Notion sometimes wraps the export in a second zip
  if (Object.keys(files).length === 0) {
    const inner = unzipSync(zip, { filter: (f) => f.name.toLowerCase().endsWith(".zip") })
    const first = Object.values(inner)[0]
    if (first) files = unzipSync(first, { filter: (f) => f.name.toLowerCase().endsWith(".md") && f.originalSize < 5_000_000 })
  }
  const pages: NotionPage[] = []
  for (const [path, data] of Object.entries(files)) {
    const raw = strFromU8(data).replace(/^﻿/, "")
    const file = stripId((path.split("/").pop() ?? "").replace(/\.md$/i, ""))
    const lines = raw.split(/\r?\n/)
    let title = file
    if (lines[0]?.startsWith("# ")) {
      title = lines[0].slice(2).trim() || file
      lines.shift()
    }
    const body = lines.join("\n").trim()
    if (!title && !body) continue
    pages.push({ title: (title || "Untitled").slice(0, 120), body: body.slice(0, 45_000) })
  }
  return pages
}
