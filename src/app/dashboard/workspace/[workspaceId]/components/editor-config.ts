import type { MutableRefObject } from "react";
import type Quill from "quill";
import type { Delta, Op } from "quill/core";
import { Briefcase, Code, Heading1, Heading2, Languages, List, ListCollapse, ListOrdered, Maximize2, Minimize2, Smile, Sparkles, SpellCheck } from "lucide-react";

export type EditorValue = {
    image: File | null;
    file: File | null;
    body: string;
};

export interface EditorProps {
    onSubmit: ({ image, file, body }: EditorValue) => void;
    onCancel?: () => void;
    placeholder?: string;
    defaultValue?: Delta | Op[];
    disabled?: boolean;
    innerRef?: MutableRefObject<Quill | null>;
    variant?: "create" | "update";
    allowEveryone?: boolean;
    // offer "@agent" in the mention list (channels and channel threads, when the workspace has it on)
    allowAgent?: boolean;
    // called as the person types (the caller throttles it); used for the "is typing" indicator
    onTyping?: () => void;
    // when set, what is typed is saved on this device under this key and restored after a reload or crash
    draftKey?: string;
}

export const FORMATTING_COMMANDS = [
    {
        label: "Heading 1",
        description: "Large heading",
        icon: Heading1,
        type: "format" as const,
        handler: (quill: Quill, index: number) => {
            quill.deleteText(index - 1, 1);
            quill.setSelection(index - 1, 0);
            quill.format("header", 1);
        },
    },
    {
        label: "Heading 2",
        description: "Medium heading",
        icon: Heading2,
        type: "format" as const,
        handler: (quill: Quill, index: number) => {
            quill.deleteText(index - 1, 1);
            quill.setSelection(index - 1, 0);
            quill.format("header", 2);
        },
    },
    {
        label: "Bullet list",
        description: "Unordered list",
        icon: List,
        type: "format" as const,
        handler: (quill: Quill, index: number) => {
            quill.deleteText(index - 1, 1);
            quill.setSelection(index - 1, 0);
            quill.format("list", "bullet");
        },
    },
    {
        label: "Numbered list",
        description: "Ordered list",
        icon: ListOrdered,
        type: "format" as const,
        handler: (quill: Quill, index: number) => {
            quill.deleteText(index - 1, 1);
            quill.setSelection(index - 1, 0);
            quill.format("list", "ordered");
        },
    },
    {
        label: "Code block",
        description: "Code snippet",
        icon: Code,
        type: "format" as const,
        handler: (quill: Quill, index: number) => {
            quill.deleteText(index - 1, 1);
            quill.setSelection(index - 1, 0);
            quill.format("code-block", true);
        },
    },
];

export const AI_COMMANDS = [
    {
        label: "Improve writing",
        description: "Polish and enhance",
        icon: Sparkles,
        command: "improve",
    },
    {
        label: "Fix grammar",
        description: "Fix errors",
        icon: SpellCheck,
        command: "grammar",
    },
    {
        label: "Make shorter",
        description: "Condense text",
        icon: Minimize2,
        command: "shorter",
    },
    {
        label: "Make longer",
        description: "Expand text",
        icon: Maximize2,
        command: "longer",
    },
    {
        label: "Make formal",
        description: "Professional tone",
        icon: Briefcase,
        command: "formal",
    },
    {
        label: "Make casual",
        description: "Friendly tone",
        icon: Smile,
        command: "casual",
    },
    {
        label: "Summarize",
        description: "Summarize text",
        icon: ListCollapse,
        command: "summarize",
    },
    {
        label: "Translate to English",
        description: "Translate any language",
        icon: Languages,
        command: "translate",
    },
];

// Format file size
export const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
};

// agent: the workspace's AI agent ("@agent"), inserted as plain text rather than a person mention
export type MentionMember = { _id: string; special?: string; agent?: boolean; user?: { name?: string | null; image?: string | null } | null };
