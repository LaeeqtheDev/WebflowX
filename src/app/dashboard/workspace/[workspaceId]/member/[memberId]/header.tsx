"use client"
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { FaChevronDown } from "react-icons/fa";
import { PinnedMessages } from "@/features/marks/pinned-messages";
import type { Id } from "../../../../../../../convex/_generated/dataModel";


interface HeaderProps {
   memberName?: string;
   memberImage?: string;
   onClick?: () => void;
   conversationId?: Id<"conversations">;
   otherMemberId?: string;

}

export const Header = ({
    memberName ="Member",
    memberImage,
    onClick,
    conversationId,
    otherMemberId,
}: HeaderProps) => {


    const avatarFallBack =memberName.charAt(0).toUpperCase() || "M"
    return(
        <div className="bg-surface border-b h-12.25 flex items-center px-4 overflow-hidden">
            <Button
            variant={"ghost"}
            className="text-lg font-semibold px-2 overflow-hidden w-auto max-md:h-10"
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
            {conversationId && <PinnedMessages conversationId={conversationId} memberId={otherMemberId} />}
        </div>
    )
}