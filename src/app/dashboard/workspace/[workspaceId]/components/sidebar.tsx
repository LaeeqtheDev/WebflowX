import { UserButton } from "@/features/auth/components/user-button"
import { WorkspaceSwitcher } from "./WorkspaceSwitcher"
import { SidebarButton } from "./SidebarButton"
import { Bell, Camera, CheckSquare, FileText, Home, MessageSquare, MoreHorizontal, Video } from "lucide-react"
import {  FaSpotify } from "react-icons/fa"

import { usePathname } from "next/navigation"
import { IconInvoice, IconPlayerTrackNextFilled } from "@tabler/icons-react"

export const Sidebar = () => {
    const pathname = usePathname()
    return(
        <>
        <aside className="w-17.5 h-full bg-[#381d2a] flex flex-col gap-y-4 items-center pt-2.25 pb-4">
           <WorkspaceSwitcher/>
           <SidebarButton icon={Home} label="Home" isActive={pathname.includes("/dashboard/workspace")}/>
           <SidebarButton icon={MessageSquare} label="DMs" />
            <SidebarButton icon={Bell} label="Activity" />

            <SidebarButton icon={Video} label="Meetings" />
            <SidebarButton icon={CheckSquare} label="Tasks" />
            <SidebarButton icon={FileText} label="Notes" />

            <SidebarButton icon={FaSpotify} label="Jam" />
            

<SidebarButton icon={MoreHorizontal} label="More" />
           <div className="flex flex-col items-center justify-center gap-y-1 mt-auto">
            
           <UserButton/>
           </div>
        </aside>
        </>
    )
}