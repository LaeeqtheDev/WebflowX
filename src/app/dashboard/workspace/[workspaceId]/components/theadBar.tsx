import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { format, formatDistance, formatDistanceToNow, isToday, isYesterday } from "date-fns"
import { ChevronRight } from "lucide-react";

interface ThreadBarProps {
    count?: number,
    image?: string,
    timestamp?: number,
    name?: string,
    onClick?: () => void
}


export const ThreadBar = ({count, image, timestamp, onClick,name="Member"}: ThreadBarProps) => {
    const avatarFallBack = name.charAt(0).toUpperCase()

   if (!count || !timestamp) return null;

   
   return(
    <button onClick={onClick}
    className="p-1 rounded-md hover:bg-white border border-transparent hover:border-border flex items-center justify-start group/thread-bar transition max-w-150"
    >
        <div className="flex items-center gap-2 overflow-hidden">
        <Avatar className="rounded-md mr-1">
                    <AvatarImage className="rounded-md" src={image} />
                    <AvatarFallback className="rounded-md bg-[#ff5018] text-white text-center text-xs">
                        {avatarFallBack}
                    </AvatarFallback>
                </Avatar>
                <span className="text-xs text-[#ff5018] hover:underline font-bold truncate">
                    {count} {count > 1 ? "replies" : "reply"}
                </span>
                <span className="text-xs text-[#ff5018] truncate group-hover/thread-bar:hidden block">
                       Last reply {formatDistanceToNow(timestamp, {addSuffix: true})}
                    </span>

                    <span className="text-xs text-[#ff5018] truncate group-hover/thread-bar:block hidden">
                        View Thread
                    </span>
        </div>

        <ChevronRight className="text-[#ff5018] size-4 ml-auto opacity-0 group-hover/thread-bar:opacity-100 transition shrink-0" />
    </button>
   )
}