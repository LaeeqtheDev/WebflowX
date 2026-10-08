"use client"

import { useState } from "react"
import { PanelLeft } from "lucide-react"
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { PageTree } from "@/features/pages/page-tree"
import { usePermissions } from "@/hooks/use-permissions"

// Pages live in a tree on the left; the page or database itself fills the rest.
export default function DocsLayout({ children }: { children: React.ReactNode }) {
  const [drawer, setDrawer] = useState(false)
  const perms = usePermissions()

  if (perms.isGuest) return <>{children}</>

  return (
    <div className="flex h-full min-h-0 bg-cream-soft">
      <aside className="hidden w-64 shrink-0 border-r border-plum/12 md:block">
        <PageTree />
      </aside>

      <div className="relative flex min-w-0 flex-1 flex-col">
        <div className="flex h-10 shrink-0 items-center border-b border-plum/12 bg-surface px-2 md:hidden">
          <Button variant="ghost" size="sm" className="h-8 gap-1.5 text-xs text-ink/70" onClick={() => setDrawer(true)}>
            <PanelLeft className="size-4" /> Pages
          </Button>
        </div>
        <div className="min-h-0 flex-1">{children}</div>
      </div>

      <Sheet open={drawer} onOpenChange={setDrawer}>
        <SheetContent side="left" className="w-72 p-0">
          <SheetTitle className="sr-only">Pages</SheetTitle>
          <SheetDescription className="sr-only">The page tree</SheetDescription>
          <PageTree onNavigate={() => setDrawer(false)} />
        </SheetContent>
      </Sheet>
    </div>
  )
}
