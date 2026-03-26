"use client"

import { Sidebar } from "./components/sidebar"
import { Toolbar } from "./components/toolbar"

import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable"
import { WorkSpaceSidebar } from "./components/WorkspaceSidebar"
import { usePanel } from "@/hooks/use-panel"
import { Loader } from "lucide-react"
import { Id } from "../../../../../convex/_generated/dataModel"
import { Thread } from "./components/threads"

interface WorkspaceIdLayoutProps {
  children: React.ReactNode
}

const WorkspaceLayout = ({ children }: WorkspaceIdLayoutProps) => {
  const {parentMessageId, onClose} = usePanel()

  const showPanel = !!parentMessageId
  return(
  <div className="h-screen flex flex-col">
    {/* Topbar */}
    <Toolbar />

    {/* Body */}
    <div className="flex flex-1 w-full overflow-hidden">
      <Sidebar />
      <main className="flex-1 flex overflow-hidden">
        <ResizablePanelGroup autoSave="ca-workspace-layout" dir="horizontal">
          <ResizablePanel
            defaultSize={280}  // percentage of total width
            minSize={280}      // min width percentage
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
          {showPanel && (
            <>
            <ResizableHandle withHandle />
            <ResizablePanel minSize={280} defaultSize={280}>
             {parentMessageId ? (
             <Thread
             messageId= {parentMessageId as Id<"messages">}
             onClose={onClose}
             />
             ):(
               <div className="flex h-ful items-center justify-center">
                <Loader className="size-5 animate-spin text-muted-foreground"/>
              </div>
             )}
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