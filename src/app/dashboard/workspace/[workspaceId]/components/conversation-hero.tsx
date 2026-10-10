import {format} from "date-fns"
import {Avatar, AvatarFallback, AvatarImage} from "@/components/ui/avatar";

interface ConversationHeroProps {
    name?: string;
    image?: string;
}

export const ConversationHero = ({name="Member", image}: ConversationHeroProps) => {
    const avatarFallBack = name.charAt(0).toUpperCase()
    return (
       
        <div className="mt-22 mx-5 mb-6">
            <div className="flex items-center gap-x-1 mb-2">
                <Avatar className="size-16 mr-3 rounded-xl">
                    <AvatarImage className="rounded-xl" src={image}/>
                    <AvatarFallback className="rounded-xl bg-avatar text-white text-2xl font-semibold">
                        {avatarFallBack}
                    </AvatarFallback>
                </Avatar>
                <p className="text-3xl font-semibold tracking-tight text-ink">
                {name}
            </p>

            </div>
          
            <p className="font-normal text-ink/60 leading-relaxed mb-4">
                This conversation is just between you and <strong className="font-semibold text-ink">
                    {name}
                </strong>

            </p>
        </div>
    )
}