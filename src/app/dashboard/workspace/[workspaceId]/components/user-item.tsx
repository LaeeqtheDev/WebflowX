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


const userItemVariants = cva(
    "flex items-center gap-1.5 justify-start font-normal h-7 max-md:h-10 px-[18px] text-sm overflow-hidden rounded-md transition-colors",
    {
        variants: {
            variant: {
                default: "text-white/75 hover:text-white hover:bg-white/10",
                active: "text-[#1b1017] font-medium bg-[#f7f2ee] hover:bg-[#f7f2ee]",
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
}


export const UserItem= ({id, label = "Member", image, variant}: UserItemProps) => {
    const workspaceId = useWorkspaceId()
    const fallbackInitial = label.charAt(0).toUpperCase()
    return (
        <Button
        variant={"trasnparent"}
        className={cn(userItemVariants({variant: variant}))}
        size={"sm"}
        asChild
        >
            <Link href={`/dashboard/workspace/${workspaceId}/member/${id}`}>
                <Avatar className="size-5 rounded-md mr-1">
                    <AvatarImage className="rounded-md" src={image} alt={label}/>
                    <AvatarFallback className="rounded-md bg-[#ff5018] text-white text-center text-xs">
                        {fallbackInitial}
                    </AvatarFallback>
                </Avatar>
                <span className="text-sm truncate">{label}</span>
            </Link>

        </Button>
    )
}