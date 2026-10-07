"use client"

import { useCurrentUser } from "@/app/auth/api/user-current-user"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger} from "@/components/ui/dropdown-menu"
import { useAuthActions } from "@convex-dev/auth/react"
import { Loader, LogOut, UserPen } from "lucide-react"
import { useState } from "react"
import { EditProfileModal } from "./edit-profile-modal"

export const UserButton = () => {
    const {data, isLoading} = useCurrentUser();
    const {signOut} = useAuthActions();
    const [editOpen, setEditOpen] = useState(false)

    if(isLoading){
        return <Loader className="size-4 animate-spin text-white/60"/>
    }

    if(!data) {
        return null;
    }

    const {image, name} = data;
    const avatarFallback =  name!.charAt(0).toUpperCase();

    return(
        <>
        <EditProfileModal open={editOpen} setOpen={setEditOpen} user={data} />
        <DropdownMenu modal={false}>
            <DropdownMenuTrigger className="outline-none relative">
                <Avatar className=" rounded-lg size-10 hover:opacity-80 transition ring-1 ring-white/15">
                    <AvatarImage className="rounded-lg" src={image}  alt={name} />
                    <AvatarFallback className="rounded-lg bg-[#ff5018] text-white font-semibold">
                        {avatarFallback}
                    </AvatarFallback>
                </Avatar>
            </DropdownMenuTrigger>
            
            <DropdownMenuContent align="center" side="right" className="w-60 rounded-xl p-1.5">
                <div className="px-2 py-2 mb-1">
                    <p className="text-sm font-semibold text-[#1b1017] truncate">{name}</p>
                    {data.title && <p className="text-xs text-[#1b1017]/55 truncate">{data.title}</p>}
                </div>
                <DropdownMenuItem onClick={() => setEditOpen(true)} className="h-10 rounded-lg cursor-pointer">
                    <UserPen className="size-4 mr-2" />
                    Edit profile
                </DropdownMenuItem>
                <DropdownMenuItem  onClick={()=> signOut()} className="h-10 rounded-lg cursor-pointer">
                    <LogOut className="size-4 mr-2" />
                    Logout
                </DropdownMenuItem>

            </DropdownMenuContent>

        </DropdownMenu>
        </>
    )
}