"use client"
import { Button } from "@/components/ui/button";
import { useWorkspaceId } from "@/hooks/use-workspace-id";
import { LucideIcon } from "lucide-react";
import Link from "next/link";
import { IconType } from "react-icons/lib";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const sidebarItemVariants = cva(
    "flex items-center gap-1.5 justify-start font-normal h-7 px-[18px] text-sm overflow-hidden",
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
    onClick?: () => void
}

export const SidebarItem = ({ label, id, icon: Icon, variant, onClick }: SidebarItemProps) => {
    const workspaceId = useWorkspaceId()

    if (onClick) {
        return (
            <Button
                variant={"trasnparent"}
                size={"sm"}
                className={cn(sidebarItemVariants({ variant }))}
                onClick={onClick}
            >
                <Icon className="text-[#ff5018] size-3.5 mr-1 shrink-0" />
                <span className="text-sm truncate">{label}</span>
            </Button>
        )
    }

    return (
        <Button asChild variant={"trasnparent"} size={"sm"} className={cn(sidebarItemVariants({ variant }))}>
            <Link href={`/dashboard/workspace/${workspaceId}/channel/${id}`}>
                <Icon className="text-[#ff5018] size-3.5 mr-1 shrink-0" />
                <span className="text-sm truncate">{label}</span>
            </Link>
        </Button>
    )
}