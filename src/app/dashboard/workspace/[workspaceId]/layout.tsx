"use client"

import { Suspense, useEffect, useState } from "react"
import { usePathname } from "next/navigation"
import { Sidebar } from "./components/sidebar"
import { Toolbar } from "./components/toolbar"

import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable"
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet"
import { WorkSpaceSidebar } from "./components/WorkspaceSidebar"
import { usePanel } from "@/hooks/use-panel"
import { useIsMobile } from "@/hooks/use-is-mobile"
import { ChevronLeft, Loader } from "lucide-react"
import { useVisibleHeight } from "@/hooks/use-visible-height"
import { Id } from "../../../../../convex/_generated/dataModel"
import dynamic from "next/dynamic"
import { UsageWarning } from "./components/usage-warning"
import { QuickSwitcher } from "./components/quick-switcher"
import { BillingReturn } from "./components/billing-return"
import { PresenceProvider } from "@/features/presence/presence"
import { useWorkspaceId } from "@/hooks/use-workspace-id"
import { useGetWorkspace } from "@/features/workspaces/api/use-get-workspace"
import { RequireTwoFactor } from "@/features/security/two-factor-gate"
import { preloadWorkspaceChunks } from "@/lib/preload"

const Thread = dynamic(() => import("./components/threads").then((m) => m.Thread), { ssr: false })
const Profile = dynamic(() => import("@/features/members/components/profile").then((m) => m.Profile), { ssr: false })

interface WorkspaceIdLayoutProps {
  children: React.ReactNode
}

const WorkspaceShell = ({ children }: WorkspaceIdLayoutProps) => {
  const {profileMemberId,parentMessageId, onClose} = usePanel()
  const isMobile = useIsMobile()
  const visibleHeight = useVisibleHeight()
  const pathname = usePathname()
  // The drawer remembers the route it was opened on, so navigating anywhere closes it without an effect.
  const [drawerPath, setDrawerPath] = useState<string | null>(null)
  const drawerOpen = drawerPath === pathname

  const showPanel = !!parentMessageId || !!profileMemberId

  const panelContent = parentMessageId ? (
    <Thread
      messageId= {parentMessageId as Id<"messages">}
      onClose={onClose}
    />
  ) : profileMemberId ? (
    <Profile
      memberId={profileMemberId as Id<"members">}
      onClose={onClose}
    />
  ) : (
    <div className="flex h-full items-center justify-center bg-surface">
      <Loader className="size-5 animate-spin text-muted-foreground"/>
    </div>
  )

  if (isMobile) {
    return (
      <div className="h-dvh flex flex-col" style={visibleHeight ? { height: visibleHeight } : undefined}>
        <QuickSwitcher />
        {/* Topbar */}
        <Toolbar onOpenMenu={() => setDrawerPath(pathname)} />
        <UsageWarning />

        {/* Body: one pane at a time; the sidebar lives in a drawer */}
        <main className="flex-1 min-h-0 min-w-0 overflow-auto">
          {children}
        </main>

        <Sheet open={drawerOpen} onOpenChange={(open) => setDrawerPath(open ? pathname : null)}>
          <SheetContent side="left" closeLabel="Close navigation menu" className="bg-[#402633] dark:bg-[#2a1722] text-white" closeIcon={<ChevronLeft className="size-5" />} closeClassName="-right-6 top-1/2 h-16 w-6 -translate-y-1/2 rounded-l-none rounded-r-xl bg-[#402633] dark:bg-[#2a1722] text-white/80 opacity-100 shadow-lg hover:text-white">
            <SheetTitle className="sr-only">Workspace navigation</SheetTitle>
            <SheetDescription className="sr-only">Switch sections, channels and direct messages.</SheetDescription>
            {/* Tapping a link to the page you are already on does not change the route, so close explicitly */}
            <div
              className="flex h-full min-h-0"
              onClick={(e) => { if ((e.target as HTMLElement).closest("a")) setDrawerPath(null) }}
            >
              <Sidebar />
              <div className="min-w-0 flex-1 overflow-y-auto">
                <WorkSpaceSidebar />
              </div>
            </div>
          </SheetContent>
        </Sheet>

        {/* Thread / profile take over the whole screen */}
        {showPanel && (
          <div className="fixed inset-x-0 top-0 z-40 flex h-dvh flex-col bg-surface" style={visibleHeight ? { height: visibleHeight } : undefined}>
            {panelContent}
          </div>
        )}
      </div>
    )
  }

  return(
  <div className="h-dvh flex flex-col">
    <QuickSwitcher />
    {/* Topbar */}
    <Toolbar />
    <UsageWarning />

    {/* Body */}
    <div className="flex flex-1 w-full overflow-hidden">
      <Sidebar />
      <main className="flex-1 flex overflow-hidden">
        <ResizablePanelGroup autoSave="ca-workspace-layout" dir="horizontal">
          <ResizablePanel
            defaultSize={220}  // percentage of total width
            minSize={220}      // min width percentage
            className="bg-[#402633] dark:bg-[#2a1722] text-white overflow-y-auto overflow-x-hidden border-r border-white/5"
          >
            <WorkSpaceSidebar />
          </ResizablePanel>

          <ResizableHandle />

          <ResizablePanel
            minSize={100} // percentage of total width
            className="overflow-auto"
          >
            
            {children}
          </ResizablePanel>
          {showPanel && (
            <>
            <ResizableHandle withHandle />
            <ResizablePanel minSize={390} defaultSize={390}>
             {panelContent}
            </ResizablePanel>

            </>
          )}
        </ResizablePanelGroup>
      </main>
    </div>
  </div>
  )
}
const WorkspaceLayout = ({ children }: WorkspaceIdLayoutProps) => {
  const workspaceId = useWorkspaceId()
  const { data: workspace } = useGetWorkspace({ id: workspaceId })
  useEffect(() => { preloadWorkspaceChunks() }, [])
  const shell = (
    <PresenceProvider workspaceId={workspaceId}>
      <Suspense fallback={null}><BillingReturn /></Suspense>
      <WorkspaceShell>{children}</WorkspaceShell>
    </PresenceProvider>
  )
  // owners and admins can require everyone to use two-step verification (Business plan and up)
  return workspace?.require2fa ? <RequireTwoFactor workspaceName={workspace.name}>{shell}</RequireTwoFactor> : shell
}
export default WorkspaceLayout
