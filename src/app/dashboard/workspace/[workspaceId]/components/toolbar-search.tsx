"use client"
// The workspace search box (messages, channels, members). Loaded the first time the search button is used, together
// with the command-palette library behind it, instead of with every page.
import { useRouter } from "next/navigation"
import { useState } from "react"
import { useWorkspaceId } from "@/hooks/use-workspace-id"
import {
    CommandDialog,
    CommandSeparator,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList
} from "@/components/ui/command"
import { useGetChannels } from "@/features/channels/api/use-get-channels"
import { useGetMembers } from "@/features/members/api/use-get-members"
import { useSearchMessages } from "@/features/messages/api/use-search-messages"
import { quillToText } from "@/features/messages/lib/quill-to-text"
import { messageLink } from "@/features/messages/lib/message-link"
import { useGetConversations } from "@/features/conversations/api/use-get-conversations"

export const ToolbarSearch = ({ open, setOpen }: { open: boolean; setOpen: (o: boolean) => void }) => {
  const router = useRouter()
  const workspaceId = useWorkspaceId()
  const [query, setQuery] = useState("")

  const { data: channels } = useGetChannels({ workspaceId })
  const { data: members } = useGetMembers({ workspaceId })
  const { data: messageResults } = useSearchMessages({ workspaceId, query })
  const { data: conversations } = useGetConversations({ workspaceId })

  const onChannelClick = (channelId: string) => {
    setOpen(false)
    router.push(`/dashboard/workspace/${workspaceId}/channel/${channelId}`)
  }

  const onMemberClick = (memberId: string) => {
    setOpen(false)
    router.push(`/dashboard/workspace/${workspaceId}/member/${memberId}`)
  }

  const onMessageClick = (message: {
    _id: string
    channelId?: string
    conversationId?: string
    parentMessagesId?: string
  }) => {
    setOpen(false)
    // DM results carry a conversation id; the route needs the other member's id
    const memberId = message.conversationId
      ? conversations?.find((c) => c._id === message.conversationId)?.otherMember?._id
      : undefined
    if (!message.channelId && !memberId) return

    router.push(
      messageLink({
        workspaceId,
        channelId: message.channelId,
        memberId,
        messageId: message._id,
        parentMessageId: message.parentMessagesId,
      })
    )
  }

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
          <CommandInput
            className="text-sm"
            placeholder="Search messages, channels, members..."
            onValueChange={setQuery}
          />
          <CommandList>
            <CommandEmpty>No results found.</CommandEmpty>

            <CommandGroup heading="Channels" className="[&_[cmdk-group-heading]]:text-ink/60 [&_[cmdk-group-heading]]:font-semibold">
              {channels?.map((channel) => (
                <CommandItem
                  className="rounded-lg data-[selected=true]:bg-cream data-[selected=true]:text-ink"
                  key={channel._id}
                  onSelect={() => onChannelClick(channel._id)}
                >
                  # {channel.name}
                </CommandItem>
              ))}
            </CommandGroup>

            <CommandSeparator />

            <CommandGroup heading="Members" className="[&_[cmdk-group-heading]]:text-ink/60 [&_[cmdk-group-heading]]:font-semibold">
              {members?.map((member) => (
                <CommandItem
                  className="rounded-lg data-[selected=true]:bg-cream data-[selected=true]:text-ink"
                  key={member._id}
                  onSelect={() => onMemberClick(member._id)}
                >
                  {member.user.name}
                </CommandItem>
              ))}
            </CommandGroup>

            {messageResults && messageResults.length > 0 && (
              <>
                <CommandSeparator />
                <CommandGroup heading="Messages" className="[&_[cmdk-group-heading]]:text-ink/60 [&_[cmdk-group-heading]]:font-semibold">
                  {messageResults.map((message) => (
                    <CommandItem
                      className="rounded-lg data-[selected=true]:bg-cream data-[selected=true]:text-ink"
                      key={message._id}
                      onSelect={() => onMessageClick(message)}
                    >
                      <span className="truncate"><span className="font-semibold">{message.authorName}:</span> {quillToText(message.body)}</span>
                    </CommandItem>
                  ))}
                </CommandGroup>
              </>
            )}
          </CommandList>
        </CommandDialog>
  )
}
