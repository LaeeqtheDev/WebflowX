import { cn } from "@/lib/utils"
import type { ComponentType } from "react"

type IconLike = ComponentType<{ className?: string }>

interface SidebarButtonProps {
    icon: IconLike
    activeIcon?: IconLike
    label: string
    isActive?: boolean
    onClick?: () => void
    badge?: number
}

export const SidebarButton = ({
    icon: Icon,
    activeIcon: ActiveIcon,
    label,
    isActive,
    onClick,
    badge,
}: SidebarButtonProps) => {
    const Shown = isActive && ActiveIcon ? ActiveIcon : Icon
    return (
        <button
            type="button"
            onClick={onClick}
            aria-label={label}
            aria-current={isActive ? "page" : undefined}
            className="group relative flex w-14 flex-col items-center gap-1 outline-none"
        >
            <span
                className={cn(
                    "relative flex h-8 w-12 items-center justify-center rounded-xl transition-all duration-200",
                    isActive
                        ? "bg-[#ff5018] text-white shadow-[0_6px_16px_-6px_rgba(255,80,24,0.8)]"
                        : "text-white/70 group-hover:bg-white/10 group-hover:text-white group-focus-visible:ring-2 group-focus-visible:ring-[#ff5018]"
                )}
            >
                <Shown className="size-[22px]" />
                {badge && badge > 0 ? (
                    <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#ff5018] px-1 text-[9px] font-bold text-white ring-2 ring-[#381d2a]">
                        {badge > 9 ? "9+" : badge}
                    </span>
                ) : null}
            </span>
            <span
                className={cn(
                    "text-[11px] font-medium transition-colors",
                    isActive ? "text-white" : "text-white/60 group-hover:text-white"
                )}
            >
                {label}
            </span>
        </button>
    )
}
