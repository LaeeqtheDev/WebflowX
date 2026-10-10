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
            className="group relative flex w-full flex-col items-center gap-1 px-2 outline-none"
        >
            {/* active rail */}
            <span
                aria-hidden
                className={cn(
                    "absolute left-0 top-1.5 h-6 w-[3px] rounded-r-full bg-brand transition-all duration-200",
                    isActive ? "opacity-100" : "scale-y-0 opacity-0"
                )}
            />
            <span
                className={cn(
                    "relative flex h-9 w-11 items-center justify-center rounded-xl transition-all duration-200",
                    isActive
                        ? "bg-brand text-white shadow-[0_8px_18px_-8px_color-mix(in_srgb,var(--wfx-accent)_90%,transparent)]"
                        : "text-white/65 group-hover:bg-white/[0.08] group-hover:text-white group-active:scale-95 group-focus-visible:ring-2 group-focus-visible:ring-brand/70"
                )}
            >
                <Shown className="size-[22px]" />
                {badge && badge > 0 ? (
                    <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-brand px-1 text-[9px] font-bold leading-none text-white ring-2 ring-rail">
                        {badge > 9 ? "9+" : badge}
                    </span>
                ) : null}
            </span>
            <span
                className={cn(
                    "text-[10.5px] font-medium tracking-tight transition-colors",
                    isActive ? "text-white" : "text-white/55 group-hover:text-white/90"
                )}
            >
                {label}
            </span>
        </button>
    )
}
