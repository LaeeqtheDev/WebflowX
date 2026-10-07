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
    className="p-1 rounded-lg hover:bg-white border border-transparent hover:border-[#381d2a]/12 flex items-center justify-start group/thread-bar transition max-w-150"
    >
        <div className="flex items-center gap-2 overflow-hidden">
        <Avatar className="rounded-md mr-1 size-6">
                    <AvatarImage className="rounded-md" src={image} />
                    <AvatarFallback className="rounded-md bg-[#381d2a] text-white text-center text-xs font-semibold">
                        {avatarFallBack}
                    </AvatarFallback>
                </Avatar>
                <span className="text-xs text-[#c2370d] hover:underline font-semibold truncate">
                    {count} {count > 1 ? "replies" : "reply"}
                </span>
                <span className="text-xs text-[#1b1017]/65 truncate group-hover/thread-bar:hidden block">
                       Last reply {formatDistanceToNow(timestamp, {addSuffix: true})}
                    </span>

                    <span className="text-xs text-[#1b1017]/60 truncate group-hover/thread-bar:block hidden">
                        View Thread
                    </span>
        </div>

        <ChevronRight className="text-[#1b1017]/40 size-4 ml-auto opacity-0 group-hover/thread-bar:opacity-100 transition shrink-0" />
    </button>
   )
}