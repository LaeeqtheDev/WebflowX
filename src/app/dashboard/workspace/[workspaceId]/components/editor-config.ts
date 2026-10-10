import type { MutableRefObject } from "react";
import type Quill from "quill";
import type { Delta, Op } from "quill/core";

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
    // called as the person types (the caller throttles it); used for the "is typing" indicator
    onTyping?: () => void;
    // when set, what is typed is saved on this device under this key and restored after a reload or crash
    draftKey?: string;
}

export const FORMATTING_COMMANDS = [
    {
        label: "Heading 1",
        description: "Large heading",
        icon: "H1",
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
        icon: "H2",
        type: "format" as const,
        handler: (quill: Quill, index: number) => {
            quill.deleteText(index - 1, 1);
            quill.setSelection(index - 1, 0);
            quill.format("header", 2);
        },
    },
    {
        label: "Bullet List",
        description: "Unordered list",
        icon: "•",
        type: "format" as const,
        handler: (quill: Quill, index: number) => {
            quill.deleteText(index - 1, 1);
            quill.setSelection(index - 1, 0);
            quill.format("list", "bullet");
        },
    },
    {
        label: "Numbered List",
        description: "Ordered list",
        icon: "1.",
        type: "format" as const,
        handler: (quill: Quill, index: number) => {
            quill.deleteText(index - 1, 1);
            quill.setSelection(index - 1, 0);
            quill.format("list", "ordered");
        },
    },
    {
        label: "Code Block",
        description: "Code snippet",
        icon: "<>",
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
        label: "Improve Writing",
        description: "Polish and enhance",
        icon: "✨",
        command: "improve",
    },
    {
        label: "Fix Grammar",
        description: "Fix errors",
        icon: "🔧",
        command: "grammar",
    },
    {
        label: "Make Shorter",
        description: "Condense text",
        icon: "📉",
        command: "shorter",
    },
    {
        label: "Make Longer",
        description: "Expand text",
        icon: "📈",
        command: "longer",
    },
    {
        label: "Make Formal",
        description: "Professional tone",
        icon: "👔",
        command: "formal",
    },
    {
        label: "Make Casual",
        description: "Friendly tone",
        icon: "😊",
        command: "casual",
    },
    {
        label: "Summarize",
        description: "Summarize text",
        icon: "📝",
        command: "summarize",
    },
    {
        label: "Translate to English",
        description: "Translate any language",
        icon: "🌍",
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

export type MentionMember = { _id: string; special?: string; user?: { name?: string | null; image?: string | null } | null };
