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
    onEmojiSelect: (emoji: { native: string }) => void
}



export const EmojiPopover = ({
    children, hint="Emoji", onEmojiSelect
}: EmojiPopoverProps) => {
    const [popoverOpen, setPopOverOpen]= useState(false);
    const [tooltipOpen, setTooltipOpen]= useState(false);

    const onSelect = (emoji: { native: string }) => {
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
            <TooltipContent className="bg-[#1b1017] text-white border border-white/5 rounded-lg px-2.5 py-1.5 shadow-sm">
                <p className="font-medium text-xs">{hint}</p>
            </TooltipContent>
           
            </Tooltip>
            <PopoverContent className="p-0 w-full border border-[#381d2a]/12 rounded-xl overflow-hidden shadow-md">
                <Picker data={data} onEmojiSelect={onEmojiSelect}/>
            </PopoverContent>
            </Popover>
        </TooltipProvider>
    )

}


