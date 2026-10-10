"use client"

import { Check, ChevronUp } from "lucide-react"
import { useMediaDeviceSelect } from "@livekit/components-react"
import { cn } from "@/lib/utils"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"

export function CtrlButton({
    active = true, danger, onClick, label, children, disabled, badge, className,
}: {
    active?: boolean; danger?: boolean; onClick?: () => void; label: string
    children: React.ReactNode; disabled?: boolean; badge?: number; className?: string
}) {
    return (
        <button
            onClick={onClick}
            disabled={disabled}
            title={label}
            aria-label={label}
            className={cn(
                "relative flex size-11 shrink-0 items-center justify-center rounded-full text-white outline-none transition-all focus-visible:ring-2 focus-visible:ring-brand active:scale-95 disabled:opacity-50 sm:size-12",
                danger ? "bg-red-600 hover:bg-red-500"
                    : active ? "bg-white/10 hover:bg-white/20"
                        : "bg-red-500 hover:bg-red-400",
                className
            )}
        >
            {children}
            {!!badge && (
                <span className="absolute -right-0.5 -top-0.5 flex min-w-4 items-center justify-center rounded-full bg-brand px-1 text-[10px] font-bold">
                    {badge > 9 ? "9+" : badge}
                </span>
            )}
        </button>
    )
}

// Device picker: opens above the bar in its own layer, so nothing can clip it
export function DevicePicker({ kind }: { kind: "audioinput" | "videoinput" }) {
    const { devices, activeDeviceId, setActiveMediaDevice } = useMediaDeviceSelect({ kind, requestPermissions: false })
    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <button
                    aria-label={kind === "audioinput" ? "Choose microphone" : "Choose camera"}
                    className="flex h-9 w-7 items-center justify-center rounded-full text-white/80 outline-none hover:bg-white/15 hover:text-white focus-visible:ring-2 focus-visible:ring-brand"
                >
                    <ChevronUp className="size-4" />
                </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent side="top" align="center" sideOffset={12} className="max-h-72 w-72 overflow-y-auto rounded-xl">
                <p className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">{kind === "audioinput" ? "Microphone" : "Camera"}</p>
                {devices.length === 0 && <p className="px-2 py-2 text-sm text-muted-foreground">No devices found</p>}
                {devices.map((d) => (
                    <DropdownMenuItem key={d.deviceId} className="cursor-pointer gap-2" onClick={() => { void setActiveMediaDevice(d.deviceId) }}>
                        <Check className={cn("size-4 shrink-0", d.deviceId === activeDeviceId ? "opacity-100" : "opacity-0")} />
                        <span className="truncate">{d.label || "Default"}</span>
                    </DropdownMenuItem>
                ))}
            </DropdownMenuContent>
        </DropdownMenu>
    )
}

// the button and its device picker share one rounded pill
export function SplitCtrl({
    active, onClick, label, disabled, kind, children,
}: {
    active: boolean; onClick: () => void; label: string; disabled?: boolean
    kind: "audioinput" | "videoinput"; children: React.ReactNode
}) {
    return (
        <div className={cn("flex shrink-0 items-center rounded-full transition-colors", active ? "bg-white/10" : "bg-red-500")}>
            <button
                onClick={onClick}
                disabled={disabled}
                title={label}
                aria-label={label}
                className="flex size-11 items-center justify-center rounded-full text-white outline-none transition-all hover:bg-white/15 focus-visible:ring-2 focus-visible:ring-brand active:scale-95 disabled:opacity-50 sm:size-12"
            >
                {children}
            </button>
            <div className="hidden pr-1 sm:block"><DevicePicker kind={kind} /></div>
        </div>
    )
}
