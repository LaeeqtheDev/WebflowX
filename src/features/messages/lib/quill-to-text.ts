// src/lib/quill-to-text.ts
export const quillToText = (body: string): string => {
    try {
        const parsed = JSON.parse(body)
        if (parsed?.ops) {
            return parsed.ops
                .map((op: { insert?: string }) => 
                    typeof op.insert === "string" ? op.insert : ""
                )
                .join("")
                .trim()
        }
        return body
    } catch {
        return body
    }
}