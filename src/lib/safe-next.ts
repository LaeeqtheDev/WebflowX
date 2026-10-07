// Only follow in-site relative paths after sign-in. Rejects "//evil.com", "/\evil.com",
// absolute URLs and anything with control characters (browsers treat "\" like "/").
export function safeNext(next: string | null | undefined): string | undefined {
    if (!next || next.length > 2000) return undefined
    if (!next.startsWith("/") || next.startsWith("//")) return undefined
    // eslint-disable-next-line no-control-regex
    if (/[\\\u0000-\u001f\u007f]/.test(next)) return undefined
    try {
        const base = "http://internal.invalid"
        const url = new URL(next, base)
        if (url.origin !== base) return undefined
    } catch {
        return undefined
    }
    return next
}
