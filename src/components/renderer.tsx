"use client";

import dynamic from "next/dynamic";
import { memo } from "react";
import { usePanel } from "@/hooks/use-panel";
import { renderDelta } from "@/lib/delta-html";

// Almost every message is plain text with a little formatting, which is turned into HTML directly. Quill (~70 KB, slow to
// start) is only loaded for the rare message with something else in it, such as an image, a code block or an alignment.
const QuillRenderer = dynamic(() => import("./renderer-quill"), { ssr: false });

interface RendererProps {
    value: string;
}

const Renderer = ({ value }: RendererProps) => {
    const { onOpenProfile } = usePanel();
    const rendered = renderDelta(value);

    if (!rendered) return <QuillRenderer value={value} />;
    if (rendered.empty) return null;

    const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
        const el = (e.target as HTMLElement).closest?.("span.mention") as HTMLElement | null;
        const id = el?.getAttribute("data-member-id");
        if (id && id !== "everyone") {
            e.preventDefault();
            e.stopPropagation();
            onOpenProfile(id);
        }
    };

    return <div onClick={handleClick} className="ql-editor ql-renderer" dangerouslySetInnerHTML={{ __html: rendered.html }} />;
};

export default memo(Renderer);
