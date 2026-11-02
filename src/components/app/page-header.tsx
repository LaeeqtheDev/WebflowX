import type { ComponentType, ReactNode } from "react"

// The one header every workspace screen uses: icon tile, title, a short line under it, and actions on the right.
export const PageHeader = ({ icon: Icon, title, subtitle, children }: {
    icon: ComponentType<{ className?: string }>
    title: string
    subtitle?: ReactNode
    children?: ReactNode
}) => (
    <div className="flex min-h-14 shrink-0 flex-wrap items-center justify-between gap-3 border-b border-plum/12 bg-surface px-4 py-2 md:px-6">
        <div className="flex min-w-0 items-center gap-3">
            <span aria-hidden className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-brand/10 text-brand">
                <Icon className="size-4" />
            </span>
            <div className="min-w-0">
                <h1 className="truncate text-[17px] font-semibold leading-none tracking-tight text-ink">{title}</h1>
                {subtitle && <p className="mt-1 truncate text-[11px] text-ink/60">{subtitle}</p>}
            </div>
        </div>
        {children && <div className="flex items-center gap-2">{children}</div>}
    </div>
)
