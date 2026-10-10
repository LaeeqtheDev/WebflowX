"use client"
import { Button } from "@/components/ui/button";
import { useWorkspaceId } from "@/hooks/use-workspace-id";
import Link from "next/link";
import { softNav } from "@/lib/soft-nav";
import type { ComponentType } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const sidebarItemVariants = cva(
    "relative flex w-full items-center gap-2.5 justify-start font-normal h-8 max-md:h-10 px-3 text-[14px] overflow-hidden rounded-lg transition-colors",
    {
        variants: {
            variant: {
                default: "text-white/70 hover:text-white hover:bg-white/[0.08]",
                active: "text-white font-medium bg-white/[0.14] hover:bg-white/[0.16]",
            },
        },
        defaultVariants: {
            variant: "default"
        }
    }
)

// Orange marker on the left edge of the page you're on
const ActiveMark = () => (
    <span aria-hidden className="absolute left-0 top-1.5 bottom-1.5 w-[3px] rounded-r-full bg-brand" />
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
                aria-current={variant === "active" ? "page" : undefined}
                className={cn(sidebarItemVariants({ variant }))}
                onClick={onClick}
            >
                {variant === "active" && <ActiveMark />}
                <Icon className="size-[18px] shrink-0 opacity-90" />
                <span className="truncate">{label}</span>
            </Button>
        )
    }

    return (
        <Button asChild variant={"trasnparent"} size={"sm"} className={cn(sidebarItemVariants({ variant }))}>
            <Link href={`/dashboard/workspace/${workspaceId}/channel/${id}`} prefetch={false} onClick={(e) => softNav(e, `/dashboard/workspace/${workspaceId}/channel/${id}`)} aria-current={variant === "active" ? "page" : undefined}>
                {variant === "active" && <ActiveMark />}
                <Icon className="size-[18px] shrink-0 opacity-90" />
                <span className="truncate">{label}</span>
            </Link>
        </Button>
    )
}
