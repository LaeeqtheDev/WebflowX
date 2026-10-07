import Quill from "quill";
import "@/app/dashboard/workspace/[workspaceId]/components/mention-blot";

import { useEffect, useRef, useState } from "react";
import { usePanel } from "@/hooks/use-panel";

interface RendererProps {
    value: string;
}

const Renderer = ({value}: RendererProps) => {
    const [isEmpty, setIsEmpty] = useState(false);
    const rendererRef = useRef<HTMLDivElement>(null)
    const { onOpenProfile } = usePanel()

    useEffect(() => {
        if(!rendererRef.current) return;


        const container = rendererRef.current;
        const quill = new Quill(document.createElement("div"), {
            theme: "snow"
        });

        quill.enable(false);

        const contents = JSON.parse(value)
        quill.setContents(contents)

        const isEmpty = quill.getText().replace(/<(.|\n)*?>/g,"").trim().length === 0;
        // eslint-disable-next-line react-hooks/set-state-in-effect -- derived from Quill DOM parsing that can only run in an effect
        setIsEmpty(isEmpty)

        container.innerHTML = quill.root.innerHTML;

        return () => {
            if(container){
                container.innerHTML="";   
            }
        }
    }, [value])

    if(isEmpty) return null

    const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
        const el = (e.target as HTMLElement).closest?.("span.mention") as HTMLElement | null;
        const id = el?.getAttribute("data-member-id");
        if (id && id !== "everyone") {
            e.preventDefault();
            e.stopPropagation();
            onOpenProfile(id);
        }
    };

    return <div ref={rendererRef} onClick={handleClick} className="ql-editor ql-renderer"/>
}

export default Renderer