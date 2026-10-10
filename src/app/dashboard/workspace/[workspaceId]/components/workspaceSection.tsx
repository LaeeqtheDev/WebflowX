import { Hint } from "./hints";
import { ChevronDown, PlusIcon } from "lucide-react";
import {useToggle} from "react-use"
import { cn } from "@/lib/utils";

interface WorkspaceSectionProps {
    children: React.ReactNode;
    label: string;
    hint: string;
    onNew?: () => void;
}


export const WorkspaceSection = ({ children, label, hint, onNew }: WorkspaceSectionProps) => {
    const [on, toggle] = useToggle(true)
    return(
        <div className="flex flex-col mt-5 px-2">
            <div className="group flex items-center justify-between px-1 mb-1">
                <button
                    type="button"
                    onClick={toggle}
                    aria-label={`${on ? "Collapse" : "Expand"} ${label}`}
                    aria-expanded={on}
                    className="flex min-w-0 items-center gap-1 rounded-md px-1.5 py-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-white/50 transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/70"
                >
                    <ChevronDown aria-hidden className={cn("size-3.5 shrink-0 transition-transform", !on && "-rotate-90")} />
                    <span className="truncate">{label}</span>
                </button>
                {onNew && (
                    <Hint label={hint} side="top" align="center" >
                        <button
                            type="button"
                            onClick={onNew}
                            aria-label={hint}
                            className="flex size-6 max-md:size-9 shrink-0 items-center justify-center rounded-md text-white/60 opacity-0 transition hover:bg-white/10 hover:text-white focus-visible:opacity-100 group-hover:opacity-100 max-md:opacity-100"
                        >
                            <PlusIcon className="size-4" aria-hidden="true"/>
                        </button>
                    </Hint>
                )}
            </div>
            {on && <div className="flex flex-col gap-0.5">{children}</div>}
        </div>
    )
}
