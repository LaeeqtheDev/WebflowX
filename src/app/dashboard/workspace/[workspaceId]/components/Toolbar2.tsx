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
    hideThreadButton?: boolean
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
          <div className="group-hover:opacity-100 opacity-0 transition-opacity border border-[#381d2a]/12 bg-white rounded-lg shadow-sm p-0.5 flex items-center">
        <EmojiPopover
        hint="Add Reaction"
        onEmojiSelect={(emoji)=> handleReaction(emoji.native)} 
        >
        <Button variant={"ghost"} size={"iconSm"} className="rounded-md hover:bg-[#f7f2ee]" disabled={isPending}>
                <Smile className="size-4 text-[#ff5018]"/>
            </Button>
        </EmojiPopover>

        {!hideThreadButton && (
                        <Hint label="Reply in thead">
                        <Button variant={"ghost"} size={"iconSm"} className="rounded-md hover:bg-[#f7f2ee]" disabled={isPending} onClick={handleThread}>
                            <MessageSquareTextIcon className="size-4 text-[#ff5018]"/>
                        </Button>
                        </Hint>
        )}

            {isAuthor && (
                <Hint label="Edit Message">
                <Button variant={"ghost"} size={"iconSm"} className="rounded-md hover:bg-[#f7f2ee]" disabled={isPending} onClick={handleEdit}>
                    <Pencil className="size-4 text-[#ff5018]" />
                </Button>
                </Hint>
    
            )}
           {isAuthor && (
             <Hint label="Delete Message">
             <Button variant={"ghost"} size={"iconSm"} className="rounded-md hover:bg-[#f7f2ee]" disabled={isPending} onClick={handleDelete}>
                 <TrashIcon className="size-4 text-[#ff5018]"/>
             </Button>
             </Hint>
           )}
          </div>
        </div>
    )

}