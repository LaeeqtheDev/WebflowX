import Mention from "@tiptap/extension-mention"
import type { SuggestionKeyDownProps, SuggestionProps } from "@tiptap/suggestion"

export type MentionPerson = { id: string; label: string }

// "@name" in a doc: a small list under the caret, arrow keys + Enter to pick. Picking someone calls `onMention`
// (the page notifies them). People come from `getPeople` so the list stays current without rebuilding the editor.
export const makeMention = (getPeople: () => MentionPerson[], onMention: (id: string) => void) =>
    Mention.configure({
        HTMLAttributes: { class: "doc-mention" },
        renderText: ({ node }) => `@${node.attrs.label ?? node.attrs.id}`,
        suggestion: {
            char: "@",
            items: ({ query }) => {
                const q = query.toLowerCase()
                return getPeople().filter((p) => p.label.toLowerCase().includes(q)).slice(0, 6)
            },
            command: ({ editor, range, props }) => {
                const p = props as MentionPerson
                editor.chain().focus().insertContentAt(range, [
                    { type: "mention", attrs: { id: p.id, label: p.label } },
                    { type: "text", text: " " },
                ]).run()
                onMention(p.id)
            },
            render: () => {
                let el: HTMLDivElement | null = null
                let items: MentionPerson[] = []
                let active = 0
                let pick: ((p: MentionPerson) => void) | null = null
                const draw = () => {
                    if (!el) return
                    el.replaceChildren()
                    if (items.length === 0) {
                        const none = document.createElement("div")
                        none.className = "doc-mention-empty"
                        none.textContent = "No one matches"
                        el.append(none)
                        return
                    }
                    items.forEach((p, i) => {
                        const b = document.createElement("button")
                        b.type = "button"
                        b.className = `doc-mention-item${i === active ? " is-active" : ""}`
                        b.textContent = p.label
                        b.onmousedown = (e) => { e.preventDefault(); pick?.(p) }
                        el!.append(b)
                    })
                }
                const place = (props: SuggestionProps) => {
                    const r = props.clientRect?.()
                    if (!el || !r) return
                    el.style.left = `${Math.min(r.left, window.innerWidth - 240)}px`
                    el.style.top = `${r.bottom + 6}px`
                }
                return {
                    onStart: (props: SuggestionProps) => {
                        el = document.createElement("div")
                        el.className = "doc-mention-menu"
                        el.setAttribute("role", "listbox")
                        document.body.append(el)
                        items = props.items as MentionPerson[]; active = 0
                        pick = (p) => props.command(p)
                        draw(); place(props)
                    },
                    onUpdate: (props: SuggestionProps) => {
                        items = props.items as MentionPerson[]; active = 0
                        pick = (p) => props.command(p)
                        draw(); place(props)
                    },
                    onKeyDown: ({ event }: SuggestionKeyDownProps) => {
                        if (event.key === "Escape") { el?.remove(); el = null; return true }
                        if (!items.length) return false
                        if (event.key === "ArrowDown") { active = (active + 1) % items.length; draw(); return true }
                        if (event.key === "ArrowUp") { active = (active - 1 + items.length) % items.length; draw(); return true }
                        if (event.key === "Enter" || event.key === "Tab") { pick?.(items[active]); return true }
                        return false
                    },
                    onExit: () => { el?.remove(); el = null },
                }
            },
        },
    })
