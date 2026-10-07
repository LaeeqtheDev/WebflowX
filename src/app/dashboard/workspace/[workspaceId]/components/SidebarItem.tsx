"use client"
import { Button } from "@/components/ui/button";
import { useWorkspaceId } from "@/hooks/use-workspace-id";
import Link from "next/link";
import type { ComponentType } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const sidebarItemVariants = cva(
    "flex items-center gap-2 justify-start font-normal h-8 max-md:h-10 px-3 text-sm overflow-hidden rounded-lg transition-colors",
    {
        variants: {
            variant: {
                default: "text-white/75 hover:text-white hover:bg-white/10",
                active: "text-white font-semibold bg-[#ff5018] hover:bg-[#ff5018] shadow-[0_6px_14px_-8px_rgba(255,80,24,0.9)]",
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
    icon: ComponentType<{ className?: string }>
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
                <Icon className="size-[18px] shrink-0 opacity-90" />
                <span className="text-sm truncate">{label}</span>
            </Button>
        )
    }

    return (
        <Button asChild variant={"trasnparent"} size={"sm"} className={cn(sidebarItemVariants({ variant }))}>
            <Link href={`/dashboard/workspace/${workspaceId}/channel/${id}`}>
                <Icon className="size-[18px] shrink-0 opacity-90" />
                <span className="text-sm truncate">{label}</span>
            </Link>
        </Button>
    )
}