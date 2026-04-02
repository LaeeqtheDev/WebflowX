"use client"
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { FaChevronDown } from "react-icons/fa";


interface HeaderProps {
   memberName?: string;
   memberImage?: string;
   onClick?: () => void;

}

export const Header = ({
    memberName ="Member",
    memberImage,
    onClick,

}: HeaderProps) => {


    const avatarFallBack =memberName.charAt(0).toUpperCase() || "M"
    return(
        <div className="bg-white border-b h-12.25 flex items-center px-4 overflow-hidden">
            <Button
            variant={"ghost"}
            className="text-lg font-semibold px-2 overflow-hidden w-auto"
            size={"sm"}
            onClick={onClick}
            >

            <Avatar className="size-6 mr-2">
                <AvatarImage src={memberImage}/>
                <AvatarFallback>
                    {avatarFallBack}
                </AvatarFallback>
            </Avatar>
            <span className="truncate">
                {memberName}
            </span>
            <FaChevronDown className="size-2.5 ml-2 text-[#ff5018]"/>
            </Button>
           
        </div>
    )
}