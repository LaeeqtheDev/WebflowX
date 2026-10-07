"use client"

import {
   Tooltip,
    TooltipContent,
    TooltipTrigger,
    TooltipProvider 
}

from "@/components/ui/tooltip"
import React from "react";


interface HintsProps {
    label: string;
    children: React.ReactNode;
    side?:"top" | "right" | "bottom" | "left";
    align?:"start" | "center" | "end";  


}

export const Hint = ({label, children, side , align}:HintsProps) => {
    return(
        <TooltipProvider>
            <Tooltip delayDuration={50}>
                <TooltipTrigger asChild>
                    {children}
                </TooltipTrigger>
                <TooltipContent side={side} align={align} className="bg-[#1b1017] dark:bg-[#f4ece7] text-white dark:text-[#1b1017] border border-white/5 dark:border-transparent rounded-lg px-2.5 py-1.5 shadow-sm">
                    <p className="font-medium text-xs"> 
                    {label}
                    </p>
                </TooltipContent>
            </Tooltip>
        </TooltipProvider>
    )
}