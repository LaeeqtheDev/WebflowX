"use client"

import { Sidebar } from "./components/sidebar"
import { Toolbar } from "./components/toolbar"

import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable"
import { WorkSpaceSidebar } from "./components/WorkspaceSidebar"

interface WorkspaceIdLayoutProps {
  children: React.ReactNode
}

const WorkspaceLayout = ({ children }: WorkspaceIdLayoutProps) => (
  <div className="h-screen flex flex-col">
    {/* Topbar */}
    <Toolbar />

    {/* Body */}
    <div className="flex flex-1 w-full overflow-hidden">
      <Sidebar />
      <main className="flex-1 flex overflow-hidden">
        <ResizablePanelGroup autoSave="ca-workspace-layout" dir="horizontal">
          <ResizablePanel
            defaultSize={250}  // percentage of total width
            minSize={250}      // min width percentage
            className="bg-[#381d2a]/80 text-white overflow-auto"
          >
            <WorkSpaceSidebar />
          </ResizablePanel>

          <ResizableHandle />

          <ResizablePanel
            minSize={200} // percentage of total width
            className="overflow-auto"
          >
            {children}
          </ResizablePanel>
        </ResizablePanelGroup>
      </main>
    </div>
  </div>
)
export default WorkspaceLayout