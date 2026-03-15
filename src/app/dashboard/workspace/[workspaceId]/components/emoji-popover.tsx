"use client"

import data from "@emoji-mart/data"
import Picker from "@emoji-mart/react"

import {
    Popover,
    PopoverContent,
    PopoverTrigger
} from "@/components/ui/popover"


import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger
} from "@/components/ui/tooltip"
import { useState } from "react";

interface EmojiPopoverProps {
    children: React.ReactNode;
    hint?: string;
    onEmojiSelect: (emoji: any) => void
}



export const EmojiPopover = ({
    children, hint="Emoji", onEmojiSelect
}: EmojiPopoverProps) => {
    const [popoverOpen, setPopOverOpen]= useState(false);
    const [tooltipOpen, setTooltipOpen]= useState(false);

    const onSelect = (emoji: any) => {
        onEmojiSelect(emoji)
        setPopOverOpen(false)

        setTimeout(() => {
            setTooltipOpen(false)
        }, 500)
    }


    return (
        <TooltipProvider>
            <Popover open={popoverOpen} onOpenChange={setPopOverOpen}>
            <Tooltip open={tooltipOpen} onOpenChange={setTooltipOpen} delayDuration={50}>
            <PopoverTrigger asChild>
            <TooltipTrigger asChild>
            {children}
            </TooltipTrigger>
            </PopoverTrigger>
            <TooltipContent className="bg-black text-white border border-white/5">
                <p className="font-medium text-xs">{hint}</p>
            </TooltipContent>
           
            </Tooltip>
            <PopoverContent className="p-0 w-full border-none shadow-none">
                <Picker data={data} onEmojiSelect={onEmojiSelect}/>
            </PopoverContent>
            </Popover>
        </TooltipProvider>
    )

}


