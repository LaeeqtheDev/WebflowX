import Quill from "quill"

// Inline format that marks "@Name" text with the member's id.
// It is stored as a normal text op with attributes.mention = memberId, so anything that only reads
// the text of a message (previews, search) still shows "@Name".
const Inline = Quill.import("blots/inline") as typeof import("quill/blots/inline").default

class MentionBlot extends Inline {
    static blotName = "mention"
    static tagName = "span"
    static className = "mention"

    static create(value: string) {
        const node = super.create() as HTMLElement
        node.setAttribute("data-member-id", String(value))
        return node
    }

    static formats(node: HTMLElement) {
        return node.getAttribute("data-member-id")
    }
}

let registered = false
if (!registered) {
    Quill.register(MentionBlot, true)
    registered = true
}

export default MentionBlot
