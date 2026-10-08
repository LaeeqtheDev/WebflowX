import { Node, mergeAttributes } from "@tiptap/core"

declare module "@tiptap/core" {
    interface Commands<ReturnType> {
        callout: {
            toggleCallout: (tone?: CalloutTone) => ReturnType
        }
    }
}

export type CalloutTone = "note" | "tip" | "warn"

// A highlighted block for key takeaways, warnings and tips. Content is ordinary blocks, so it works with Yjs unchanged.
export const Callout = Node.create({
    name: "callout",
    group: "block",
    content: "block+",
    defining: true,
    addAttributes() {
        return {
            tone: {
                default: "note",
                parseHTML: (el) => el.getAttribute("data-tone") ?? "note",
                renderHTML: (attrs) => ({ "data-tone": attrs.tone }),
            },
        }
    },
    parseHTML() {
        return [{ tag: 'div[data-type="callout"]' }]
    },
    renderHTML({ HTMLAttributes }) {
        return ["div", mergeAttributes(HTMLAttributes, { "data-type": "callout" }), 0]
    },
    addCommands() {
        return {
            toggleCallout:
                (tone = "note") =>
                ({ commands, editor }) =>
                    editor.isActive("callout") ? commands.lift("callout") : commands.wrapIn("callout", { tone }),
        }
    },
})
