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
        <div className="flex flex-col mt-3 px-2">
            <div className="flex items-center px-1 group">
           <Button variant={"trasnparent"}  onClick={toggle} asChild
           className="p-0.5 text-sm text-[#f9edffcc] shrink-0 size-6">
            <FaCaretDown size={5} className={cn("size-4 text-[#ff5018] transition-transform", on && "-rotate-90")}/>
           </Button>
           <Button variant={"trasnparent"} size={"sm"} className="group px-1.5 text-sm text-[#f9edffcc] h-7 justify-start overflow-hidden items-center">
            <span className="truncate">{label}</span>
           </Button>
           {onNew && (
            <Hint label={hint} side="top" align="center" >
                <Button onClick={onNew}
                variant={"trasnparent"}
                size={"iconSm"}
                className="opacity-0 group-hover:opacity-100 transition-opacity ml-auto p-0.5 text-sm text-[#f9edffcc] shrink-0 size-6"
                >
                    <PlusIcon className="text-[#ff5018] size-5"/>

                </Button>

            </Hint>
           )}
            </div>
            {on && children}
        </div>
    )
}