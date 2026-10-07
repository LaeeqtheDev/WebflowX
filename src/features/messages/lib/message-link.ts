// Builds a URL that opens a channel / DM and jumps to a specific message
// (scrolls to it, highlights it, and opens the thread panel for thread replies).
type MessageLinkArgs = {
    workspaceId: string
    channelId?: string
    memberId?: string // the other person in a DM
    messageId?: string
    parentMessageId?: string // set when messageId is a reply inside a thread
    openThread?: boolean // open the thread panel for messageId itself
}

export const messageLink = ({
    workspaceId,
    channelId,
    memberId,
    messageId,
    parentMessageId,
    openThread,
}: MessageLinkArgs) => {
    const base = channelId
        ? `/dashboard/workspace/${workspaceId}/channel/${channelId}`
        : `/dashboard/workspace/${workspaceId}/member/${memberId}`

    const params = new URLSearchParams()
    if (parentMessageId) {
        params.set("parentMessageId", parentMessageId)
        params.set("message", parentMessageId)
        if (messageId) params.set("reply", messageId)
    } else if (messageId) {
        params.set("message", messageId)
        if (openThread) params.set("parentMessageId", messageId)
    }

    const qs = params.toString()
    return qs ? `${base}?${qs}` : base
}
