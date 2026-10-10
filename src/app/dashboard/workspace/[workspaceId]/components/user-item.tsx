import { softNav } from "@/lib/soft-nav"
import { Button } from "@/components/ui/button"
import {
    Avatar,
    AvatarFallback,
    AvatarImage
} from "@/components/ui/avatar"

import { Id } from "../../../../../../convex/_generated/dataModel"
import { cva, type VariantProps } from "class-variance-authority";
import { useWorkspaceId } from "@/hooks/use-workspace-id";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { PresenceDot } from "@/features/presence/presence";


const userItemVariants = cva(
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


interface UserItemProps {
    id: Id<"members">;
    label?: string;
    image?: string;
    variant?: VariantProps<typeof userItemVariants>["variant"];
    // number of unread direct messages from this person
    unread?: number;
    isSelf?: boolean;
}


export const UserItem= ({id, label = "Member", image, variant, unread = 0, isSelf}: UserItemProps) => {
    const workspaceId = useWorkspaceId()
    const fallbackInitial = label.charAt(0).toUpperCase()
    return (
        <Button
        variant={"trasnparent"}
        className={cn(userItemVariants({variant: variant}), unread > 0 && variant !== "active" && "text-white font-medium")}
        size={"sm"}
        asChild
        >
            <Link href={`/dashboard/workspace/${workspaceId}/member/${id}`} prefetch={false} onClick={(e) => softNav(e, `/dashboard/workspace/${workspaceId}/member/${id}`)} aria-current={variant === "active" ? "page" : undefined}>
                {variant === "active" && <span aria-hidden className="absolute left-0 top-1.5 bottom-1.5 w-[3px] rounded-r-full bg-brand" />}
                <span className="relative shrink-0">
                    <Avatar className="size-5 rounded-md">
                        <AvatarImage className="rounded-md" src={image} alt=""/>
                        <AvatarFallback className="rounded-md bg-brand text-white text-center text-[11px]">
                            {fallbackInitial}
                        </AvatarFallback>
                    </Avatar>
                    <PresenceDot memberId={id} />
                </span>
                <span className="truncate">{label}</span>
                {isSelf && <span className="shrink-0 text-xs text-white/45">you</span>}
                {unread > 0 && (
                    <span className="ml-auto flex h-[18px] min-w-[18px] shrink-0 items-center justify-center rounded-full bg-brand px-1.5 text-[11px] font-bold leading-none text-white">
                        {unread > 9 ? "9+" : unread}
                    </span>
                )}
            </Link>

        </Button>
    )
}
