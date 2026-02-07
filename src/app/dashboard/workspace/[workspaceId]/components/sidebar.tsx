import { UserButton } from "@/features/auth/components/user-button"
import { WorkspaceSwitcher } from "./WorkspaceSwitcher"
import { SidebarButton } from "./SidebarButton"
import { Bell, Camera, Home, MessageSquare, MoreHorizontal, Video } from "lucide-react"
import {  FaSpotify } from "react-icons/fa"



export const Sidebar = () => {
    return(
        <>
        <aside className="w-17.5 h-full bg-[#381d2a] flex flex-col gap-y-4 items-center pt-2.25 pb-4">
           <WorkspaceSwitcher/>
           <SidebarButton icon={Home} label="Home" isActive/>
           <SidebarButton icon={MessageSquare} label="DMs" />
           <SidebarButton icon={Bell} label="Activity" />
           <SidebarButton icon={FaSpotify} label="Jam" />
           <SidebarButton icon={Video} label="Meeting" />
           <SidebarButton icon={MoreHorizontal} label="More" />

           <div className="flex flex-col items-center justify-center gap-y-1 mt-auto">
            <UserButton/>
           </div>
        </aside>
        </>
    )
}