import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { LucideIcon } from "lucide-react"
import { IconType } from "react-icons/lib"

interface SidebarButtonProps {
  icon: LucideIcon | IconType
  label: string
  isActive?: boolean
  onClick?: () => void
}

export const SidebarButton = ({
  icon: Icon,
  label,
  isActive,
  onClick,
}: SidebarButtonProps) => {
  return (
    <div className="cursor-pointer group" onClick={onClick}>
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
    </div>
  )
}