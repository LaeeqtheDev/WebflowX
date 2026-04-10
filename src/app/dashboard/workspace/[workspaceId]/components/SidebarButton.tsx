import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { LucideIcon } from "lucide-react"
import { IconType } from "react-icons/lib"

interface SidebarButtonProps {
    icon: LucideIcon | IconType
    label: string
    isActive?: boolean
    onClick?: () => void
    badge?: number
}

export const SidebarButton = ({
    icon: Icon,
    label,
    isActive,
    onClick,
    badge,
}: SidebarButtonProps) => {
    return (
        <div className="cursor-pointer group relative" onClick={onClick}>
            <Button
                variant={"trasnparent"}
                className={cn(
                    "size-8 p-1 flex h-auto w-auto flex-col items-center justify-center gap-0.5 transition-colors group-hover:bg-accent/20",
                    isActive && "bg-accent/20"
                )}
            >
                <Icon className="size-5 transition-transform group-hover:scale-110 text-[#ff5018]" />
                <span className="text-[11px] text-white group-hover:text-accent">
                    {label}
                </span>
            </Button>
            {badge && badge > 0 ? (
                <div className="absolute -top-0.5 -right-0.5 size-4 bg-[#ff5018] rounded-full flex items-center justify-center pointer-events-none">
                    <span className="text-[9px] text-white font-bold">
                        {badge > 9 ? "9+" : badge}
                    </span>
                </div>
            ) : null}
        </div>
    )
}