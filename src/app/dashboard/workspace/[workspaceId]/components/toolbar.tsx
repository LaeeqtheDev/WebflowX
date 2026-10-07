import Image from "next/image"
import { useGetWorkspace } from "@/features/workspaces/api/use-get-workspace"
import { useWorkspaceId } from "@/hooks/use-workspace-id"
import { Info, Menu, Search } from "lucide-react"

import {
    Command,
    CommandDialog,
    CommandSeparator,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList
} from "@/components/ui/command"
import { useState } from "react"
import { useGetChannels } from "@/features/channels/api/use-get-channels"
import { useGetMembers } from "@/features/members/api/use-get-members"
import { useRouter } from "next/navigation"
import { useSearchMessages } from "@/features/messages/api/use-search-messages"
import { quillToText } from "@/features/messages/lib/quill-to-text"
import { messageLink } from "@/features/messages/lib/message-link"
import { useGetConversations } from "@/features/conversations/api/use-get-conversations"
import { VisuallyHidden } from "radix-ui"
import { DialogTitle } from "@/components/ui/dialog"

export const Toolbar = ({ onOpenMenu }: { onOpenMenu?: () => void }) => {
  const router = useRouter()
  const workspaceId = useWorkspaceId()
  const { data } = useGetWorkspace({ id: workspaceId })

  const [open, setOpen] = useState(false)
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
    <nav className="relative z-10 flex h-14 shrink-0 items-center gap-1 border-b border-white/[0.07] bg-[#2a1420] px-2 md:gap-0 md:px-4">
      {/* LEFT: Menu (phones) + Logo */}
      <div className="flex items-center gap-1 max-md:shrink-0 md:flex-1">
        {onOpenMenu && (
          <button
            type="button"
            onClick={onOpenMenu}
            aria-label="Open navigation menu"
            className="flex size-10 items-center justify-center rounded-xl text-white/80 transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ff5018]/70 active:scale-95 md:hidden"
          >
            <Menu className="size-5" />
          </button>
        )}
        <Image
          src="/logo.png"
          alt="WebflowX"
          width={34}
          height={34}
          priority
          className="h-[34px] w-[34px] object-contain"
        />
      </div>

      {/* CENTER: Search */}
      <div className="min-w-70 max-w-160.5 grow-2 shrink max-md:min-w-0 max-md:flex-1">
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Search workspace"
          className="group flex h-10 md:h-9 w-full items-center gap-2.5 rounded-xl border border-white/10 bg-white/[0.07] px-3.5 text-left transition-all hover:border-white/20 hover:bg-white/[0.11] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ff5018]/70"
        >
          <Search className="size-4 shrink-0 text-white/60 transition-colors group-hover:text-white" />
          <span className="truncate text-[13px] font-medium tracking-tight text-white/60 group-hover:text-white/80">
            Search {data?.name}
          </span>
        </button>

        <CommandDialog   open={open} onOpenChange={setOpen}>
          <CommandInput
            className="text-sm"
            placeholder="Search messages, channels, members..."
            onValueChange={setQuery}
          />
          <CommandList>
            <CommandEmpty>No results found.</CommandEmpty>

            <CommandGroup heading="Channels" className="[&_[cmdk-group-heading]]:text-ink/50 [&_[cmdk-group-heading]]:font-semibold">
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

            <CommandGroup heading="Members" className="[&_[cmdk-group-heading]]:text-ink/50 [&_[cmdk-group-heading]]:font-semibold">
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
                <CommandGroup heading="Messages" className="[&_[cmdk-group-heading]]:text-ink/50 [&_[cmdk-group-heading]]:font-semibold">
                  {messageResults.map((message) => (
                    <CommandItem
                      className="rounded-lg data-[selected=true]:bg-cream data-[selected=true]:text-ink"
                      key={message._id}
                      onSelect={() => onMessageClick(message)}
                    >
                      {quillToText(message.body)}
                    </CommandItem>
                  ))}
                </CommandGroup>
              </>
            )}
          </CommandList>
        </CommandDialog>
      </div>

      {/* RIGHT: Help */}
      <div className="flex items-center justify-end max-md:shrink-0 md:flex-1">
        <a
          href="mailto:support@northfoundry.co"
          aria-label="Help and support: support@northfoundry.co"
          title="Help & support · support@northfoundry.co"
          className="flex size-10 md:size-9 items-center justify-center rounded-xl text-white/70 transition-all hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ff5018]/70 active:scale-95"
        >
          <Info className="size-5" />
        </a>
      </div>
    </nav>
  )
}