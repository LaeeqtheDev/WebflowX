"use client"
import { Button } from "@/components/ui/button";
import { useWorkspaceId } from "@/hooks/use-workspace-id";
import { LucideIcon } from "lucide-react";
import Link from "next/link";
import { IconType } from "react-icons/lib";
import { cva, type VariantProps } from "class-variance-authority";
import { text } from "stream/consumers";
import { cn } from "@/lib/utils";

const sidebarItemVariants = cva(
    "flex items-center gap-1.5 justify-start font-normal h-7 px-[18x] text-sm overflow-hidden",
    {
        variants: {
            variant: {
                default: "text-[#f9edffcc]",
                active: "text-black bg-white/90 hover:bg-white/90",
            },
        },
        defaultVariants: {
            variant: "default"
        }
    }
)


interface SidebarItemProps {
    label: string;
    id: string;
    icon: LucideIcon | IconType
    variant?: VariantProps<typeof sidebarItemVariants>["variant"]
}



export const SidebarItem = ({label, id, icon: Icon, variant}: SidebarItemProps) => {
    const workspaceId = useWorkspaceId()
    return(
       <Button asChild variant={"trasnparent"} size={"sm"} className={cn(sidebarItemVariants({variant: variant}))}>
        <Link href={`/dashboard/workspace/channel/${id}`}>
            <Icon className="text-[#ff5018] size-3.5 mr-1 shrink-0" />
            <span className="text-sm truncate">{label}</span>
        
        </Link>
       </Button>
    )
}