"use client"

import { useCurrentUser } from "@/app/auth/api/user-current-user"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger} from "@/components/ui/dropdown-menu"
import { useAuthActions } from "@convex-dev/auth/react"
import { Loader, LogOut } from "lucide-react"

export const UserButton = () => {
    const {data, isLoading} = useCurrentUser();
    const {signOut} = useAuthActions();

    if(isLoading){
        return <Loader className="size-4 animate-spin text-muted-foreground"/>
    }

    if(!data) {
        return null;
    }

    const {image, name} = data;
    const avatarFallback =  name!.charAt(0).toUpperCase();

    return(

        <DropdownMenu modal={false}>
            <DropdownMenuTrigger className="outline-none relative">
                <Avatar className=" rounded-md size-10 hover:opacity-75 transition">
                    <AvatarImage className="rounded-md"src={image}  alt={name} />
                    <AvatarFallback className="rounded-md bg-[#ff5018] text-white">
                        {avatarFallback}
                    </AvatarFallback>
                </Avatar>
            </DropdownMenuTrigger>
            
            <DropdownMenuContent align="center" side="right" className="w-60">
                <DropdownMenuItem  onClick={()=> signOut()} className="h-10">
                    <LogOut className="size-4 mr-2" />
                    Logout
                </DropdownMenuItem>

            </DropdownMenuContent>

        </DropdownMenu>
    )
}