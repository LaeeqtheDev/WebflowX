import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ListChecks, MessageSquareTextIcon, MoreHorizontal, Pencil, Smile, TrashIcon } from "lucide-react";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";
import { Hint } from "./hints";
import { EmojiPopover } from "./emoji-popover";

interface ToolbarProps{
    isAuthor: boolean;
    canModerate?: boolean;
    isPending: boolean;
    handleEdit: () => void;
    handleThread: () => void;
    handleDelete: () => void;
    handleReaction: (value: string) => void;
    handleCreateTask?: () => void;
    hideThreadButton?: boolean
}

const QUICK_REACTIONS = ["👍", "❤️", "😂", "🎉", "👀", "🙏"];

const sheetRow = "flex h-12 w-full items-center gap-3 rounded-xl px-3 text-left text-[15px] font-medium text-[#1b1017] transition-colors hover:bg-[#f7f2ee] active:bg-[#f7f2ee] disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ff5018]/70";

export const Toolbar2 =({
    isAuthor,
    canModerate,
    isPending,
    handleDelete,
    handleEdit,
    handleReaction,
    hideThreadButton,
    handleThread,
    handleCreateTask
}: ToolbarProps) =>{
    const [sheetOpen, setSheetOpen] = useState(false)
    const canDelete = isAuthor || !!canModerate

    // Close the sheet first, then run the action (some actions open their own dialog)
    const run = (fn: () => void) => () => {
        setSheetOpen(false)
        setTimeout(fn, 120)
    }

    return(
        <>
        {/* Touch / phones: hover does not exist, so every message gets an actions button */}
        <div className="absolute right-1 top-0 md:hidden">
            <button
                type="button"
                aria-label="Message actions"
                aria-haspopup="dialog"
                onClick={() => setSheetOpen(true)}
                className="flex size-10 items-center justify-center rounded-lg text-[#1b1017]/60 transition-colors hover:bg-[#f7f2ee] active:bg-[#f7f2ee] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ff5018]/70"
            >
                <MoreHorizontal className="size-5" />
            </button>
        </div>

        <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
            <SheetContent side="bottom" closeLabel="Close message actions" className="bg-white p-4 pt-5">
                <SheetTitle className="text-[#1b1017]">Message actions</SheetTitle>
                <SheetDescription className="sr-only">React, reply in a thread, edit or delete this message.</SheetDescription>
                <div className="mt-3 flex items-center justify-between gap-1 rounded-xl bg-[#f7f2ee] p-1">
                    {QUICK_REACTIONS.map((emoji) => (
                        <button
                            key={emoji}
                            type="button"
                            aria-label={`React with ${emoji}`}
                            disabled={isPending}
                            onClick={run(() => handleReaction(emoji))}
                            className="flex size-11 items-center justify-center rounded-lg text-xl transition-colors hover:bg-white active:bg-white disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ff5018]/70"
                        >
                            {emoji}
                        </button>
                    ))}
                </div>
                <div className="mt-2 flex flex-col">
                    {!hideThreadButton && (
                        <button type="button" className={sheetRow} disabled={isPending} onClick={run(handleThread)}>
                            <MessageSquareTextIcon className="size-5 text-[#c2370d]" /> Reply in thread
                        </button>
                    )}
                    {handleCreateTask && (
                        <button type="button" className={sheetRow} disabled={isPending} onClick={run(handleCreateTask)}>
                            <ListChecks className="size-5 text-[#c2370d]" /> Create task from message
                        </button>
                    )}
                    {isAuthor && (
                        <button type="button" className={sheetRow} disabled={isPending} onClick={run(handleEdit)}>
                            <Pencil className="size-5 text-[#c2370d]" /> Edit message
                        </button>
                    )}
                    {canDelete && (
                        <button type="button" className={`${sheetRow} text-rose-700`} disabled={isPending} onClick={run(handleDelete)}>
                            <TrashIcon className="size-5" /> Delete message
                        </button>
                    )}
                </div>
            </SheetContent>
        </Sheet>

        <div className="absolute top-0 right-5 max-md:hidden">
          <div className="group-hover:opacity-100 focus-within:opacity-100 opacity-0 transition-opacity border border-[#381d2a]/12 bg-white rounded-lg shadow-sm p-0.5 flex items-center">
        <EmojiPopover
        hint="Add Reaction"
        onEmojiSelect={(emoji)=> handleReaction(emoji.native)} 
        >
        <Button variant={"ghost"} size={"iconSm"} aria-label="Add reaction" className="rounded-md hover:bg-[#f7f2ee]" disabled={isPending}>
                <Smile className="size-4 text-[#ff5018]"/>
            </Button>
        </EmojiPopover>

        {!hideThreadButton && (
                        <Hint label="Reply in thread">
                        <Button variant={"ghost"} size={"iconSm"} aria-label="Reply in thread" className="rounded-md hover:bg-[#f7f2ee]" disabled={isPending} onClick={handleThread}>
                            <MessageSquareTextIcon className="size-4 text-[#ff5018]"/>
                        </Button>
                        </Hint>
        )}

        {handleCreateTask && (
            <Hint label="Create task from message">
                <Button variant={"ghost"} size={"iconSm"} aria-label="Create task from message" className="rounded-md hover:bg-[#f7f2ee]" disabled={isPending} onClick={handleCreateTask}>
                    <ListChecks className="size-4 text-[#ff5018]"/>
                </Button>
            </Hint>
        )}

            {isAuthor && (
                <Hint label="Edit Message">
                <Button variant={"ghost"} size={"iconSm"} aria-label="Edit message" className="rounded-md hover:bg-[#f7f2ee]" disabled={isPending} onClick={handleEdit}>
                    <Pencil className="size-4 text-[#ff5018]" />
                </Button>
                </Hint>
    
            )}
           {canDelete && (
             <Hint label="Delete Message">
             <Button variant={"ghost"} size={"iconSm"} aria-label="Delete message" className="rounded-md hover:bg-[#f7f2ee]" disabled={isPending} onClick={handleDelete}>
                 <TrashIcon className="size-4 text-[#ff5018]"/>
             </Button>
             </Hint>
           )}
          </div>
        </div>
        </>
    )

}
