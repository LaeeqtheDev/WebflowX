"use client";

import "quill/dist/quill.snow.css";
import {
    MutableRefObject,
    useEffect,
    useLayoutEffect,
    useRef,
    useState,
} from "react";
import Quill, { type QuillOptions } from "quill";
import { Button } from "@/components/ui/button";
import { PiTextAa } from "react-icons/pi";
import {
    FileText,
    ImageIcon,
    Smile,
    XIcon,
    Sparkles,
    Loader2,
    File,
    Download,
} from "lucide-react";
import { MdSend } from "react-icons/md";
import { Hint } from "./hints";
import { Delta, Op } from "quill/core";
import { cn } from "@/lib/utils";
import { EmojiPopover } from "./emoji-popover";
import Image from "next/image";

type EditorValue = {
    image: File | null;
    file: File | null;
    body: string;
};

interface EditorProps {
    onSubmit: ({ image, file, body }: EditorValue) => void;
    onCancel?: () => void;
    placeholder?: string;
    defaultValue?: Delta | Op[];
    disabled?: boolean;
    innerRef?: MutableRefObject<Quill | null>;
    variant?: "create" | "update";
}

const FORMATTING_COMMANDS = [
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

const AI_COMMANDS = [
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

// File type icons mapping
const getFileIcon = (fileType: string) => {
    if (fileType.startsWith("image/")) return "🖼️";
    if (fileType.includes("pdf")) return "📄";
    if (fileType.includes("word") || fileType.includes("document")) return "📝";
    if (fileType.includes("sheet") || fileType.includes("excel")) return "📊";
    if (fileType.includes("presentation") || fileType.includes("powerpoint"))
        return "📽️";
    if (fileType.includes("zip") || fileType.includes("rar")) return "📦";
    if (fileType.includes("video")) return "🎬";
    if (fileType.includes("audio")) return "🎵";
    if (fileType.includes("text")) return "📃";
    return "📎";
};

// Format file size
const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
};

const Editor = ({
    onCancel,
    onSubmit,
    placeholder = "Write Something...",
    defaultValue = [],
    disabled = false,
    innerRef,
    variant = "create",
}: EditorProps) => {
    const [text, setText] = useState("");
    const [isToolbarVisible, setIsToolbarVisible] = useState(true);
    const [image, setImage] = useState<File | null>(null);
    const [file, setFile] = useState<File | null>(null);
    const [showSlashMenu, setShowSlashMenu] = useState(false);
    const [slashMenuIndex, setSlashMenuIndex] = useState(0);
    const [selectedSlashItem, setSelectedSlashItem] = useState(0);
    const [activeTab, setActiveTab] = useState<"format" | "ai">("format");
    const [isAiLoading, setIsAiLoading] = useState(false);

    const containerRef = useRef<HTMLDivElement>(null);
    const submitRef = useRef(onSubmit);
    const placeholderRef = useRef(placeholder);
    const quilRef = useRef<Quill | null>(null);
    const defaultValueRef = useRef(defaultValue);
    const disabledRef = useRef(disabled);
    const imageElementRef = useRef<HTMLInputElement>(null);
    const fileElementRef = useRef<HTMLInputElement>(null);
    const wrapperRef = useRef<HTMLDivElement>(null);

    const showSlashMenuRef = useRef(false);
    const selectedSlashItemRef = useRef(0);
    const slashMenuIndexRef = useRef(0);
    const activeTabRef = useRef<"format" | "ai">("format");

    useLayoutEffect(() => {
        submitRef.current = onSubmit;
        placeholderRef.current = placeholder;
        defaultValueRef.current = defaultValue;
        disabledRef.current = disabled;
    });

    useEffect(() => {
        showSlashMenuRef.current = showSlashMenu;
    }, [showSlashMenu]);
    useEffect(() => {
        selectedSlashItemRef.current = selectedSlashItem;
    }, [selectedSlashItem]);
    useEffect(() => {
        slashMenuIndexRef.current = slashMenuIndex;
    }, [slashMenuIndex]);
    useEffect(() => {
        activeTabRef.current = activeTab;
    }, [activeTab]);

    const handleAiCommand = async (command: string) => {
        const quill = quilRef.current;
        if (!quill) return;

        const currentText = quill.getText().replace("/", "").trim();
        if (!currentText) {
            setShowSlashMenu(false);
            showSlashMenuRef.current = false;
            return;
        }

        setIsAiLoading(true);
        setShowSlashMenu(false);
        showSlashMenuRef.current = false;

        quill.deleteText(slashMenuIndexRef.current - 1, 1);

        try {
            const res = await fetch("/api/ai-editor", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ text: currentText, command }),
            });
            const data = await res.json();
            if (data.result) {
                quill.setContents([]);
                quill.insertText(0, data.result);
                quill.setSelection(data.result.length, 0);
            }
        } catch (e) {
            console.error("AI command failed:", e);
        } finally {
            setIsAiLoading(false);
            quill.focus();
        }
    };

    const handleFormattingCommand = (cmd: (typeof FORMATTING_COMMANDS)[0]) => {
        const quill = quilRef.current;
        if (!quill) return;
        cmd.handler(quill, slashMenuIndexRef.current);
        setShowSlashMenu(false);
        showSlashMenuRef.current = false;
        quill.focus();
    };

    useEffect(() => {
        if (!containerRef.current) return;

        const container = containerRef.current;
        const editorContainer = document.createElement("div");
        container.appendChild(editorContainer);

        const options: QuillOptions = {
            theme: "snow",
            placeholder: placeholderRef.current,
            modules: {
                toolbar: [
                    ["bold", "italic", "strike"],
                    ["link"],
                    [{ list: "ordered" }, { list: "bullet" }],
                ],
                keyboard: {
                    bindings: {
                        enter: {
                            key: "Enter",
                            handler: () => {
                                if (showSlashMenuRef.current) {
                                    const tab = activeTabRef.current;
                                    const commands =
                                        tab === "ai" ? AI_COMMANDS : FORMATTING_COMMANDS;
                                    const selected = commands[selectedSlashItemRef.current];
                                    if (selected) {
                                        if (tab === "ai") {
                                            handleAiCommand(
                                                (selected as (typeof AI_COMMANDS)[0]).command
                                            );
                                        } else {
                                            handleFormattingCommand(
                                                selected as (typeof FORMATTING_COMMANDS)[0]
                                            );
                                        }
                                        return false;
                                    }
                                }
                                const text = quill.getText();
                                const addedImage =
                                    imageElementRef.current?.files?.[0] || null;
                                const addedFile =
                                    fileElementRef.current?.files?.[0] || null;
                                const isEmpty =
                                    !addedImage &&
                                    !addedFile &&
                                    text.replace(/<(.|\n)*?>/g, "").trim().length === 0;
                                if (isEmpty) return;
                                const body = JSON.stringify(quill.getContents());
                                submitRef.current?.({
                                    body,
                                    image: addedImage,
                                    file: addedFile,
                                });
                            },
                        },
                        shift_enter: {
                            key: "Enter",
                            shiftKey: true,
                            handler: () => {
                                quill.insertText(quill.getSelection()?.index || 0, "\n");
                            },
                        },
                        arrow_up: {
                            key: 38,
                            handler: () => {
                                if (showSlashMenuRef.current) {
                                    setSelectedSlashItem((prev) => {
                                        const next = Math.max(0, prev - 1);
                                        selectedSlashItemRef.current = next;
                                        return next;
                                    });
                                    return false;
                                }
                                return true;
                            },
                        },
                        arrow_down: {
                            key: 40,
                            handler: () => {
                                if (showSlashMenuRef.current) {
                                    const tab = activeTabRef.current;
                                    const max =
                                        tab === "ai"
                                            ? AI_COMMANDS.length - 1
                                            : FORMATTING_COMMANDS.length - 1;
                                    setSelectedSlashItem((prev) => {
                                        const next = Math.min(max, prev + 1);
                                        selectedSlashItemRef.current = next;
                                        return next;
                                    });
                                    return false;
                                }
                                return true;
                            },
                        },
                        escape: {
                            key: 27,
                            handler: () => {
                                if (showSlashMenuRef.current) {
                                    setShowSlashMenu(false);
                                    showSlashMenuRef.current = false;
                                    return false;
                                }
                                return true;
                            },
                        },
                    },
                },
            },
        };

        const quill = new Quill(editorContainer, options);
        quilRef.current = quill;
        quilRef.current.focus();

        if (innerRef) innerRef.current = quill;

        quill.setContents(defaultValueRef.current);
        setText(quill.getText());

        quill.on(Quill.events.TEXT_CHANGE, () => {
            const fullText = quill.getText();
            setText(fullText);

            const selection = quill.getSelection();
            if (!selection) return;

            const cursorIndex = selection.index;
            const textBeforeCursor = quill.getText(0, cursorIndex);
            const lastChar = textBeforeCursor[textBeforeCursor.length - 1];

            if (lastChar === "/") {
                slashMenuIndexRef.current = cursorIndex;
                setSlashMenuIndex(cursorIndex);
                setSelectedSlashItem(0);
                selectedSlashItemRef.current = 0;
                setActiveTab("format");
                activeTabRef.current = "format";
                showSlashMenuRef.current = true;
                setShowSlashMenu(true);
            } else if (showSlashMenuRef.current) {
                showSlashMenuRef.current = false;
                setShowSlashMenu(false);
            }
        });

        return () => {
            quill.off(Quill.events.TEXT_CHANGE);
            if (container) container.innerHTML = "";
            if (quilRef.current) quilRef.current = null;
            if (innerRef) innerRef.current = null;
        };
    }, [innerRef]);

    const toggleToolbar = () => {
        setIsToolbarVisible((current) => !current);
        const toolbarElement = containerRef.current?.querySelector(".ql-toolbar");
        if (toolbarElement) toolbarElement.classList.toggle("hidden");
    };

    const isEmpty =
        !image && !file && text.replace(/<(.|\n)*?>/g, "").trim().length === 0;

    const onEmojiSelect = (emoji: any) => {
        const quill = quilRef.current;
        quill?.insertText(quill?.getSelection()?.index || 0, emoji.native);
    };

    return (
        <div className="flex flex-col">
            <input
                type="file"
                accept="image/*"
                ref={imageElementRef}
                onChange={(event) => setImage(event.target.files![0])}
                className="hidden"
            />
            <input
                type="file"
                ref={fileElementRef}
                onChange={(event) => setFile(event.target.files![0])}
                className="hidden"
                accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.zip,.rar,.7z,.mp3,.mp4,.mov,.avi,.json,.xml,.html,.css,.js,.ts,.py,.java,.c,.cpp,.md"
            />

            {/* 👇 outer wrapper with relative for menu positioning */}
            <div ref={wrapperRef} className="relative">
                {/* Slash command menu — outside the overflow-hidden div */}
                {showSlashMenu && (
                    <div className="absolute bottom-full left-0 z-9999 bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden w-72 mb-2">
                        {/* Tabs */}
                        <div className="flex border-b">
                            <button
                                onClick={() => {
                                    setActiveTab("format");
                                    activeTabRef.current = "format";
                                    setSelectedSlashItem(0);
                                }}
                                className={cn(
                                    "flex-1 py-2 text-xs font-semibold transition-colors",
                                    activeTab === "format"
                                        ? "text-[#ff5018] border-b-2 border-[#ff5018] bg-orange-50/50"
                                        : "text-muted-foreground hover:text-foreground"
                                )}
                            >
                                Formatting
                            </button>
                            <button
                                onClick={() => {
                                    setActiveTab("ai");
                                    activeTabRef.current = "ai";
                                    setSelectedSlashItem(0);
                                }}
                                className={cn(
                                    "flex-1 py-2 text-xs font-semibold transition-colors flex items-center justify-center gap-1",
                                    activeTab === "ai"
                                        ? "text-[#ff5018] border-b-2 border-[#ff5018] bg-orange-50/50"
                                        : "text-muted-foreground hover:text-foreground"
                                )}
                            >
                                <Sparkles className="size-3" /> AI
                            </button>
                        </div>

                        {/* Commands */}
                        <div className="max-h-60 overflow-y-auto">
                            {activeTab === "format"
                                ? FORMATTING_COMMANDS.map((cmd, i) => (
                                      <button
                                          key={cmd.label}
                                          onMouseDown={(e) => {
                                              e.preventDefault();
                                              handleFormattingCommand(cmd);
                                          }}
                                          className={cn(
                                              "w-full flex items-center gap-3 px-3 py-2 text-left hover:bg-orange-50 transition-colors",
                                              selectedSlashItem === i && "bg-orange-50"
                                          )}
                                      >
                                          <div
                                              className={cn(
                                                  "size-8 rounded-lg flex items-center justify-center text-xs font-bold shrink-0",
                                                  selectedSlashItem === i
                                                      ? "bg-[#ff5018] text-white"
                                                      : "bg-gray-100 text-gray-600"
                                              )}
                                          >
                                              {cmd.icon}
                                          </div>
                                          <div>
                                              <p className="text-sm font-medium">{cmd.label}</p>
                                              <p className="text-[10px] text-muted-foreground">
                                                  {cmd.description}
                                              </p>
                                          </div>
                                      </button>
                                  ))
                                : AI_COMMANDS.map((cmd, i) => (
                                      <button
                                          key={cmd.label}
                                          onMouseDown={(e) => {
                                              e.preventDefault();
                                              handleAiCommand(cmd.command);
                                          }}
                                          className={cn(
                                              "w-full flex items-center gap-3 px-3 py-2 text-left hover:bg-orange-50 transition-colors",
                                              selectedSlashItem === i && "bg-orange-50"
                                          )}
                                      >
                                          <div
                                              className={cn(
                                                  "size-8 rounded-lg flex items-center justify-center text-sm shrink-0",
                                                  selectedSlashItem === i
                                                      ? "bg-[#ff5018] text-white"
                                                      : "bg-gray-100"
                                              )}
                                          >
                                              {cmd.icon}
                                          </div>
                                          <div>
                                              <p className="text-sm font-medium">{cmd.label}</p>
                                              <p className="text-[10px] text-muted-foreground">
                                                  {cmd.description}
                                              </p>
                                          </div>
                                      </button>
                                  ))}
                        </div>

                        <div className="px-3 py-1.5 bg-gray-50 border-t">
                            <p className="text-[9px] text-muted-foreground">
                                ↑↓ navigate · Enter select · Esc close
                            </p>
                        </div>
                    </div>
                )}

                <div
                    className={cn(
                        "flex flex-col border border-slate-200 rounded focus-within:border-slate-300 focus-within:shadow-sm transition bg-white",
                        disabled && "opacity-50"
                    )}
                >
                    <div ref={containerRef} className="h-full ql-custom" />

                    {/* AI loading overlay */}
                    {isAiLoading && (
                        <div className="absolute inset-0 bg-white/80 flex items-center justify-center z-50 rounded">
                            <div className="flex items-center gap-2">
                                <Loader2 className="size-4 animate-spin text-[#ff5018]" />
                                <span className="text-xs text-muted-foreground font-medium">
                                    AI is writing...
                                </span>
                            </div>
                        </div>
                    )}

                    {/* Image preview */}
                    {!!image && (
                        <div className="p-2">
                            <div className="relative size-15.5 flex items-center justify-center group/image">
                                <Hint label="Remove Image">
                                    <button
                                        onClick={() => {
                                            setImage(null);
                                            imageElementRef.current!.value = "";
                                        }}
                                        className="hidden group-hover/image:flex rounded-full bg-black/70 hover:bg-black absolute -top-2.5 -right-2.5 text-white size-6 z-4 border-2 border-white items-center justify-center"
                                    >
                                        <XIcon className="size-3.5" />
                                    </button>
                                </Hint>
                                <Image
                                    src={URL.createObjectURL(image)}
                                    alt="uploaded"
                                    fill
                                    className="rounded-xl overflow-hidden border object-cover"
                                />
                            </div>
                        </div>
                    )}

                    {/* File preview */}
                    {!!file && (
                        <div className="p-2">
                            <div className="relative flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200 group/file max-w-xs">
                                <Hint label="Remove File">
                                    <button
                                        onClick={() => {
                                            setFile(null);
                                            fileElementRef.current!.value = "";
                                        }}
                                        className="hidden group-hover/file:flex rounded-full bg-black/70 hover:bg-black absolute -top-2 -right-2 text-white size-5 z-4 border-2 border-white items-center justify-center"
                                    >
                                        <XIcon className="size-3" />
                                    </button>
                                </Hint>
                                <div className="size-10 rounded-lg bg-[#ff5018]/10 flex items-center justify-center text-lg shrink-0">
                                    {getFileIcon(file.type)}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium truncate">
                                        {file.name}
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                        {formatFileSize(file.size)}
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="flex px-2 pb-2 z-5">
                        <Hint
                            label={
                                isToolbarVisible ? "Hide formatting" : "Show formatting"
                            }
                        >
                            <Button
                                disabled={disabled}
                                size={"iconSm"}
                                variant={"ghost"}
                                onClick={toggleToolbar}
                            >
                                <PiTextAa className="size-4" />
                            </Button>
                        </Hint>

                        <EmojiPopover onEmojiSelect={onEmojiSelect}>
                            <Button disabled={disabled} size="iconSm" variant="ghost">
                                <Smile className="size-4" />
                            </Button>
                        </EmojiPopover>

                        {variant === "create" && (
                            <Hint label="Image">
                                <Button
                                    disabled={disabled}
                                    size={"iconSm"}
                                    variant={"ghost"}
                                    onClick={() => imageElementRef.current?.click()}
                                >
                                    <ImageIcon className="size-4" />
                                </Button>
                            </Hint>
                        )}

                        {variant === "create" && (
                            <Hint label="Attach File">
                                <Button
                                    disabled={disabled}
                                    size={"iconSm"}
                                    variant={"ghost"}
                                    onClick={() => fileElementRef.current?.click()}
                                >
                                    <FileText className="size-4" />
                                </Button>
                            </Hint>
                        )}

                        {variant === "create" && (
                            <Hint label="AI Commands (type /)">
                                <Button
                                    disabled={disabled}
                                    size={"iconSm"}
                                    variant={"ghost"}
                                    onClick={() => {
                                        const quill = quilRef.current;
                                        if (!quill) return;
                                        const index = quill.getLength();
                                        quill.insertText(index - 1, "/");
                                        quill.setSelection(index, 0);
                                        slashMenuIndexRef.current = index;
                                        setSlashMenuIndex(index);
                                        setSelectedSlashItem(0);
                                        selectedSlashItemRef.current = 0;
                                        setActiveTab("ai");
                                        activeTabRef.current = "ai";
                                        showSlashMenuRef.current = true;
                                        setShowSlashMenu(true);
                                    }}
                                >
                                    <Sparkles className="size-4" />
                                </Button>
                            </Hint>
                        )}

                        {variant === "update" && (
                            <div className="ml-auto flex items-center gap-x-2">
                                <Button
                                    variant={"outline"}
                                    size={"sm"}
                                    onClick={onCancel}
                                    disabled={disabled}
                                >
                                    Cancel
                                </Button>
                                <Button
                                    className="bg-[#ff5018]/50 hover:bg-[#ff5018] text-white"
                                    disabled={disabled || isEmpty}
                                    onClick={() =>
                                        onSubmit({
                                            body: JSON.stringify(quilRef.current?.getContents()),
                                            image,
                                            file,
                                        })
                                    }
                                    size="sm"
                                >
                                    Save
                                </Button>
                            </div>
                        )}

                        {variant === "create" && (
                            <Button
                                onClick={() =>
                                    onSubmit({
                                        body: JSON.stringify(quilRef.current?.getContents()),
                                        image,
                                        file,
                                    })
                                }
                                disabled={disabled || isEmpty}
                                size={"iconSm"}
                                className={cn(
                                    "ml-auto",
                                    isEmpty
                                        ? "bg-white hover:bg-white text-muted-foreground"
                                        : "bg-[#ff5018]/50 hover:bg-[#ff5018] text-white cursor-pointer"
                                )}
                            >
                                <MdSend className="size-4" />
                            </Button>
                        )}
                    </div>
                </div>
            </div>

            {variant === "create" && (
                <div
                    className={cn(
                        "p-2 text-[10px] text-muted-foreground flex justify-end opacity-0 transition",
                        !isEmpty && "opacity-100"
                    )}
                >
                    <p>
                        <strong>Shift + Return</strong> to add a new line
                    </p>
                </div>
            )}
        </div>
    );
};

export default Editor;