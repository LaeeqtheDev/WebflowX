"use client"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { useMutation, useQuery } from "convex/react"
import { Loader, FileSpreadsheet, Table2, Trash2 } from "lucide-react"
import { toast } from "sonner"
import { api } from "../../../convex/_generated/api"
import { Id } from "../../../convex/_generated/dataModel"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { useWorkspaceId } from "@/hooks/use-workspace-id"
import { useLimitHandler, friendlyError } from "@/hooks/use-limit-handler"
import { cn } from "@/lib/utils"
import { DOC_TEMPLATES } from "@/app/dashboard/workspace/[workspaceId]/docs/components/templates"
import { DB_TEMPLATES } from "@/features/databases/templates"

type Tab = "pages" | "databases" | "saved"

const Card = ({ icon, title, body, busy, onClick, onDelete }: {
  icon: React.ReactNode; title: string; body?: string; busy?: boolean; onClick: () => void; onDelete?: () => void
}) => (
  <div className="group relative">
    <button
      type="button"
      onClick={onClick}
      disabled={busy}
      className="flex w-full items-start gap-3 rounded-xl border border-plum/12 bg-surface p-3 text-left transition-colors hover:border-[#ff5018]/50 hover:bg-[#ff5018]/5 disabled:opacity-60"
    >
      <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-[#ff5018]/10 text-lg">
        {busy ? <Loader className="size-4 animate-spin text-[#ff5018]" /> : icon}
      </span>
      <span className="min-w-0">
        <span className="block truncate text-sm font-semibold tracking-tight text-ink">{title}</span>
        {body && <span className="mt-0.5 block text-xs leading-snug text-ink/60">{body}</span>}
      </span>
    </button>
    {onDelete && (
      <button
        type="button"
        aria-label={`Delete template ${title}`}
        onClick={onDelete}
        className="absolute right-1.5 top-1.5 rounded-md p-1.5 text-ink/50 opacity-0 hover:bg-cream-deep hover:text-destructive focus-visible:opacity-100 group-hover:opacity-100 max-md:opacity-100"
      >
        <Trash2 className="size-3.5" />
      </button>
    )}
  </div>
)

// Where every new page, spreadsheet or database starts: pick a template and it is created straight away.
export const NewPageDialog = ({ open, onOpenChange, parentId }: { open: boolean; onOpenChange: (o: boolean) => void; parentId?: Id<"docs"> }) => {
  const workspaceId = useWorkspaceId()
  const router = useRouter()
  const { handleLimitError } = useLimitHandler()
  const createDoc = useMutation(api.docs.create)
  const createDb = useMutation(api.databases.create)
  const removeTemplate = useMutation(api.docs.removeTemplate)
  const saved = useQuery(api.docs.templates, open ? { workspaceId } : "skip")
  const [tab, setTab] = useState<Tab>("pages")
  const [busy, setBusy] = useState<string | null>(null)

  const go = (id: string, query = "") => {
    onOpenChange(false)
    router.push(`/dashboard/workspace/${workspaceId}/docs/${id}${query}`)
  }

  const run = async (key: string, fn: () => Promise<void>, fallback: string) => {
    setBusy(key)
    try { await fn() } catch (e) { if (handleLimitError(e, fallback)) onOpenChange(false) } finally { setBusy(null) }
  }

  const tabs: { id: Tab; label: string }[] = [
    { id: "pages", label: "Pages" },
    { id: "databases", label: "Databases" },
    { id: "saved", label: `Yours${saved?.length ? ` (${saved.length})` : ""}` },
  ]

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85dvh] max-w-2xl gap-0 overflow-hidden rounded-2xl border-plum/12 p-0">
        <DialogHeader className="border-b border-plum/12 px-5 pb-0 pt-5 text-left">
          <DialogTitle className="text-[17px] font-semibold tracking-tight">{parentId ? "New sub-page" : "New page"}</DialogTitle>
          <DialogDescription className="sr-only">Choose a template to start from</DialogDescription>
          <div className="mt-3 flex gap-1" role="tablist">
            {tabs.map((t) => (
              <button
                key={t.id}
                role="tab"
                aria-selected={tab === t.id}
                onClick={() => setTab(t.id)}
                className={cn("rounded-t-lg border-b-2 px-3 py-2 text-sm font-medium transition-colors",
                  tab === t.id ? "border-[#ff5018] text-ink" : "border-transparent text-ink/60 hover:text-ink")}
              >
                {t.label}
              </button>
            ))}
          </div>
        </DialogHeader>

        <div className="overflow-y-auto p-5" style={{ maxHeight: "calc(85dvh - 120px)" }}>
          {tab === "pages" && (
            <div className="grid gap-2.5 sm:grid-cols-2">
              {DOC_TEMPLATES.map((t) => (
                <Card key={t.id} icon={t.emoji} title={t.name} body={t.description} busy={busy === t.id}
                  onClick={() => run(t.id, async () => {
                    const id = await createDoc({ workspaceId, title: t.id === "blank" ? "Untitled" : t.name, type: "document", parentId, icon: t.id === "blank" ? undefined : t.emoji })
                    go(id, t.id !== "blank" ? `?t=${t.id}` : "")
                  }, "Couldn't create the page")} />
              ))}
              <Card icon={<FileSpreadsheet className="size-4 text-green-700" />} title="Spreadsheet" body="Cells and formulas, edited together" busy={busy === "sheet"}
                onClick={() => run("sheet", async () => {
                  const id = await createDoc({ workspaceId, title: "Untitled spreadsheet", type: "spreadsheet", parentId })
                  go(id)
                }, "Couldn't create the spreadsheet")} />
            </div>
          )}

          {tab === "databases" && (
            <div className="grid gap-2.5 sm:grid-cols-2">
              <Card icon={<Table2 className="size-4 text-[#ff5018]" />} title="Blank database" body="Start with a table and add your own properties" busy={busy === "blank-db"}
                onClick={() => run("blank-db", async () => {
                  const id = await createDb({ workspaceId, parentId, title: "Untitled database", icon: "🗃️" })
                  go(id)
                }, "Couldn't create the database")} />
              {DB_TEMPLATES().map((t) => (
                <Card key={t.id} icon={t.icon} title={t.name} body={t.description} busy={busy === t.id}
                  onClick={() => run(t.id, async () => {
                    const id = await createDb({ workspaceId, parentId, title: t.name, icon: t.icon, properties: t.properties, views: t.views, rows: t.rows })
                    go(id)
                  }, "Couldn't create the database")} />
              ))}
            </div>
          )}

          {tab === "saved" && (
            saved === undefined ? (
              <div className="flex justify-center py-10"><Loader className="size-5 animate-spin text-[#ff5018]" /></div>
            ) : saved.length === 0 ? (
              <p className="py-10 text-center text-sm text-ink/60">
                Nothing saved yet. Open any page and choose <b>Save as template</b> from its menu to reuse it here.
              </p>
            ) : (
              <div className="grid gap-2.5 sm:grid-cols-2">
                {saved.map((t) => (
                  <Card key={t._id} icon={t.icon ?? "📄"} title={t.name} body="Saved template" busy={busy === t._id}
                    onClick={() => run(t._id, async () => {
                      const id = await createDoc({ workspaceId, title: t.name, type: "document", parentId, icon: t.icon ?? undefined })
                      go(id, `?tpl=${t._id}`)
                    }, "Couldn't create the page")}
                    onDelete={async () => {
                      try { await removeTemplate({ id: t._id }); toast.success("Template deleted") } catch (e) { toast.error(friendlyError(e, "Couldn't delete the template")) }
                    }} />
                ))}
              </div>
            )
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
