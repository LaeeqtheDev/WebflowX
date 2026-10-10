"use client";

import "quill/dist/quill.snow.css";
import {
    useEffect,
    useLayoutEffect,
    useRef,
    useState,
} from "react";
import Quill, { type QuillOptions } from "quill";
import { loadDraft, saveDraft, type DraftOps } from "@/lib/network";
import "./mention-blot";
import { usePermissions } from "@/hooks/use-permissions";
import { useWorkspaceId } from "@/hooks/use-workspace-id";
import { useGetMembers } from "@/features/members/api/use-get-members";
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
    AtSign,
    BookOpenText,
} from "lucide-react";
import { MdSend } from "react-icons/md";
import { Hint } from "./hints";
import { cn } from "@/lib/utils";
import { EmojiPopover } from "./emoji-popover";
import { SharePagePicker } from "./share-page-picker";
import Image from "next/image";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

import {
    AI_COMMANDS,
    FORMATTING_COMMANDS,
    formatFileSize,
    type EditorProps,
    type MentionMember,
} from "./editor-config";

const Editor = ({
    onCancel,
    onSubmit,
    placeholder = "Write Something...",
    defaultValue = [],
    disabled = false,
    innerRef,
    variant = "create",
    allowEveryone = false,
    onTyping,
    draftKey,
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

    // @mentions
    const workspaceId = useWorkspaceId();
    const { data: members } = useGetMembers({ workspaceId });
    const perms = usePermissions();
    const canPingEveryone = allowEveryone && perms.can("mentionEveryone");
    const [mention, setMention] = useState<{ query: string; start: number } | null>(null);
    const [mentionSel, setMentionSel] = useState(0);
    const mentionRef = useRef<{ query: string; start: number } | null>(null);
    const mentionSelRef = useRef(0);
    const matchesRef = useRef<MentionMember[]>([]);
    const mentionListRef = useRef<HTMLDivElement>(null);

    const mentionMatches: MentionMember[] = (() => {
        if (!mention) return [];
        const q = mention.query.toLowerCase();
        const specials: MentionMember[] = canPingEveryone
            ? ([
                  { _id: "everyone", special: "Notify everyone in this channel", user: { name: "everyone" } },
                  { _id: "everyone", special: "Same as @everyone", user: { name: "channel" } },
              ] as MentionMember[]).filter((m) => (m.user?.name ?? "").startsWith(q))
            : [];
        const people = (members ?? [])
            .filter((m) => (m.user?.name ?? "").toLowerCase().includes(q))
            .sort((a, b) => {
                const an = (a.user?.name ?? "").toLowerCase().startsWith(q) ? 0 : 1;
                const bn = (b.user?.name ?? "").toLowerCase().startsWith(q) ? 0 : 1;
                return an - bn;
            })
            .slice(0, 50) as MentionMember[];
        return [...specials, ...people];
    })();

    // keep the highlighted person in view when arrowing through a long list
    useEffect(() => {
        mentionListRef.current?.querySelector<HTMLElement>('[data-sel="1"]')?.scrollIntoView({ block: "nearest" });
    }, [mentionSel, mention]);

    const containerRef = useRef<HTMLDivElement>(null);
    const submitRef = useRef(onSubmit);
    const typingRef = useRef(onTyping);
    const placeholderRef = useRef(placeholder);
    const quilRef = useRef<Quill | null>(null);
    const defaultValueRef = useRef(defaultValue);
    const draftKeyRef = useRef(draftKey);
    const draftTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
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
        typingRef.current = onTyping;
        placeholderRef.current = placeholder;
        defaultValueRef.current = defaultValue;
        draftKeyRef.current = draftKey;
        disabledRef.current = disabled;
        matchesRef.current = mentionMatches;
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

    // Saves the draft right now and cancels the pending delayed save, so a message that has just been sent
    // can't be written back after it was cleared.
    const flushDraft = () => {
        clearTimeout(draftTimer.current);
        draftTimer.current = undefined;
        const q = quilRef.current;
        const k = draftKeyRef.current;
        if (q && k) saveDraft(k, q.getContents() as { ops?: DraftOps }, q.getText().trim().length === 0);
    };

    const updateMention = (m: { query: string; start: number } | null) => {
        mentionRef.current = m;
        setMention(m);
        if (!m) return;
        if (mentionSelRef.current !== 0) {
            mentionSelRef.current = 0;
            setMentionSel(0);
        }
    };

    // Replaces the typed "@que" with a highlighted "@Name " that carries the member id
    const pickMention = (member: MentionMember) => {
        const quill = quilRef.current;
        const m = mentionRef.current;
        if (!quill || !m) return;
        const cursor = quill.getSelection()?.index ?? m.start + 1 + m.query.length;
        const label = `@${member.user?.name ?? "member"}`;
        quill.deleteText(m.start, cursor - m.start, "user");
        quill.insertText(m.start, label, { mention: member._id }, "user");
        quill.insertText(m.start + label.length, " ", { mention: false }, "user");
        quill.setSelection(m.start + label.length + 1, 0, "user");
        updateMention(null);
        quill.focus();
    };

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
                                if (mentionRef.current && matchesRef.current.length > 0) {
                                    const pick = matchesRef.current[mentionSelRef.current] ?? matchesRef.current[0];
                                    pickMention(pick);
                                    return false;
                                }
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
                                flushDraft();
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
                                if (mentionRef.current && matchesRef.current.length > 0) {
                                    const next = Math.max(0, mentionSelRef.current - 1);
                                    mentionSelRef.current = next;
                                    setMentionSel(next);
                                    return false;
                                }
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
                                if (mentionRef.current && matchesRef.current.length > 0) {
                                    const next = Math.min(matchesRef.current.length - 1, mentionSelRef.current + 1);
                                    mentionSelRef.current = next;
                                    setMentionSel(next);
                                    return false;
                                }
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
                                if (mentionRef.current) {
                                    updateMention(null);
                                    return false;
                                }
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

        // unsent text from before a reload, crash or dropped connection comes back
        const saved = draftKeyRef.current ? loadDraft(draftKeyRef.current) : null;
        quill.setContents((saved ?? defaultValueRef.current) as Parameters<typeof quill.setContents>[0]);
        if (saved) quill.setSelection(quill.getLength(), 0);
        setText(quill.getText());

        quill.on(Quill.events.TEXT_CHANGE, (_delta: unknown, _old: unknown, source: string) => {
            const fullText = quill.getText();
            setText(fullText);
            if (source === "user" && fullText.trim().length > 0) typingRef.current?.();
            if (source === "user" && draftKeyRef.current) {
                const key = draftKeyRef.current;
                clearTimeout(draftTimer.current);
                draftTimer.current = setTimeout(() => { draftTimer.current = undefined; saveDraft(key, quill.getContents() as { ops?: DraftOps }, quill.getText().trim().length === 0); }, 300);
            }

            const selection = quill.getSelection();
            if (!selection) return;

            const cursorIndex = selection.index;
            const textBeforeCursor = quill.getText(0, cursorIndex);
            const lastChar = textBeforeCursor[textBeforeCursor.length - 1];

            // "@" followed by letters (at the start or after a space) opens the member picker
            const mm = /(?:^|\s)@([^\s@]{0,30})$/.exec(textBeforeCursor);
            if (mm) {
                updateMention({ query: mm[1], start: cursorIndex - mm[1].length - 1 });
                if (showSlashMenuRef.current) {
                    showSlashMenuRef.current = false;
                    setShowSlashMenu(false);
                }
                return;
            } else if (mentionRef.current) {
                updateMention(null);
            }

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
            // leaving the box within a third of a second of the last keystroke must not lose it
            if (draftTimer.current !== undefined && draftKeyRef.current) saveDraft(draftKeyRef.current, quill.getContents() as { ops?: DraftOps }, quill.getText().trim().length === 0);
            clearTimeout(draftTimer.current);
            draftTimer.current = undefined;
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

    const onEmojiSelect = (emoji: { native: string }) => {
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
                {/* @mention picker */}
                {mention && mentionMatches.length > 0 && (
                    <div ref={mentionListRef} className="absolute bottom-full left-0 z-9999 mb-2 max-h-72 w-64 overflow-y-auto overscroll-contain rounded-xl border border-plum/12 bg-surface shadow-lg">
                        <p className="sticky top-0 z-10 border-b bg-cream px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wide text-ink/65">
                            People
                        </p>
                        {mentionMatches.map((m, i) => (
                            <button
                                type="button"
                                key={`${m._id}-${i}`}
                                data-sel={mentionSel === i ? "1" : undefined}
                                onMouseDown={(e) => {
                                    e.preventDefault();
                                    pickMention(m);
                                }}
                                className={cn(
                                    "flex w-full items-center gap-2.5 px-3 py-2 text-left transition-colors hover:bg-cream",
                                    mentionSel === i && "bg-cream"
                                )}
                            >
                                <Avatar className="size-7 rounded-md">
                                    <AvatarImage className="rounded-md" src={m.user?.image ?? undefined} />
                                    <AvatarFallback className="rounded-md bg-brand text-xs font-semibold text-white">
                                        {(m.user?.name ?? "?").charAt(0).toUpperCase()}
                                    </AvatarFallback>
                                </Avatar>
                                <span className="truncate text-sm font-medium">{m.user?.name}</span>
                                {m.special && <span className="truncate text-xs text-ink/65">{m.special}</span>}
                            </button>
                        ))}
                    </div>
                )}

                {/* Slash command menu — outside the overflow-hidden div */}
                {showSlashMenu && (
                    <div className="absolute bottom-full left-0 z-9999 bg-surface border border-plum/12 rounded-xl shadow-lg overflow-hidden w-72 mb-2">
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
                                        ? "text-orange-ink border-b-2 border-brand bg-brand/5"
                                        : "text-ink/60 hover:text-ink"
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
                                        ? "text-orange-ink border-b-2 border-brand bg-brand/5"
                                        : "text-ink/60 hover:text-ink"
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
                                              "w-full flex items-center gap-3 px-3 py-2 text-left hover:bg-cream transition-colors",
                                              selectedSlashItem === i && "bg-cream"
                                          )}
                                      >
                                          <div
                                              className={cn(
                                                  "size-8 rounded-lg flex items-center justify-center text-xs font-bold shrink-0",
                                                  selectedSlashItem === i
                                                      ? "bg-brand text-white"
                                                      : "bg-cream text-plum"
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
                                              "w-full flex items-center gap-3 px-3 py-2 text-left hover:bg-cream transition-colors",
                                              selectedSlashItem === i && "bg-cream"
                                          )}
                                      >
                                          <div
                                              className={cn(
                                                  "size-8 rounded-lg flex items-center justify-center text-sm shrink-0",
                                                  selectedSlashItem === i
                                                      ? "bg-brand text-white"
                                                      : "bg-cream"
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

                        <div className="px-3 py-1.5 bg-cream border-t">
                            <p className="text-[9px] text-muted-foreground">
                                ↑↓ navigate · Enter select · Esc close
                            </p>
                        </div>
                    </div>
                )}

                <div
                    className={cn(
                        "flex flex-col rounded-2xl border border-transparent bg-surface shadow-[0_0_0_1px_rgba(56,29,42,0.12),0_10px_30px_-18px_rgba(56,29,42,0.35)] transition-shadow focus-within:shadow-[0_0_0_1px_rgba(56,29,42,0.28),0_14px_34px_-16px_rgba(56,29,42,0.45)] dark:shadow-[0_0_0_1px_rgba(255,255,255,0.12),0_10px_30px_-18px_rgba(0,0,0,0.6)] dark:focus-within:shadow-[0_0_0_1px_rgba(255,255,255,0.3),0_14px_34px_-16px_rgba(0,0,0,0.7)]",
                        disabled && "opacity-50"
                    )}
                >
                    <div ref={containerRef} className="h-full ql-custom" />

                    {/* AI loading overlay */}
                    {isAiLoading && (
                        <div className="absolute inset-0 bg-white/80 dark:bg-cream/80 flex items-center justify-center z-50 rounded">
                            <div className="flex items-center gap-2">
                                <Loader2 className="size-4 animate-spin text-brand" />
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
                                        type="button"
                                        aria-label="Remove image"
                                        className="flex opacity-0 group-hover/image:opacity-100 focus-visible:opacity-100 rounded-full bg-rail/80 hover:bg-rail dark:bg-avatar dark:hover:bg-sidebar absolute -top-2.5 -right-2.5 text-white size-6 z-4 border-2 border-white dark:border-surface items-center justify-center"
                                    >
                                        <XIcon className="size-3.5" aria-hidden="true" />
                                    </button>
                                </Hint>
                                <Image
                                    src={URL.createObjectURL(image)}
                                    alt="Selected image to upload"
                                    fill
                                    className="rounded-xl overflow-hidden border border-plum/12 object-cover"
                                />
                            </div>
                        </div>
                    )}

                    {/* File preview */}
                    {!!file && (
                        <div className="p-2">
                            <div className="relative flex items-center gap-3 p-3 bg-cream rounded-xl border border-plum/12 group/file max-w-xs">
                                <Hint label="Remove File">
                                    <button
                                        onClick={() => {
                                            setFile(null);
                                            fileElementRef.current!.value = "";
                                        }}
                                        type="button"
                                        aria-label="Remove file"
                                        className="flex opacity-0 group-hover/file:opacity-100 focus-visible:opacity-100 rounded-full bg-rail/80 hover:bg-rail dark:bg-avatar dark:hover:bg-sidebar absolute -top-2 -right-2 text-white size-5 z-4 border-2 border-white dark:border-surface items-center justify-center"
                                    >
                                        <XIcon className="size-3" aria-hidden="true" />
                                    </button>
                                </Hint>
                                <div className="size-10 rounded-lg bg-brand/10 flex items-center justify-center shrink-0">
                                    <FileText className="size-5 text-brand" />
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
                                aria-label={isToolbarVisible ? "Hide formatting" : "Show formatting"}
                                onClick={toggleToolbar}
                            >
                                <PiTextAa className="size-4" />
                            </Button>
                        </Hint>

                        <Hint label="Mention someone (@)">
                            <Button
                                disabled={disabled}
                                size="iconSm"
                                variant="ghost"
                                aria-label="Mention someone"
                                onMouseDown={(e) => e.preventDefault()}
                                onClick={() => {
                                    const quill = quilRef.current;
                                    if (!quill) return;
                                    quill.focus();
                                    const index = quill.getSelection()?.index ?? quill.getLength() - 1;
                                    const before = index > 0 ? quill.getText(index - 1, 1) : " ";
                                    const prefix = /\s/.test(before) || index === 0 ? "" : " ";
                                    quill.insertText(index, `${prefix}@`, "user");
                                    quill.setSelection(index + prefix.length + 1, 0, "user");
                                    updateMention({ query: "", start: index + prefix.length });
                                }}
                            >
                                <AtSign className="size-4" />
                            </Button>
                        </Hint>

                        <EmojiPopover onEmojiSelect={onEmojiSelect}>
                            <Button disabled={disabled} size="iconSm" variant="ghost" aria-label="Add emoji">
                                <Smile className="size-4" />
                            </Button>
                        </EmojiPopover>

                        {variant === "create" && (
                            <Hint label="Image">
                                <Button
                                    disabled={disabled}
                                    size={"iconSm"}
                                    variant={"ghost"}
                                    aria-label="Attach image"
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
                                    aria-label="Attach file"
                                    onClick={() => fileElementRef.current?.click()}
                                >
                                    <FileText className="size-4" />
                                </Button>
                            </Hint>
                        )}

                        {variant === "create" && (
                            <SharePagePicker
                                onPick={(page) => {
                                    const quill = quilRef.current;
                                    if (!quill) return;
                                    quill.focus();
                                    const index = quill.getSelection()?.index ?? quill.getLength() - 1;
                                    quill.insertText(index, page.title, { link: page.url }, "user");
                                    quill.insertText(index + page.title.length, " ", { link: false }, "user");
                                    quill.setSelection(index + page.title.length + 1, 0, "user");
                                }}
                            >
                                <Button disabled={disabled} size="iconSm" variant="ghost" aria-label="Share a page">
                                    <BookOpenText className="size-4" />
                                </Button>
                            </SharePagePicker>
                        )}

                        {variant === "create" && (
                            <Hint label="AI Commands (type /)">
                                <Button
                                    disabled={disabled}
                                    size={"iconSm"}
                                    variant={"ghost"}
                                    aria-label="Open AI commands"
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
                                    className="bg-brand hover:bg-brand-hover text-white"
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
                                onClick={() => {
                                    flushDraft();
                                    onSubmit({
                                        body: JSON.stringify(quilRef.current?.getContents()),
                                        image,
                                        file,
                                    });
                                }}
                                disabled={disabled || isEmpty}
                                size={"iconSm"}
                                aria-label="Send message"
                                className={cn(
                                    "ml-auto rounded-lg",
                                    isEmpty
                                        ? "bg-cream hover:bg-cream text-ink/40"
                                        : "bg-brand hover:bg-brand-hover text-white cursor-pointer"
                                )}
                            >
                                <MdSend className="size-4" aria-hidden="true" />
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