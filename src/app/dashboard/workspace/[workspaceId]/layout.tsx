"use client"

import { useState } from "react"
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
import { Loader } from "lucide-react"
import { Id } from "../../../../../convex/_generated/dataModel"
import dynamic from "next/dynamic"
import { UsageWarning } from "./components/usage-warning"

const Thread = dynamic(() => import("./components/threads").then((m) => m.Thread), { ssr: false })
const Profile = dynamic(() => import("@/features/members/components/profile").then((m) => m.Profile), { ssr: false })

interface WorkspaceIdLayoutProps {
  children: React.ReactNode
}

const WorkspaceLayout = ({ children }: WorkspaceIdLayoutProps) => {
  const {profileMemberId,parentMessageId, onClose} = usePanel()
  const isMobile = useIsMobile()
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
    <div className="flex h-full items-center justify-center bg-white">
      <Loader className="size-5 animate-spin text-muted-foreground"/>
    </div>
  )

  if (isMobile) {
    return (
      <div className="h-dvh flex flex-col">
        {/* Topbar */}
        <Toolbar onOpenMenu={() => setDrawerPath(pathname)} />
        <UsageWarning />

        {/* Body: one pane at a time; the sidebar lives in a drawer */}
        <main className="flex-1 min-h-0 min-w-0 overflow-auto">
          {children}
        </main>

        <Sheet open={drawerOpen} onOpenChange={(open) => setDrawerPath(open ? pathname : null)}>
          <SheetContent side="left" closeLabel="Close navigation menu" className="bg-[#402633] text-white" closeClassName="bottom-3 right-3 top-auto bg-white/10 hover:bg-white/20">
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
          <div className="fixed inset-0 z-40 flex h-dvh flex-col bg-white">
            {panelContent}
          </div>
        )}
      </div>
    )
  }

  return(
  <div className="h-dvh flex flex-col">
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
            className="bg-[#402633] text-white overflow-auto border-r border-white/5"
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
export default WorkspaceLayout
