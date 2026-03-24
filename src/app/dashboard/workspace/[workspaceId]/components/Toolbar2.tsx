import { Button } from "@/components/ui/button";
import { MessageSquareTextIcon, Pencil, Smile, TrashIcon } from "lucide-react";
import { Hint } from "./hints";
import { EmojiPopover } from "./emoji-popover";

interface ToolbarProps{
    isAuthor: boolean;
    isPending: boolean;
    handleEdit: () => void;
    handleThread: () => void;
    handleDelete: () => void;
    handleReaction: (value: string) => void;
    hideThreadButton?: Boolean
}


export const Toolbar2 =({
    isAuthor,
    isPending,
    handleDelete,
    handleEdit,
    handleReaction,
    hideThreadButton,
    handleThread
}: ToolbarProps) =>{
    return(
        <div className="absolute top-0 right-5">
          <div className="group-hover:opacity-100 opacity-0 transition-opacity border bg-white rounded-md shadow-sm">
        <EmojiPopover
        hint="Add Reaction"
        onEmojiSelect={(emoji)=> handleReaction(emoji.native)} 
        >
        <Button variant={"ghost"} size={"iconSm"} disabled={isPending}>
                <Smile className="size-4 text-[#ff5018]"/>
            </Button>
        </EmojiPopover>

        {!hideThreadButton && (
                        <Hint label="Reply in thead">
                        <Button variant={"ghost"} size={"iconSm"} disabled={isPending}>
                            <MessageSquareTextIcon className="size-4 text-[#ff5018]"/>
                        </Button>
                        </Hint>
        )}

            {isAuthor && (
                <Hint label="Edit Message">
                <Button variant={"ghost"} size={"iconSm"} disabled={isPending}>
                    <Pencil className="size-4 text-[#ff5018]" />
                </Button>
                </Hint>
    
            )}
           {isAuthor && (
             <Hint label="Delete Message">
             <Button variant={"ghost"} size={"iconSm"} disabled={isPending}>
                 <TrashIcon className="size-4 text-[#ff5018]"/>
             </Button>
             </Hint>
           )}
          </div>
        </div>
    )

}