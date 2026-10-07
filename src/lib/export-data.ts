"use client"
import { useCallback, useState } from "react"
import { useConvex } from "convex/react"
import { api } from "../../convex/_generated/api"
import { Id } from "../../convex/_generated/dataModel"

const download = (name: string, data: unknown) => {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = name
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 10_000)
}

const stamp = () => new Date().toISOString().slice(0, 10)
const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "workspace"

const WORKSPACE_TABLES = ["members", "channels", "messages", "tasks", "notes", "sprints", "meetings", "docs", "audit"] as const
const MINE_TABLES = ["messages", "notes", "tasks"] as const

// Pulls every page of every table and saves one JSON file. Pages are fetched one after another
// so even a large workspace never needs a single huge query.
export const useDataExport = () => {
  const convex = useConvex()
  const [busy, setBusy] = useState(false)
  const [progress, setProgress] = useState("")

  const exportWorkspace = useCallback(async (workspaceId: Id<"workspaces">, name: string) => {
    setBusy(true)
    try {
      const out: Record<string, unknown> = {
        exportedAt: new Date().toISOString(),
        workspace: { id: workspaceId, name },
        notes: "Direct messages, locked channels you can't open and personal notes are not included. Document bodies live in the editor and are not part of this file.",
      }
      for (const table of WORKSPACE_TABLES) {
        setProgress(`Exporting ${table}…`)
        const rows: unknown[] = []
        let cursor: string | null = null
        for (;;) {
          const page: { rows: unknown[]; isDone: boolean; cursor: string } = await convex.query(api.exports.workspacePage, { workspaceId, table, cursor })
          rows.push(...page.rows)
          if (page.isDone) break
          cursor = page.cursor
        }
        out[table] = rows
      }
      download(`${slug(name)}-export-${stamp()}.json`, out)
    } finally {
      setBusy(false)
      setProgress("")
    }
  }, [convex])

  const exportMine = useCallback(async () => {
    setBusy(true)
    try {
      setProgress("Collecting your profile…")
      const me = await convex.query(api.exports.me, {})
      if (!me) throw new Error("Please sign in again")
      const workspaces: unknown[] = []
      for (const ws of me.workspaces) {
        const entry: Record<string, unknown> = { ...ws }
        for (const table of MINE_TABLES) {
          setProgress(`Exporting your ${table} in ${ws.workspaceName}…`)
          const rows: unknown[] = []
          let cursor: string | null = null
          for (;;) {
            const page: { rows: unknown[]; isDone: boolean; cursor: string } = await convex.query(api.exports.minePage, { workspaceId: ws.workspaceId, table, cursor })
            rows.push(...page.rows)
            if (page.isDone) break
            cursor = page.cursor
          }
          entry[table] = rows
        }
        workspaces.push(entry)
      }
      download(`my-webflowx-data-${stamp()}.json`, { exportedAt: new Date().toISOString(), profile: me.profile, workspaces })
    } finally {
      setBusy(false)
      setProgress("")
    }
  }, [convex])

  return { exportWorkspace, exportMine, busy, progress }
}
