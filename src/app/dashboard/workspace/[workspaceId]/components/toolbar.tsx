import Image from "next/image"
import { Button } from "@/components/ui/button"
import { useGetWorkspace } from "@/features/workspaces/api/use-get-workspace"
import { useWorkspaceId } from "@/hooks/use-workspace-id"
import { Info, Search } from "lucide-react"

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
import { VisuallyHidden } from "radix-ui"
import { DialogTitle } from "@/components/ui/dialog"

export const Toolbar = () => {
  const router = useRouter()
  const workspaceId = useWorkspaceId()
  const { data } = useGetWorkspace({ id: workspaceId })

  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState("")

  const { data: channels } = useGetChannels({ workspaceId })
  const { data: members } = useGetMembers({ workspaceId })
  const { data: messageResults } = useSearchMessages({ workspaceId, query })

  const onChannelClick = (channelId: string) => {
    setOpen(false)
    router.push(`/dashboard/workspace/${workspaceId}/channel/${channelId}`)
  }

  const onMemberClick = (memberId: string) => {
    setOpen(false)
    router.push(`/dashboard/workspace/${workspaceId}/member/${memberId}`)
  }

  const onMessageClick = (channelId?: string, conversationId?: string) => {
    setOpen(false)
    if (channelId) {
      router.push(`/dashboard/workspace/${workspaceId}/channel/${channelId}`)
    } else if (conversationId) {
      router.push(`/dashboard/workspace/${workspaceId}/member/${conversationId}`)
    }
  }

  return (
    <nav className="bg-[#381d2a] flex items-center h-10 px-2">
      {/* LEFT: Logo */}
      <div className="flex-1 flex items-center">
        <Image
          src="/logo.png"
          alt="Logo"
          width={45}
          height={45}
          className="ml-2 mt-1 object-contain"
        />
      </div>

      {/* CENTER: Search */}
      <div className="min-w-70 max-w-160.5 grow-2 shrink">
        <Button
          onClick={() => setOpen(true)}
          className="bg-accent/25 hover:bg-accent/25 w-full justify-start h-7 px-2"
          size="sm"
        >
          <Search className="mr-2 size-4 text-white" />
          <span className="text-white text-xs">
            Search {data?.name}
          </span>
        </Button>

        <CommandDialog   open={open} onOpenChange={setOpen}>
          <CommandInput 
            placeholder="Search messages, channels, members..."
            onValueChange={setQuery}
          />
          <CommandList>
            <CommandEmpty>No results found.</CommandEmpty>

            <CommandGroup heading="Channels">
              {channels?.map((channel) => (
                <CommandItem
                  key={channel._id}
                  onSelect={() => onChannelClick(channel._id)}
                >
                  # {channel.name}
                </CommandItem>
              ))}
            </CommandGroup>

            <CommandSeparator />

            <CommandGroup heading="Members">
              {members?.map((member) => (
                <CommandItem
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
                <CommandGroup heading="Messages">
                  {messageResults.map((message) => (
                    <CommandItem
                      key={message._id}
                      onSelect={() => onMessageClick(message.channelId, message.conversationId)}
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

      {/* RIGHT: Info */}
      <div className="flex-1 flex items-center justify-end">
        <Button variant="trasnparent">
          <Info className="size-5 text-white" />
        </Button>
      </div>
    </nav>
  )
}