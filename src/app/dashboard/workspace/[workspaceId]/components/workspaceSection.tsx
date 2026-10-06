import { Button } from "@/components/ui/button";
import { FaCaretDown } from "react-icons/fa";
import { Hint } from "./hints";
import { PlusIcon } from "lucide-react";
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
        <div className="flex flex-col mt-4 px-2">
            <div className="flex items-center px-1 group">
           <Button variant={"trasnparent"}  onClick={toggle} asChild
           className="p-0.5 text-sm text-white/55 hover:text-white shrink-0 size-6 rounded-md">
            <FaCaretDown size={5} className={cn("size-4 text-white/55 transition-transform", on && "-rotate-90")}/>
           </Button>
           <Button variant={"trasnparent"} size={"sm"} className="group px-1.5 text-[13px] font-semibold text-white/55 hover:text-white h-7 justify-start overflow-hidden items-center">
            <span className="truncate">{label}</span>
           </Button>
           {onNew && (
            <Hint label={hint} side="top" align="center" >
                <Button onClick={onNew}
                variant={"trasnparent"}
                size={"iconSm"}
                className="opacity-0 group-hover:opacity-100 transition-opacity ml-auto p-0.5 text-sm text-white/55 hover:bg-white/10 rounded-md shrink-0 size-6"
                >
                    <PlusIcon className="text-white/70 size-4"/>

                </Button>

            </Hint>
           )}
            </div>
            {on && children}
        </div>
    )
}