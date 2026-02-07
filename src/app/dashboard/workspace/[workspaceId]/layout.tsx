"use client"

import { Sidebar } from "./components/sidebar"
import { Toolbar } from "./components/toolbar"

interface WorkspaceIdLayoutProps {
  children: React.ReactNode
}

const WorkspaceLayout = ({ children }: WorkspaceIdLayoutProps) => (
  <div className="h-screen flex flex-col">
    {/* Topbar */}
    <Toolbar />

    {/* Body */}
    <div className="flex flex-1 overflow-hidden">
      <Sidebar />
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>
    </div>
  </div>
)

export default WorkspaceLayout
